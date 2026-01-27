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
import { SmartSchedulerAssistant } from "@/components/scheduling/SmartSchedulerAssistant";

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
  course_id: string | null;
  time_slot_id: string;
  day_of_week: number;
  is_active: boolean;
  section?: { name: string; department?: { code: string; name: string } | null } | null;
  classroom?: { name: string; building: string } | null;
  faculty?: { name: string } | null;
  course?: { name: string; code: string } | null;
  time_slot?: TimeSlot | null;
}

interface Section {
  id: string;
  name: string;
  department?: { code: string; name: string } | null;
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

interface Course {
  id: string;
  name: string;
  code: string;
  duration_hours?: number;
  is_lab?: boolean;
}

// Session boundaries for scheduling constraints
const MORNING_SESSION = { start: 1, end: 3 }; // Slots 1-3 (10 AM - 1 PM)
const AFTERNOON_SESSION = { start: 4, end: 6 }; // Slots 4-6 (2 PM - 5 PM)
const LUNCH_BREAK = { start: "13:00", end: "14:00" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableView() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all");

  const fetchData = async () => {
    const [entriesRes, slotsRes, sectionsRes, classroomsRes, facultyRes, coursesRes] = await Promise.all([
      supabase
        .from("timetable_entries")
        .select(`
          *,
          section:sections(name, department:departments(code, name)),
          classroom:classrooms(name, building),
          faculty:faculty(name),
          course:courses(name, code),
          time_slot:time_slots(*)
        `)
        .eq("is_active", true),
      supabase.from("time_slots").select("*").order("slot_number"),
      supabase.from("sections").select("id, name, department:departments(code, name)"),
      supabase.from("classrooms").select("id, name, building").eq("is_available", true),
      supabase.from("faculty").select("id, name").eq("is_available", true),
      supabase.from("courses").select("id, name, code, duration_hours, is_lab"),
    ]);

    setEntries(entriesRes.data || []);
    setTimeSlots(slotsRes.data || []);
    setSections(sectionsRes.data || []);
    setClassrooms(classroomsRes.data || []);
    setFaculty(facultyRes.data || []);
    setCourses(coursesRes.data || []);
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

  // Helper function to get slot number from slot ID
  const getSlotNumber = (slotId: string): number => {
    const slot = timeSlots.find(s => s.id === slotId);
    return slot?.slot_number || 0;
  };

  // Helper function to check if slots are in the same session (morning or afternoon)
  const areConsecutiveSlotsInSameSession = (startSlotNumber: number, duration: number): boolean => {
    const endSlotNumber = startSlotNumber + duration - 1;

    // Check if all slots are within morning session
    const inMorning = startSlotNumber >= MORNING_SESSION.start && endSlotNumber <= MORNING_SESSION.end;
    // Check if all slots are within afternoon session
    const inAfternoon = startSlotNumber >= AFTERNOON_SESSION.start && endSlotNumber <= AFTERNOON_SESSION.end;

    return inMorning || inAfternoon;
  };

  // Get consecutive slot IDs for multi-hour courses
  const getConsecutiveSlotIds = (startSlotId: string, duration: number): string[] => {
    const startSlotNumber = getSlotNumber(startSlotId);
    const slotIds: string[] = [];

    for (let i = 0; i < duration; i++) {
      const targetSlotNumber = startSlotNumber + i;
      const slot = timeSlots.find(s => s.slot_number === targetSlotNumber);
      if (slot) {
        slotIds.push(slot.id);
      }
    }

    return slotIds;
  };

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const sectionId = formData.get("section_id") as string;
    const classroomId = formData.get("classroom_id") as string || null;
    const facultyId = formData.get("faculty_id") as string || null;
    const courseId = formData.get("course_id") as string || null;

    // Get course details for duration handling
    const selectedCourse = courses.find(c => c.id === courseId);
    const duration =
      Number(formData.get("duration_hours")) ||
      selectedCourse?.duration_hours ||
      1;

    const isLab = selectedCourse?.is_lab || false;

    const startSlotNumber = getSlotNumber(selectedSlot!);

    // For ANY multi-hour course, validate continuous time block within same session
    if (duration > 1) {
      if (!areConsecutiveSlotsInSameSession(startSlotNumber, duration)) {
        const courseType = isLab ? "Lab" : "This";
        toast.error(`${courseType} course requires ${duration} continuous hours within the same session (Morning: 10 AM-1 PM or Afternoon: 2 PM-5 PM). This slot cannot accommodate it.`);
        return;
      }
    }

    // Get all slot IDs that this course will occupy
    const slotsToBook = getConsecutiveSlotIds(selectedSlot!, duration);

    if (slotsToBook.length < duration) {
      toast.error(`Not enough consecutive time slots available for this ${duration}-hour course`);
      return;
    }

    // Check conflicts for all slots the course will occupy
    for (const slotId of slotsToBook) {
      // Check for faculty conflict
      if (facultyId) {
        const facultyConflict = entries.find(
          (e) => e.faculty_id === facultyId && e.time_slot_id === slotId && e.day_of_week === selectedDay
        );
        if (facultyConflict) {
          toast.error(`Faculty is already assigned to ${facultyConflict.section?.name} at this time`);
          return;
        }
      }

      // Check for classroom conflict
      if (classroomId) {
        const classroomConflict = entries.find(
          (e) => e.classroom_id === classroomId && e.time_slot_id === slotId && e.day_of_week === selectedDay
        );
        if (classroomConflict) {
          toast.error(`Classroom is already assigned to ${classroomConflict.section?.name} at this time`);
          return;
        }
      }

      // Check for section conflict
      const sectionConflict = entries.find(
        (e) => e.section_id === sectionId && e.time_slot_id === slotId && e.day_of_week === selectedDay
      );
      if (sectionConflict) {
        toast.error("This section already has a class scheduled at this time");
        return;
      }
    }

    // Create entries for all slots (for multi-hour courses)
    const entriesToInsert = slotsToBook.map(slotId => ({
      section_id: sectionId,
      classroom_id: classroomId,
      faculty_id: facultyId,
      course_id: courseId,
      time_slot_id: slotId,
      day_of_week: selectedDay!,
      is_active: true,
    }));

    const { error } = await supabase.from("timetable_entries").insert(entriesToInsert);

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Conflict: This slot is already occupied");
      } else {
        toast.error("Failed to add entry");
      }
    } else {
      toast.success(`Timetable entry added${duration > 1 ? ` (${duration} consecutive periods)` : ''}`);
      fetchData();
      setDialogOpen(false);
    }
  };

  const getEntriesForSlot = (dayIndex: number, slotId: string) => {
    const filteredEntries = selectedSectionFilter === "all"
      ? entries
      : entries.filter((e) => e.section_id === selectedSectionFilter);

    return filteredEntries.filter(
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
            Section-based weekly schedule - each section has its own timetable
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">View Section:</Label>
            <Select value={selectedSectionFilter} onValueChange={setSelectedSectionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name} {section.department ? `(${section.department.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SmartSchedulerAssistant />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>
              {selectedSectionFilter === "all"
                ? "All Sections Schedule"
                : `${sections.find(s => s.id === selectedSectionFilter)?.name || 'Section'} Timetable`}
            </CardTitle>
          </div>
          <CardDescription>
            {selectedSectionFilter === "all"
              ? "Select a section above to view/edit its specific timetable"
              : "Click on an empty slot to add a class for this section"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 gap-2">
              {/* Header row */}
              <div className="p-3 font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </div>
              {DAYS.slice(1, 7).map((day) => (
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

              {/* Time slots with lunch break indicator */}
              {timeSlots.map((slot, index) => (
                <>
                  {/* Add lunch break row after slot 3 (12-1 PM) */}
                  {slot.slot_number === 4 && (
                    <>
                      <div className="p-3 text-sm text-muted-foreground border-t flex flex-col justify-center bg-muted/30">
                        <span className="font-medium">1:00 PM</span>
                        <span className="text-xs">2:00 PM</span>
                      </div>
                      {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => (
                        <div
                          key={`lunch-${dayIndex}`}
                          className="p-2 min-h-[50px] border rounded-lg bg-muted/30 flex items-center justify-center"
                        >
                          <span className="text-xs text-muted-foreground italic">Lunch Break</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div
                    key={`time-${slot.id}`}
                    className="p-3 text-sm text-muted-foreground border-t flex flex-col justify-center"
                  >
                    <span className="font-medium">{formatTime(slot.start_time)}</span>
                    <span className="text-xs">{formatTime(slot.end_time)}</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                    const slotEntries = getEntriesForSlot(dayIndex, slot.id);
                    const hasEntries = slotEntries.length > 0;
                    return (
                      <div
                        key={`${dayIndex}-${slot.id}`}
                        className={cn(
                          "p-2 min-h-[80px] border rounded-lg transition-colors",
                          hasEntries
                            ? "bg-primary/5 border-primary/20"
                            : "hover:bg-muted/50 cursor-pointer border-dashed"
                        )}
                        onClick={() => {
                          if (!hasEntries || selectedSectionFilter !== "all") {
                            setSelectedDay(dayIndex);
                            setSelectedSlot(slot.id);
                            setDialogOpen(true);
                          }
                        }}
                      >
                        {hasEntries ? (
                          <div className="h-full flex flex-col gap-1">
                            {slotEntries.slice(0, 2).map((entry) => (
                              <div key={entry.id} className="flex flex-col">
                                <Badge className="mb-0.5 w-fit text-xs">
                                  {entry.section?.name}
                                </Badge>
                                <p className="text-xs font-medium line-clamp-1">
                                  {entry.course?.code || entry.course?.name || "No course"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.classroom?.name} • {entry.faculty?.name?.split(" ")[0]}
                                </p>
                              </div>
                            ))}
                            {slotEntries.length > 2 && (
                              <p className="text-xs text-muted-foreground">+{slotEntries.length - 2} more</p>
                            )}
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
              <Label>Section <span className="text-destructive">*</span></Label>
              <Select
                name="section_id"
                required
                defaultValue={selectedSectionFilter !== "all" ? selectedSectionFilter : undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section first" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name} {section.department ? `(${section.department.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course / Subject <span className="text-destructive">*</span></Label>
              <Select name="course_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.name.replace(/\(.*?\)/g, "").trim()}
                      {course.is_lab && (
                        <span className="text-muted-foreground ml-1"></span>
                      )}
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
              <Label>Class Duration (hours)</Label>
              <Select name="duration_hours" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? "s" : ""}
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
