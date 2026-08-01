import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listTimetableTool from "./tools/list-timetable";
import listClassroomsTool from "./tools/list-classrooms";
import listFacultyTool from "./tools/list-faculty";
import listCoursesTool from "./tools/list-courses";
import listAbsencesTool from "./tools/list-absences";
import reportAbsenceTool from "./tools/report-absence";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smart-class-scheduler",
  title: "Smart Class Scheduler",
  version: "0.1.0",
  instructions:
    "Tools for Smart Class Scheduler, a university timetable and classroom allocation app. Use `whoami` to check the signed-in user's role, `list_timetable` for scheduled classes, `list_classrooms`, `list_faculty`, `list_courses` and `list_absences` for resources, and `report_absence` to record an absence for the signed-in faculty member. All data access respects the app's per-user permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listTimetableTool,
    listClassroomsTool,
    listFacultyTool,
    listCoursesTool,
    listAbsencesTool,
    reportAbsenceTool,
  ],
});
