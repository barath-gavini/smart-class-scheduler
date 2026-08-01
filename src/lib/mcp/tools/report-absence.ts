import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "report_absence",
  title: "Report an absence",
  description:
    "Record an absence for the signed-in faculty member on a given date so the scheduler can reallocate their classes.",
  inputSchema: {
    absence_date: z.string().describe("Date of the absence in YYYY-MM-DD format."),
    reason: z.string().optional().describe("Short reason for the absence."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ absence_date, reason }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(absence_date)) throw new ToolError("absence_date must be YYYY-MM-DD");

    const supabase = supabaseForUser(ctx);

    const { data: faculty, error: facultyError } = await supabase
      .from("faculty")
      .select("id, name")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (facultyError) throw new ToolError(facultyError.message);
    if (!faculty) throw new ToolError("No faculty record is linked to your account, so an absence cannot be reported.");

    const { data, error } = await supabase
      .from("faculty_absences")
      .insert({ faculty_id: faculty.id, absence_date, reason: reason ?? null })
      .select("id, absence_date, reason, is_processed")
      .maybeSingle();
    if (error) throw new ToolError(error.message);

    return {
      content: [
        { type: "text", text: `Absence recorded for ${faculty.name} on ${absence_date}.` },
      ],
      structuredContent: { absence: data },
    };
  },
});
