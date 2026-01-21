import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, DoorOpen, Monitor, Wind, Users } from "lucide-react";
import { toast } from "sonner";

interface Classroom {
  id: string;
  name: string;
  building: string;
  capacity: number;
  has_projector: boolean;
  has_ac: boolean;
  is_available: boolean;
}

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const fetchClassrooms = async () => {
    const { data, error } = await supabase
      .from("classrooms")
      .select("*")
      .order("building")
      .order("name");

    if (error) {
      toast.error("Failed to fetch classrooms");
    } else {
      setClassrooms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const classroomData = {
      name: formData.get("name") as string,
      building: formData.get("building") as string,
      capacity: parseInt(formData.get("capacity") as string) || 30,
      has_projector: formData.get("has_projector") === "on",
      has_ac: formData.get("has_ac") === "on",
      is_available: true,
    };

    if (editingClassroom) {
      const { error } = await supabase
        .from("classrooms")
        .update(classroomData)
        .eq("id", editingClassroom.id);

      if (error) {
        toast.error("Failed to update classroom");
      } else {
        toast.success("Classroom updated successfully");
        fetchClassrooms();
        setDialogOpen(false);
        setEditingClassroom(null);
      }
    } else {
      const { error } = await supabase.from("classrooms").insert(classroomData);

      if (error) {
        toast.error("Failed to add classroom");
      } else {
        toast.success("Classroom added successfully");
        fetchClassrooms();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom?")) return;

    const { error } = await supabase.from("classrooms").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete classroom");
    } else {
      toast.success("Classroom deleted successfully");
      fetchClassrooms();
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("classrooms")
      .update({ is_available: !current })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update availability");
    } else {
      fetchClassrooms();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classroom Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage classrooms and their facilities
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClassroom(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClassroom ? "Edit Classroom" : "Add New Classroom"}
              </DialogTitle>
              <DialogDescription>
                {editingClassroom
                  ? "Update classroom details"
                  : "Enter the details of the new classroom"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name/Number</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Room 101"
                  defaultValue={editingClassroom?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  name="building"
                  placeholder="e.g., Main Building"
                  defaultValue={editingClassroom?.building}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={editingClassroom?.capacity || 30}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has_projector">Has Projector</Label>
                <Switch
                  id="has_projector"
                  name="has_projector"
                  defaultChecked={editingClassroom?.has_projector ?? true}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has_ac">Has AC</Label>
                <Switch
                  id="has_ac"
                  name="has_ac"
                  defaultChecked={editingClassroom?.has_ac ?? true}
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingClassroom ? "Update" : "Add"} Classroom
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Classrooms</p>
              <p className="text-2xl font-bold">{classrooms.length}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">
                {classrooms.filter((c) => c.is_available).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
              <p className="text-2xl font-bold">
                {classrooms.reduce((sum, c) => sum + c.capacity, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Classrooms</CardTitle>
          <CardDescription>Click on a row to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classrooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No classrooms found
                  </TableCell>
                </TableRow>
              ) : (
                classrooms.map((classroom) => (
                  <TableRow key={classroom.id}>
                    <TableCell className="font-medium">{classroom.name}</TableCell>
                    <TableCell>{classroom.building}</TableCell>
                    <TableCell>{classroom.capacity} seats</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {classroom.has_projector && (
                          <Badge variant="outline" className="gap-1">
                            <Monitor className="w-3 h-3" /> Projector
                          </Badge>
                        )}
                        {classroom.has_ac && (
                          <Badge variant="outline" className="gap-1">
                            <Wind className="w-3 h-3" /> AC
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={classroom.is_available ? "badge-success" : "badge-danger"}
                        onClick={() => toggleAvailability(classroom.id, classroom.is_available)}
                        style={{ cursor: "pointer" }}
                      >
                        {classroom.is_available ? "Available" : "In Use"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingClassroom(classroom);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(classroom.id)}
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
