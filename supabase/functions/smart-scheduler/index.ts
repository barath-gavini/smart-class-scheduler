import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleContext {
  timetable: any[];
  faculty: any[];
  classrooms: any[];
  timeSlots: any[];
  sections: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json() as { message: string; context?: ScheduleContext };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch current data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current scheduling data if not provided
    let scheduleContext = context;
    if (!scheduleContext) {
      const [timetableRes, facultyRes, classroomsRes, timeSlotsRes, sectionsRes] = await Promise.all([
        supabase.from("timetable_entries").select(`
          *,
          section:sections(name, department:departments(code, name)),
          classroom:classrooms(name, building, capacity),
          faculty:faculty(name, specialization),
          time_slot:time_slots(*)
        `).eq("is_active", true),
        supabase.from("faculty").select("*").eq("is_available", true),
        supabase.from("classrooms").select("*").eq("is_available", true),
        supabase.from("time_slots").select("*").order("slot_number"),
        supabase.from("sections").select("*, department:departments(code, name), faculty:faculty(name)")
      ]);

      scheduleContext = {
        timetable: timetableRes.data || [],
        faculty: facultyRes.data || [],
        classrooms: classroomsRes.data || [],
        timeSlots: timeSlotsRes.data || [],
        sections: sectionsRes.data || []
      };
    }

    const systemPrompt = `You are an intelligent scheduling assistant for a university classroom resource allocation system. You help administrators optimize timetables, resolve conflicts, and make smart scheduling decisions.

Current System Data:
- Active Timetable Entries: ${scheduleContext.timetable.length}
- Available Faculty: ${scheduleContext.faculty.length}
- Available Classrooms: ${scheduleContext.classrooms.length}
- Time Slots: ${scheduleContext.timeSlots.length}
- Sections to Schedule: ${scheduleContext.sections.length}

Faculty List:
${scheduleContext.faculty.map((f: any) => `- ${f.name} (${f.specialization || 'General'})`).join('\n')}

Classrooms:
${scheduleContext.classrooms.map((c: any) => `- ${c.name} in ${c.building} (Capacity: ${c.capacity}, AC: ${c.has_ac ? 'Yes' : 'No'}, Projector: ${c.has_projector ? 'Yes' : 'No'})`).join('\n')}

Time Slots:
${scheduleContext.timeSlots.map((t: any) => `- Slot ${t.slot_number}: ${t.start_time} - ${t.end_time}`).join('\n')}

Current Timetable:
${scheduleContext.timetable.map((e: any) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `- ${days[e.day_of_week]}: ${e.section?.department?.code || 'N/A'} ${e.section?.name || ''} in ${e.classroom?.name || 'TBD'} by ${e.faculty?.name || 'TBD'}`;
}).join('\n') || 'No entries yet'}

Unscheduled Sections:
${scheduleContext.sections.filter((s: any) => 
  !scheduleContext!.timetable.some((t: any) => t.section_id === s.id)
).map((s: any) => `- ${s.department?.code || 'N/A'} ${s.name} (Faculty: ${s.faculty?.name || 'Not assigned'})`).join('\n') || 'All sections scheduled'}

Your responsibilities:
1. Suggest optimal time slots for unscheduled classes
2. Identify and help resolve scheduling conflicts
3. Recommend classroom assignments based on capacity and facilities
4. Provide insights on faculty workload distribution
5. Suggest improvements to the current timetable

When making suggestions:
- Consider faculty availability and avoid overloading
- Match classroom capacity with section size
- Distribute classes evenly across the week
- Avoid back-to-back classes for the same faculty when possible
- Consider facility requirements (projector for tech courses, etc.)

Keep responses concise, actionable, and formatted clearly with bullet points or numbered lists when appropriate.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        context: {
          totalEntries: scheduleContext.timetable.length,
          availableFaculty: scheduleContext.faculty.length,
          availableClassrooms: scheduleContext.classrooms.length,
          unscheduledSections: scheduleContext.sections.filter((s: any) => 
            !scheduleContext!.timetable.some((t: any) => t.section_id === s.id)
          ).length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Smart Scheduler Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
