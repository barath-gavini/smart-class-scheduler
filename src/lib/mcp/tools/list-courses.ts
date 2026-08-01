import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_courses",
  title: "List courses and sections",
  description: "List courses with department, credits, semester and their sections.",
  inputSchema: {
    semester: z.number().int().min(1).max(12).optional().describe("Filter by semester number."),
    search: z.string().optional().describe("Filter by course code or name substring."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ semester, search }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("courses")
      .select(
        "id, code, name, credits, semester, department:department_id(code, name), sections(id, name, max_students, faculty:faculty_id(name))",
      )
      .order("code");

    if (typeof semester === "number") query = query.eq("semester", semester);
    if (search?.trim()) query = query.or(`code.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
