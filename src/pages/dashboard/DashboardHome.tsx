import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DoorOpen, BookOpen, Calendar, UserX, CheckCircle, AlertCircle } from "lucide-react";

interface DashboardStats {
  facultyCount: number;
  classroomCount: number;
  courseCount: number;
  todayClasses: number;
  pendingAbsences: number;
  availableClassrooms: number;
}

export default function DashboardHome() {
  const { role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    facultyCount: 0,
    classroomCount: 0,
    courseCount: 0,
    todayClasses: 0,
    pendingAbsences: 0,
    availableClassrooms: 0,
  });
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: facultyCount },
        { count: classroomCount },
        { count: courseCount },
        { count: availableClassrooms },
        { count: pendingAbsences },
        { data: absences },
      ] = await Promise.all([
        supabase.from("faculty").select("*", { count: "exact", head: true }),
        supabase.from("classrooms").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("classrooms").select("*", { count: "exact", head: true }).eq("is_available", true),
        supabase.from("faculty_absences").select("*", { count: "exact", head: true }).eq("is_processed", false),
        supabase.from("faculty_absences")
          .select("*, faculty:faculty_id(name), substitute:substitute_faculty_id(name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const today = new Date().getDay();
      const { count: todayClasses } = await supabase
        .from("timetable_entries")
        .select("*", { count: "exact", head: true })
        .eq("day_of_week", today)
        .eq("is_active", true);

      setStats({
        facultyCount: facultyCount || 0,
        classroomCount: classroomCount || 0,
        courseCount: courseCount || 0,
        todayClasses: todayClasses || 0,
        pendingAbsences: pendingAbsences || 0,
        availableClassrooms: availableClassrooms || 0,
      });

      setRecentAbsences(absences || []);
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to the Dynamic Classroom Resource Allocation System
        </p>
      </div>

      {role === "admin" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Faculty"
              value={stats.facultyCount}
              icon={<Users className="w-6 h-6" />}
              description="Active members"
            />
            <StatCard
              title="Classrooms"
              value={stats.classroomCount}
              icon={<DoorOpen className="w-6 h-6" />}
              description={`${stats.availableClassrooms} available`}
              trend="up"
            />
            <StatCard
              title="Courses"
              value={stats.courseCount}
              icon={<BookOpen className="w-6 h-6" />}
              description="This semester"
            />
            <StatCard
              title="Today's Classes"
              value={stats.todayClasses}
              icon={<Calendar className="w-6 h-6" />}
              description="Scheduled today"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-slide-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="w-5 h-5" />
                      Recent Absences
                    </CardTitle>
                    <CardDescription>Faculty absence notifications</CardDescription>
                  </div>
                  {stats.pendingAbsences > 0 && (
                    <Badge variant="destructive">{stats.pendingAbsences} pending</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentAbsences.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No recent absences
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentAbsences.map((absence) => (
                      <div
                        key={absence.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{absence.faculty?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(absence.absence_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="/dashboard/faculty"
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Manage Faculty</p>
                      <p className="text-sm text-muted-foreground">Add or update faculty members</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/dashboard/timetable"
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">View Timetable</p>
                      <p className="text-sm text-muted-foreground">Check and modify schedules</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/dashboard/absences"
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserX className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Process Absences</p>
                      <p className="text-sm text-muted-foreground">Handle faculty substitutions</p>
                    </div>
                  </div>
                </a>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {role === "faculty" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Your Schedule Today</CardTitle>
            <CardDescription>View your classes and mark absences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Navigate to "My Schedule" to view your classes
            </p>
          </CardContent>
        </Card>
      )}

      {role === "student" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Navigate to "View Timetable" to see your schedule
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
