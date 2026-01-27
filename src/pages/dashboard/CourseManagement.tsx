import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  semester: number | null;
  department_id: string | null;
  duration_hours: number | null;
  is_lab: boolean | null;
  department?: { name: string; code: string } | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*, department:departments(name, code)")
      .order("code");

    if (error) {
      toast.error("Failed to fetch courses");
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  // State for is_lab switch in the form
  const [isLabChecked, setIsLabChecked] = useState(false);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const courseData = {
      code: (formData.get("code") as string).toUpperCase(),
      name: formData.get("name") as string,
      credits: parseInt(formData.get("credits") as string) || 3,
      semester: parseInt(formData.get("semester") as string) || null,
      department_id: formData.get("department_id") as string || null,
      duration_hours: parseInt(formData.get("duration_hours") as string) || 1,
      is_lab: isLabChecked,
    };

    if (editingCourse) {
      const { error } = await supabase
        .from("courses")
        .update(courseData)
        .eq("id", editingCourse.id);

      if (error) {
        toast.error("Failed to update course");
      } else {
        toast.success("Course updated successfully");
        fetchCourses();
        setDialogOpen(false);
        setEditingCourse(null);
      }
    } else {
      const { error } = await supabase.from("courses").insert(courseData);

      if (error) {
        toast.error(error.message.includes("duplicate") ? "Course code already exists" : "Failed to add course");
      } else {
        toast.success("Course added successfully");
        fetchCourses();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete course");
    } else {
      toast.success("Course deleted successfully");
      fetchCourses();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage courses and their details
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setIsLabChecked(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCourse(null);
              setIsLabChecked(false);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? "Edit Course" : "Add New Course"}
              </DialogTitle>
              <DialogDescription>
                Enter the course details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., CS101"
                  defaultValue={editingCourse?.code}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Introduction to Programming"
                  defaultValue={editingCourse?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select
                  name="department_id"
                  defaultValue={editingCourse?.department_id || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    name="credits"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={editingCourse?.credits || 3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select
                    name="semester"
                    defaultValue={editingCourse?.semester?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Duration (Hours)</Label>
                  <Select
                    name="duration_hours"
                    defaultValue={(editingCourse?.duration_hours || 1).toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3].map((hr) => (
                        <SelectItem key={hr} value={hr.toString()}>
                          {hr} {hr === 1 ? 'Hour' : 'Hours'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_lab">Lab Course</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="is_lab"
                      checked={isLabChecked}
                      onCheckedChange={setIsLabChecked}
                    />
                    <span className="text-sm text-muted-foreground">
                      {isLabChecked ? "Yes (continuous slots required)" : "No"}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingCourse ? "Update" : "Add"} Course
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <CardTitle>All Courses</CardTitle>
          </div>
          <CardDescription>{courses.length} courses registered</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No courses found
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-mono font-medium">{course.code}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>
                      {course.department ? (
                        <Badge variant="outline">{course.department.code}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{course.duration_hours || 1}hr</TableCell>
                    <TableCell>
                      {course.is_lab ? (
                        <Badge variant="secondary">Lab</Badge>
                      ) : (
                        <Badge variant="outline">Theory</Badge>
                      )}
                    </TableCell>
                    <TableCell>{course.semester ? `Sem ${course.semester}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCourse(course);
                          setIsLabChecked(course.is_lab || false);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(course.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
