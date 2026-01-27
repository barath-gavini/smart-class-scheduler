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
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";

interface Faculty {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  specialization: string | null;
  is_available: boolean;
  department_id: string | null;
  department?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFaculty = async () => {
    const { data, error } = await supabase
      .from("faculty")
      .select("*, department:departments(name)")
      .order("name");

    if (error) {
      toast.error("Failed to fetch faculty");
    } else {
      setFaculty(data || []);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    setDepartments(data || []);
  };

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const facultyData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      designation: formData.get("designation") as string || null,
      specialization: formData.get("specialization") as string || null,
      department_id: formData.get("department_id") as string || null,
      is_available: true,
    };

    if (editingFaculty) {
      const { error } = await supabase
        .from("faculty")
        .update(facultyData)
        .eq("id", editingFaculty.id);

      if (error) {
        toast.error("Failed to update faculty");
      } else {
        toast.success("Faculty updated successfully");
        fetchFaculty();
        setDialogOpen(false);
        setEditingFaculty(null);
      }
    } else {
      const { error } = await supabase.from("faculty").insert(facultyData);

      if (error) {
        toast.error("Failed to add faculty");
      } else {
        toast.success("Faculty added successfully");
        fetchFaculty();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return;

    const { error } = await supabase.from("faculty").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete faculty");
    } else {
      toast.success("Faculty deleted successfully");
      fetchFaculty();
    }
  };

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Faculty Management</h1>
          <p className="text-muted-foreground mt-1">
            Add, edit, and manage faculty members
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFaculty(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Faculty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFaculty ? "Edit Faculty" : "Add New Faculty"}
              </DialogTitle>
              <DialogDescription>
                {editingFaculty
                  ? "Update faculty member details"
                  : "Enter the details of the new faculty member"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingFaculty?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingFaculty?.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select
                  name="department_id"
                  defaultValue={editingFaculty?.department_id || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  name="designation"
                  defaultValue={editingFaculty?.designation || ""}
                  placeholder="e.g., Professor, Assistant Professor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  defaultValue={editingFaculty?.specialization || ""}
                  placeholder="e.g., Machine Learning, Database Systems"
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingFaculty ? "Update" : "Add"} Faculty
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
              <Users className="w-5 h-5" />
              <CardTitle>All Faculty</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <CardDescription>
            {filteredFaculty.length} faculty member{filteredFaculty.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaculty.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No faculty members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFaculty.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.department?.name || "—"}</TableCell>
                    <TableCell>{member.designation || "—"}</TableCell>
                    <TableCell>
                      <Badge className={member.is_available ? "badge-success" : "badge-danger"}>
                        {member.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingFaculty(member);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(member.id)}
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
