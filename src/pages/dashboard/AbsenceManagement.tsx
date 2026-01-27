import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserX, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FacultyAbsence {
  id: string;
  faculty_id: string;
  absence_date: string;
  reason: string | null;
  substitute_faculty_id: string | null;
  is_processed: boolean;
  faculty?: { id: string; name: string } | null;
  substitute?: { name: string } | null;
}

interface Faculty {
  id: string;
  name: string;
}

interface TimetableEntry {
  id: string;
  section?: { name: string; department?: { code: string } | null } | null;
  classroom?: { name: string } | null;
  time_slot?: { start_time: string; end_time: string } | null;
  day_of_week: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AbsenceManagement() {
  const [absences, setAbsences] = useState<FacultyAbsence[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Faculty[]>([]);
  const [affectedClasses, setAffectedClasses] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<FacultyAbsence | null>(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const fetchAbsences = async () => {
    const { data, error } = await supabase
      .from("faculty_absences")
      .select("*, faculty:faculty!faculty_absences_faculty_id_fkey(id, name), substitute:faculty!faculty_absences_substitute_faculty_id_fkey(name)")
      .order("absence_date", { ascending: false });

    if (error) {
      toast.error("Failed to fetch absences");
    } else {
      setAbsences(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAbsences();

    const channel = supabase
      .channel("absence-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "faculty_absences" }, () => {
        fetchAbsences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openProcessDialog = async (absence: FacultyAbsence) => {
    setSelectedAbsence(absence);
    setSelectedSubstitute("");

    // Find affected classes for this faculty on the absence date
    const absenceDate = new Date(absence.absence_date);
    const dayOfWeek = absenceDate.getDay();

    const { data: classes } = await supabase
      .from("timetable_entries")
      .select(`
        id,
        day_of_week,
        section:sections(name, department:departments(code)),
        classroom:classrooms(name),
        time_slot:time_slots(start_time, end_time)
      `)
      .eq("faculty_id", absence.faculty_id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    setAffectedClasses(classes || []);

    // Find available faculty (those not teaching at the same times)
    const { data: allFaculty } = await supabase
      .from("faculty")
      .select("id, name")
      .eq("is_available", true)
      .neq("id", absence.faculty_id);

    // Filter out faculty who are busy during affected time slots
    const busyFacultyIds = new Set<string>();
    
    if (classes && classes.length > 0) {
      const timeSlotIds = classes.map((c) => c.time_slot?.start_time).filter(Boolean);
      
      const { data: busyEntries } = await supabase
        .from("timetable_entries")
        .select("faculty_id, time_slot:time_slots(start_time)")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      busyEntries?.forEach((entry) => {
        if (timeSlotIds.includes(entry.time_slot?.start_time)) {
          if (entry.faculty_id) busyFacultyIds.add(entry.faculty_id);
        }
      });
    }

    const available = (allFaculty || []).filter((f) => !busyFacultyIds.has(f.id));
    setAvailableFaculty(available);
    setProcessDialogOpen(true);
  };

  const processAbsence = async () => {
    if (!selectedAbsence || !selectedSubstitute) {
      toast.error("Please select a substitute faculty");
      return;
    }

    setProcessing(true);

    try {
      // Create reallocation log entries
      for (const entry of affectedClasses) {
        await supabase.from("reallocation_logs").insert({
          original_entry_id: entry.id,
          original_faculty_id: selectedAbsence.faculty_id,
          substitute_faculty_id: selectedSubstitute,
          reallocation_date: selectedAbsence.absence_date,
          reason: selectedAbsence.reason || "Faculty absence",
        });
      }

      // Mark absence as processed
      await supabase
        .from("faculty_absences")
        .update({
          substitute_faculty_id: selectedSubstitute,
          is_processed: true,
        })
        .eq("id", selectedAbsence.id);

      toast.success("Absence processed and substitute assigned");
      setProcessDialogOpen(false);
      fetchAbsences();
    } catch (error) {
      toast.error("Failed to process absence");
    }

    setProcessing(false);
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Absence Management</h1>
        <p className="text-muted-foreground mt-1">
          Process faculty absences and assign substitutes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                {absences.filter((a) => !a.is_processed).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processed</p>
              <p className="text-2xl font-bold">
                {absences.filter((a) => a.is_processed).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            <CardTitle>All Absences</CardTitle>
          </div>
          <CardDescription>Click "Process" to assign a substitute</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Substitute</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No absences recorded
                  </TableCell>
                </TableRow>
              ) : (
                absences.map((absence) => (
                  <TableRow key={absence.id}>
                    <TableCell className="font-medium">
                      {absence.faculty?.name}
                    </TableCell>
                    <TableCell>
                      {new Date(absence.absence_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {absence.reason || "—"}
                    </TableCell>
                    <TableCell>
                      {absence.substitute?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {absence.is_processed ? (
                        <Badge className="badge-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Processed
                        </Badge>
                      ) : (
                        <Badge className="badge-warning">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!absence.is_processed && (
                        <Button
                          size="sm"
                          onClick={() => openProcessDialog(absence)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Absence</DialogTitle>
            <DialogDescription>
              Assign a substitute for {selectedAbsence?.faculty?.name} on{" "}
              {selectedAbsence && new Date(selectedAbsence.absence_date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Affected Classes</Label>
              {affectedClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  No classes scheduled for this day
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {affectedClasses.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {entry.section?.department?.code} - {entry.section?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.time_slot && `${formatTime(entry.time_slot.start_time)} - ${formatTime(entry.time_slot.end_time)}`}
                          {entry.classroom && ` • ${entry.classroom.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Substitute Faculty</Label>
              {availableFaculty.length === 0 ? (
                <p className="text-sm text-destructive">
                  No available faculty for this time slot
                </p>
              ) : (
                <Select value={selectedSubstitute} onValueChange={setSelectedSubstitute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select available faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFaculty.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedSubstitute && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Reallocation Preview</span>
                </div>
                <p className="text-sm mt-2">
                  {selectedAbsence?.faculty?.name}
                  <ArrowRight className="w-4 h-4 inline mx-2" />
                  {availableFaculty.find((f) => f.id === selectedSubstitute)?.name}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={processAbsence}
              disabled={!selectedSubstitute || processing}
            >
              {processing ? "Processing..." : "Confirm Reallocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
