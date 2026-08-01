import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classrooms",
  title: "List classrooms",
  description: "List classrooms with capacity, building and facilities. Optionally filter by availability and minimum capacity.",
  inputSchema: {
    only_available: z.boolean().optional().describe("Return only classrooms marked available."),
    min_capacity: z.number().int().min(1).optional().describe("Minimum seating capacity."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_available, min_capacity }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("classrooms")
      .select("id, name, building, capacity, has_ac, has_projector, is_available")
      .order("building")
      .order("name");

    if (only_available) query = query.eq("is_available", true);
    if (typeof min_capacity === "number") query = query.gte("capacity", min_capacity);

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { classrooms: data ?? [] },
    };
  },
});
