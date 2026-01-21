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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  course_id: string;
  faculty_id: string | null;
  max_students: number | null;
  course?: { code: string; name: string } | null;
  faculty?: { name: string } | null;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
}

export default function SectionManagement() {
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*, course:courses(code, name), faculty:faculty(name)")
      .order("name");

    if (error) {
      toast.error("Failed to fetch sections");
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("id, code, name").order("code");
    setCourses(data || []);
  };

  const fetchFaculty = async () => {
    const { data } = await supabase.from("faculty").select("id, name").order("name");
    setFaculty(data || []);
  };

  useEffect(() => {
    fetchSections();
    fetchCourses();
    fetchFaculty();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const sectionData = {
      name: formData.get("name") as string,
      course_id: formData.get("course_id") as string,
      faculty_id: formData.get("faculty_id") as string || null,
      max_students: parseInt(formData.get("max_students") as string) || 60,
    };

    if (editingSection) {
      const { error } = await supabase
        .from("sections")
        .update(sectionData)
        .eq("id", editingSection.id);

      if (error) {
        toast.error("Failed to update section");
      } else {
        toast.success("Section updated successfully");
        fetchSections();
        setDialogOpen(false);
        setEditingSection(null);
      }
    } else {
      const { error } = await supabase.from("sections").insert(sectionData);

      if (error) {
        toast.error("Failed to add section");
      } else {
        toast.success("Section added successfully");
        fetchSections();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    const { error } = await supabase.from("sections").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete section");
    } else {
      toast.success("Section deleted successfully");
      fetchSections();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Section Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage course sections and faculty assignments
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSection(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSection ? "Edit Section" : "Add New Section"}
              </DialogTitle>
              <DialogDescription>
                Enter the section details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Section Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Section A"
                  defaultValue={editingSection?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_id">Course</Label>
                <Select
                  name="course_id"
                  defaultValue={editingSection?.course_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty_id">Assigned Faculty</Label>
                <Select
                  name="faculty_id"
                  defaultValue={editingSection?.faculty_id || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty (optional)" />
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
                <Label htmlFor="max_students">Max Students</Label>
                <Input
                  id="max_students"
                  name="max_students"
                  type="number"
                  min={1}
                  defaultValue={editingSection?.max_students || 60}
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingSection ? "Update" : "Add"} Section
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            <CardTitle>All Sections</CardTitle>
          </div>
          <CardDescription>{sections.length} sections registered</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No sections found
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>
                      {section.course ? (
                        <div>
                          <Badge variant="outline" className="mr-2">{section.course.code}</Badge>
                          <span className="text-muted-foreground">{section.course.name}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{section.faculty?.name || "—"}</TableCell>
                    <TableCell>{section.max_students || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingSection(section);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(section.id)}
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
