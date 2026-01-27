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

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  department_id: string;
  section_letter: string;
  faculty_id: string | null;
  max_students: number | null;
  department?: { code: string; name: string } | null;
  faculty?: { name: string } | null;
}

interface Faculty {
  id: string;
  name: string;
}

export default function SectionManagement() {
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*, department:departments(code, name), faculty:faculty(name)")
      .order("name");

    if (error) {
      toast.error("Failed to fetch sections");
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, code, name").order("name");
    setDepartments(data || []);
  };

  const fetchFaculty = async () => {
    const { data } = await supabase.from("faculty").select("id, name").order("name");
    setFaculty(data || []);
  };

  useEffect(() => {
    fetchSections();
    fetchDepartments();
    fetchFaculty();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const deptId = formData.get("department_id") as string;
    const sectionLetter = (formData.get("section_letter") as string).toUpperCase();
    const dept = departments.find(d => d.id === deptId);
    const sectionName = dept ? `${dept.code}-${sectionLetter}` : sectionLetter;

    const facultyId = formData.get("faculty_id") as string;
    const sectionData = {
      name: sectionName,
      department_id: deptId,
      section_letter: sectionLetter,
      faculty_id: facultyId === "none" ? null : facultyId || null,
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
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          toast.error("A section with this letter already exists in this department");
        } else {
          toast.error("Failed to add section");
        }
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

  const filteredSections = selectedDepartment
    ? sections.filter(s => s.department_id === selectedDepartment)
    : sections;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Section Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage department sections and faculty assignments
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
                <Label htmlFor="department_id">Department</Label>
                <Select
                  name="department_id"
                  defaultValue={editingSection?.department_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section_letter">Section Letter</Label>
                <Input
                  id="section_letter"
                  name="section_letter"
                  placeholder="e.g., A, B, C"
                  defaultValue={editingSection?.section_letter}
                  maxLength={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Section will be named as DEPT-LETTER (e.g., CSD-A)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty_id">Assigned Faculty (Optional)</Label>
                <Select
                  name="faculty_id"
                  defaultValue={editingSection?.faculty_id || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              <CardTitle>All Sections</CardTitle>
            </div>
            <Select
              value={selectedDepartment || "all"}
              onValueChange={(val) => setSelectedDepartment(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>{filteredSections.length} sections registered</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No sections found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>
                      {section.department ? (
                        <div>
                          <Badge variant="outline" className="mr-2">{section.department.code}</Badge>
                          <span className="text-muted-foreground">{section.department.name}</span>
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
