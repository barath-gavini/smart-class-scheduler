import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_absences",
  title: "List faculty absences",
  description: "List recorded faculty absences with substitute assignment and processing status.",
  inputSchema: {
    from_date: z.string().optional().describe("Only absences on or after this date (YYYY-MM-DD)."),
    to_date: z.string().optional().describe("Only absences on or before this date (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from_date, to_date }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("faculty_absences")
      .select(
        "id, absence_date, reason, is_processed, faculty:faculty_id(name, email), substitute:substitute_faculty_id(name, email)",
      )
      .order("absence_date", { ascending: false })
      .limit(100);

    if (from_date) query = query.gte("absence_date", from_date);
    if (to_date) query = query.lte("absence_date", to_date);

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { absences: data ?? [] },
    };
  },
});
