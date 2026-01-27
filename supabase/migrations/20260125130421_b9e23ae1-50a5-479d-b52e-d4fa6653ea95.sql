-- Add course_id column to timetable_entries table
ALTER TABLE public.timetable_entries 
ADD COLUMN course_id uuid REFERENCES public.courses(id);

-- Create index for better query performance
CREATE INDEX idx_timetable_entries_course_id ON public.timetable_entries(course_id);