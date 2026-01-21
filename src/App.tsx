import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Auth from "./pages/Auth";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import FacultyManagement from "./pages/dashboard/FacultyManagement";
import ClassroomManagement from "./pages/dashboard/ClassroomManagement";
import DepartmentManagement from "./pages/dashboard/DepartmentManagement";
import CourseManagement from "./pages/dashboard/CourseManagement";
import SectionManagement from "./pages/dashboard/SectionManagement";
import TimetableView from "./pages/dashboard/TimetableView";
import AbsenceManagement from "./pages/dashboard/AbsenceManagement";
import MarkAbsence from "./pages/dashboard/MarkAbsence";
import MySchedule from "./pages/dashboard/MySchedule";
import Settings from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="faculty" element={<FacultyManagement />} />
              <Route path="classrooms" element={<ClassroomManagement />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="sections" element={<SectionManagement />} />
              <Route path="timetable" element={<TimetableView />} />
              <Route path="absences" element={<AbsenceManagement />} />
              <Route path="mark-absence" element={<MarkAbsence />} />
              <Route path="my-schedule" element={<MySchedule />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
