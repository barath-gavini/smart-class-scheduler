import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  slot_number: number;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  section?: { name: string; department?: { code: string; name: string } | null } | null;
  classroom?: { name: string; building: string } | null;
  time_slot?: TimeSlot | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MySchedule() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyId, setFacultyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get faculty profile
      const { data: faculty } = await supabase
        .from("faculty")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!faculty) {
        setLoading(false);
        return;
      }

      setFacultyId(faculty.id);

      // Get time slots
      const { data: slots } = await supabase
        .from("time_slots")
        .select("*")
        .order("slot_number");

      setTimeSlots(slots || []);

      // Get faculty's timetable entries
      const { data: timetable } = await supabase
        .from("timetable_entries")
        .select(`
          id,
          day_of_week,
          section:sections(name, department:departments(code, name)),
          classroom:classrooms(name, building),
          time_slot:time_slots(*)
        `)
        .eq("faculty_id", faculty.id)
        .eq("is_active", true);

      setEntries(timetable || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getEntryForSlot = (dayIndex: number, slotId: string) => {
    return entries.find(
      (e) => e.day_of_week === dayIndex && e.time_slot?.id === slotId
    );
  };

  const todayIndex = new Date().getDay();

  if (!facultyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground mt-1">Your weekly teaching schedule</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Your account is not linked to a faculty profile. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground mt-1">Your weekly teaching schedule</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>Weekly Schedule</CardTitle>
          </div>
          <CardDescription>Your classes for the week</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 gap-2">
              {/* Header row */}
              <div className="p-3 font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </div>
              {DAYS.slice(1, 7).map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "p-3 font-medium text-center rounded-lg",
                    i + 1 === todayIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  )}
                >
                  {day}
                </div>
              ))}
              <div
                className={cn(
                  "p-3 font-medium text-center rounded-lg",
                  todayIndex === 0 ? "bg-primary text-primary-foreground" : "bg-muted/50"
                )}
              >
                Sunday
              </div>

              {/* Time slots */}
              {timeSlots.map((slot) => (
                <>
                  <div
                    key={`time-${slot.id}`}
                    className="p-3 text-sm text-muted-foreground border-t flex flex-col justify-center"
                  >
                    <span className="font-medium">{formatTime(slot.start_time)}</span>
                    <span className="text-xs">{formatTime(slot.end_time)}</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                    const entry = getEntryForSlot(dayIndex, slot.id);
                    return (
                      <div
                        key={`${dayIndex}-${slot.id}`}
                        className={cn(
                          "p-2 min-h-[80px] border rounded-lg",
                          entry
                            ? "bg-primary/5 border-primary/20"
                            : "border-dashed border-muted"
                        )}
                      >
                        {entry && (
                          <div className="h-full flex flex-col">
                            <Badge className="mb-1 w-fit text-xs">
                              {entry.section?.department?.code || entry.section?.name}
                            </Badge>
                            <p className="text-sm font-medium line-clamp-1">
                              {entry.section?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-auto">
                              {entry.classroom?.name} • {entry.classroom?.building}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Classes */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Classes</CardTitle>
          <CardDescription>{DAYS[todayIndex]}</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.filter((e) => e.day_of_week === todayIndex).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No classes scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {entries
                .filter((e) => e.day_of_week === todayIndex)
                .sort((a, b) => (a.time_slot?.slot_number || 0) - (b.time_slot?.slot_number || 0))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg border bg-card flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{entry.section?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.classroom?.name} • {entry.classroom?.building}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entry.time_slot &&
                        `${formatTime(entry.time_slot.start_time)} - ${formatTime(entry.time_slot.end_time)}`}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
