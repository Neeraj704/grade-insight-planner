-- Create a new table for grading schemes
CREATE TABLE public.grading_schemes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  scheme_name TEXT NOT NULL UNIQUE,
  -- JSONB to store the grade cutoffs, e.g., {"A+": 85, "A": 75, ...}
  grade_cutoffs JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.grading_schemes ENABLE ROW LEVEL SECURITY;

-- Add a foreign key to link admin templates to a grading scheme
ALTER TABLE public.admin_subject_templates
ADD COLUMN grading_scheme_id BIGINT REFERENCES public.grading_schemes(id);

-- Modify the student marks table significantly
ALTER TABLE public.student_subject_marks
-- This column will determine if the subject's credits are used in SGPA calculation
ADD COLUMN is_graded BOOLEAN DEFAULT true NOT NULL,
-- These columns will store a student's manual override
ADD COLUMN overridden_grade TEXT,
ADD COLUMN overridden_points INT;

-- GRADING SCHEMES RLS POLICIES
CREATE POLICY "All users can read grading schemes." ON public.grading_schemes FOR SELECT USING (true);
CREATE POLICY "Admins can manage grading schemes." ON public.grading_schemes FOR ALL USING (get_current_user_role() = 'admin');

-- Insert the default grading rules
INSERT INTO public.grading_schemes (scheme_name, grade_cutoffs, is_default)
VALUES (
  'Default University Scale',
  '{ "A+": 85, "A": 75, "B+": 65, "B": 55, "C": 50, "P": 45, "P-": 40, "F": 0 }',
  true
);