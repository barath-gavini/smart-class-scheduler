import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in user's profile and role in Smart Class Scheduler.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: profile, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
      supabase.from("profiles").select("full_name, email, created_at").eq("user_id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
    ]);
    if (profileError) throw new ToolError(profileError.message);
    if (roleError) throw new ToolError(roleError.message);

    const result = {
      user_id: userId,
      email: profile?.email ?? ctx.getUserEmail() ?? null,
      full_name: profile?.full_name ?? null,
      roles: (roles ?? []).map((r) => r.role),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
