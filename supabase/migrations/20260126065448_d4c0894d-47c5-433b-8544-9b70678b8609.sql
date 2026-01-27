-- Delete old time slots and insert new ones following the 10 AM - 5 PM schedule
-- with 1 PM - 2 PM lunch break (6 instructional periods)

DELETE FROM time_slots;

-- Morning session: 10:00 AM - 1:00 PM (3 periods)
INSERT INTO time_slots (slot_number, start_time, end_time) VALUES
  (1, '10:00:00', '11:00:00'),
  (2, '11:00:00', '12:00:00'),
  (3, '12:00:00', '13:00:00');

-- Afternoon session: 2:00 PM - 5:00 PM (3 periods)
INSERT INTO time_slots (slot_number, start_time, end_time) VALUES
  (4, '14:00:00', '15:00:00'),
  (5, '15:00:00', '16:00:00'),
  (6, '16:00:00', '17:00:00');

-- Add duration_hours column to courses table for dynamic period duration handling
-- Default 1 hour for theory, labs will have higher values (2-3 hours)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours integer DEFAULT 1;

-- Add is_lab column to identify lab subjects that need continuous time blocks
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_lab boolean DEFAULT false;

-- Update existing lab courses based on name patterns
UPDATE courses SET is_lab = true, duration_hours = 2 
WHERE LOWER(name) LIKE '%lab%';