import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default defineTool({
  name: "list_timetable",
  title: "List timetable entries",
  description:
    "List scheduled classes with course, section, faculty, classroom and time slot. Optionally filter by day of week (0=Sunday..6=Saturday).",
  inputSchema: {
    day_of_week: z.number().int().min(0).max(6).optional().describe("0=Sunday .. 6=Saturday"),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ day_of_week, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("timetable_entries")
      .select(
        "id, day_of_week, is_active, faculty:faculty_id(name, email), classroom:classroom_id(name, building), time_slot:time_slot_id(slot_number, start_time, end_time), section:section_id(name, course:course_id(code, name))",
      )
      .eq("is_active", true)
      .order("day_of_week")
      .limit(limit ?? 50);

    if (typeof day_of_week === "number") query = query.eq("day_of_week", day_of_week);

    const { data, error } = await query;
    if (error) throw new ToolError(error.message);

    const entries = (data ?? []).map((row: any) => ({
      id: row.id,
      day: DAYS[row.day_of_week] ?? String(row.day_of_week),
      slot: row.time_slot
        ? { number: row.time_slot.slot_number, start: row.time_slot.start_time, end: row.time_slot.end_time }
        : null,
      course: row.section?.course ? `${row.section.course.code} — ${row.section.course.name}` : null,
      section: row.section?.name ?? null,
      faculty: row.faculty?.name ?? null,
      classroom: row.classroom ? `${row.classroom.name} (${row.classroom.building})` : null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      structuredContent: { entries },
    };
  },
});
