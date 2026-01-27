import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  BookOpen,
  Calendar,
  UserX,
  Settings,
  LogOut,
  GraduationCap,
  Building2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const adminLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/faculty", icon: Users, label: "Faculty" },
  { to: "/dashboard/classrooms", icon: DoorOpen, label: "Classrooms" },
  { to: "/dashboard/departments", icon: Building2, label: "Departments" },
  { to: "/dashboard/courses", icon: BookOpen, label: "Courses" },
  { to: "/dashboard/sections", icon: Layers, label: "Sections" },
  { to: "/dashboard/timetable", icon: Calendar, label: "Timetable" },
  { to: "/dashboard/absences", icon: UserX, label: "Absences" },
];

const facultyLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/my-schedule", icon: Calendar, label: "My Schedule" },
  { to: "/dashboard/mark-absence", icon: UserX, label: "Mark Absence" },
];

const studentLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/timetable", icon: Calendar, label: "View Timetable" },
];

export function DashboardSidebar() {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();

  const links = role === "admin" ? adminLinks : role === "faculty" ? facultyLinks : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">ClassRoom</h1>
            <p className="text-xs text-sidebar-foreground/60">Allocator</p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-4 space-y-2">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            cn("sidebar-item", isActive && "sidebar-item-active")
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
