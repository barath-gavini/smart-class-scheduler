-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  has_projector BOOLEAN DEFAULT true,
  has_ac BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create faculty table
CREATE TABLE public.faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  designation TEXT,
  specialization TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  credits INTEGER DEFAULT 3,
  semester INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sections table
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  max_students INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create time_slots table
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_number INTEGER NOT NULL,
  UNIQUE(start_time, end_time)
);

-- Create timetable_entries table
CREATE TABLE public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(classroom_id, time_slot_id, day_of_week),
  UNIQUE(faculty_id, time_slot_id, day_of_week)
);

-- Create faculty_absences table
CREATE TABLE public.faculty_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES public.faculty(id) ON DELETE CASCADE NOT NULL,
  absence_date DATE NOT NULL,
  reason TEXT,
  substitute_faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(faculty_id, absence_date)
);

-- Create reallocation_logs table for audit trail
CREATE TABLE public.reallocation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL,
  original_faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  substitute_faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
  original_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  new_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  reallocation_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reallocation_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for departments (viewable by all authenticated, manageable by admin)
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classrooms
CREATE POLICY "Authenticated users can view classrooms" ON public.classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classrooms" ON public.classrooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for faculty
CREATE POLICY "Authenticated users can view faculty" ON public.faculty FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage faculty" ON public.faculty FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Authenticated users can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sections
CREATE POLICY "Authenticated users can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for time_slots
CREATE POLICY "Authenticated users can view time slots" ON public.time_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage time slots" ON public.time_slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for timetable_entries
CREATE POLICY "Authenticated users can view timetable" ON public.timetable_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage timetable" ON public.timetable_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for faculty_absences
CREATE POLICY "Authenticated users can view absences" ON public.faculty_absences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty can mark their own absence" ON public.faculty_absences FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.faculty WHERE faculty.user_id = auth.uid() AND faculty.id = faculty_id)
);
CREATE POLICY "Admins can manage absences" ON public.faculty_absences FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reallocation_logs
CREATE POLICY "Authenticated users can view reallocation logs" ON public.reallocation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage reallocation logs" ON public.reallocation_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_timetable_entries_updated_at BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default time slots
INSERT INTO public.time_slots (start_time, end_time, slot_number) VALUES
  ('08:00', '09:00', 1),
  ('09:00', '10:00', 2),
  ('10:00', '11:00', 3),
  ('11:00', '12:00', 4),
  ('12:00', '13:00', 5),
  ('14:00', '15:00', 6),
  ('15:00', '16:00', 7),
  ('16:00', '17:00', 8);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_absences;