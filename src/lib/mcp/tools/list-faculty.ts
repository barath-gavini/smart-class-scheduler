import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_faculty",
  title: "List faculty",
  description: "List faculty members with department, designation, specialization and availability.",
  inputSchema: {
    search: z.string().optional().describe("Filter by name or email substring."),
    only_available: z.boolean().optional().describe("Return only faculty marked available."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, only_available }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("faculty")
      .select("id, name, email, designation, specialization, is_available, department:department_id(code, name)")
      .order("name");

    if (only_available) query = query.eq("is_available", true);
    if (search?.trim()) query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { faculty: data ?? [] },
    };
  },
});
