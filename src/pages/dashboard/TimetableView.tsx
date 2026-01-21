import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  slot_number: number;
}

interface TimetableEntry {
  id: string;
  section_id: string;
  classroom_id: string | null;
  faculty_id: string | null;
  time_slot_id: string;
  day_of_week: number;
  is_active: boolean;
  section?: { name: string; course?: { code: string; name: string } | null } | null;
  classroom?: { name: string; building: string } | null;
  faculty?: { name: string } | null;
  time_slot?: TimeSlot | null;
}

interface Section {
  id: string;
  name: string;
  course?: { code: string; name: string } | null;
}

interface Classroom {
  id: string;
  name: string;
  building: string;
}

interface Faculty {
  id: string;
  name: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TimetableView() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const fetchData = async () => {
    const [entriesRes, slotsRes, sectionsRes, classroomsRes, facultyRes] = await Promise.all([
      supabase
        .from("timetable_entries")
        .select(`
          *,
          section:sections(name, course:courses(code, name)),
          classroom:classrooms(name, building),
          faculty:faculty(name),
          time_slot:time_slots(*)
        `)
        .eq("is_active", true),
      supabase.from("time_slots").select("*").order("slot_number"),
      supabase.from("sections").select("id, name, course:courses(code, name)"),
      supabase.from("classrooms").select("id, name, building").eq("is_available", true),
      supabase.from("faculty").select("id, name").eq("is_available", true),
    ]);

    setEntries(entriesRes.data || []);
    setTimeSlots(slotsRes.data || []);
    setSections(sectionsRes.data || []);
    setClassrooms(classroomsRes.data || []);
    setFaculty(facultyRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("timetable-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const entryData = {
      section_id: formData.get("section_id") as string,
      classroom_id: formData.get("classroom_id") as string || null,
      faculty_id: formData.get("faculty_id") as string || null,
      time_slot_id: selectedSlot!,
      day_of_week: selectedDay!,
      is_active: true,
    };

    const { error } = await supabase.from("timetable_entries").insert(entryData);

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Conflict: This slot is already occupied");
      } else {
        toast.error("Failed to add entry");
      }
    } else {
      toast.success("Timetable entry added");
      fetchData();
      setDialogOpen(false);
    }
  };

  const getEntryForSlot = (dayIndex: number, slotId: string) => {
    return entries.find(
      (e) => e.day_of_week === dayIndex && e.time_slot_id === slotId
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Timetable</h1>
          <p className="text-muted-foreground mt-1">
            Weekly class schedule overview
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>Weekly Schedule</CardTitle>
          </div>
          <CardDescription>Click on an empty slot to add a class</CardDescription>
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
                  className="p-3 font-medium text-center bg-muted/50 rounded-lg"
                >
                  {day}
                </div>
              ))}
              <div className="p-3 font-medium text-center bg-muted/50 rounded-lg">
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
                          "p-2 min-h-[80px] border rounded-lg transition-colors",
                          entry
                            ? "bg-primary/5 border-primary/20"
                            : "hover:bg-muted/50 cursor-pointer border-dashed"
                        )}
                        onClick={() => {
                          if (!entry) {
                            setSelectedDay(dayIndex);
                            setSelectedSlot(slot.id);
                            setDialogOpen(true);
                          }
                        }}
                      >
                        {entry ? (
                          <div className="h-full flex flex-col">
                            <Badge className="mb-1 w-fit text-xs">
                              {entry.section?.course?.code}
                            </Badge>
                            <p className="text-sm font-medium line-clamp-1">
                              {entry.section?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-auto">
                              {entry.classroom?.name} • {entry.faculty?.name?.split(" ")[0]}
                            </p>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground/50">
                            <Plus className="w-4 h-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timetable Entry</DialogTitle>
            <DialogDescription>
              {selectedDay !== null && `${DAYS[selectedDay]} - ${timeSlots.find((s) => s.id === selectedSlot)?.start_time}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Select name="section_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.course?.code} - {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Classroom</Label>
              <Select name="classroom_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} ({room.building})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Select name="faculty_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculty.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Add Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
