import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { UserX, CalendarDays, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FacultyProfile {
  id: string;
  name: string;
}

interface ExistingAbsence {
  id: string;
  absence_date: string;
  reason: string | null;
  is_processed: boolean;
}

export default function MarkAbsence() {
  const { user } = useAuth();
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [existingAbsences, setExistingAbsences] = useState<ExistingAbsence[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFacultyProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("faculty")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setFacultyProfile(data);
        fetchAbsences(data.id);
      }
    };

    fetchFacultyProfile();
  }, [user]);

  const fetchAbsences = async (facultyId: string) => {
    const { data } = await supabase
      .from("faculty_absences")
      .select("id, absence_date, reason, is_processed")
      .eq("faculty_id", facultyId)
      .order("absence_date", { ascending: false });

    setExistingAbsences(data || []);
  };

  const handleSubmit = async () => {
    if (!facultyProfile || !selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("faculty_absences").insert({
      faculty_id: facultyProfile.id,
      absence_date: format(selectedDate, "yyyy-MM-dd"),
      reason: reason || null,
    });

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("You have already marked absence for this date");
      } else {
        toast.error("Failed to mark absence");
      }
    } else {
      toast.success("Absence marked successfully");
      setSelectedDate(undefined);
      setReason("");
      fetchAbsences(facultyProfile.id);
    }

    setLoading(false);
  };

  if (!facultyProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mark Absence</h1>
          <p className="text-muted-foreground mt-1">
            Report your upcoming absences
          </p>
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
        <h1 className="text-3xl font-bold text-foreground">Mark Absence</h1>
        <p className="text-muted-foreground mt-1">
          Report your upcoming absences for substitute arrangement
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              <CardTitle>Select Date</CardTitle>
            </div>
            <CardDescription>
              Choose the date you will be absent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border w-fit mx-auto"
            />

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for absence..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedDate || loading}
              className="w-full"
            >
              <UserX className="w-4 h-4 mr-2" />
              {loading ? "Submitting..." : "Mark Absence"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Absences</CardTitle>
            <CardDescription>
              Previously marked absences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {existingAbsences.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No absences marked yet
              </p>
            ) : (
              <div className="space-y-3">
                {existingAbsences.map((absence) => (
                  <div
                    key={absence.id}
                    className="p-3 rounded-lg border flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(absence.absence_date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {absence.reason && (
                        <p className="text-sm text-muted-foreground">
                          {absence.reason}
                        </p>
                      )}
                    </div>
                    <Badge className={absence.is_processed ? "badge-success" : "badge-warning"}>
                      {absence.is_processed ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Processed
                        </>
                      ) : (
                        "Pending"
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
