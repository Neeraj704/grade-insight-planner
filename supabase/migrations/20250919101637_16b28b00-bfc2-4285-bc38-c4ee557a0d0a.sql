-- Profiles table to store public user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  enrollment_no TEXT,
  college_name TEXT,
  role TEXT DEFAULT 'student' NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin-managed subject templates
CREATE TABLE public.admin_subject_templates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subject_name TEXT NOT NULL,
  default_credits INT NOT NULL,
  year INT NOT NULL,
  semester INT NOT NULL,
  branch TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_subject_templates ENABLE ROW LEVEL SECURITY;

-- Stores each semester created by a student
CREATE TABLE public.student_semesters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_title TEXT NOT NULL,
  year INT NOT NULL,
  semester INT NOT NULL,
  branch TEXT NOT NULL,
  calculated_sgpa NUMERIC(4, 2),
  total_credits INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_semesters ENABLE ROW LEVEL SECURITY;

-- Stores the detailed marks for each subject in a semester
CREATE TABLE public.student_subject_marks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  semester_id BIGINT NOT NULL REFERENCES public.student_semesters(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  credits INT NOT NULL,
  cws_mark NUMERIC(5, 2),
  mte_mark NUMERIC(5, 2),
  ete_mark NUMERIC(5, 2),
  -- JSONB to store the assumed status for each mark type
  assumed_marks JSONB DEFAULT '{"cws": false, "mte": false, "ete": false}'
);

-- Enable RLS
ALTER TABLE public.student_subject_marks ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- PROFILES RLS
CREATE POLICY "Users can view their own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- ADMIN SUBJECT TEMPLATES RLS
CREATE POLICY "Students can read all subject templates" ON public.admin_subject_templates 
FOR SELECT USING (true);

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Admins can manage all subject templates" ON public.admin_subject_templates 
FOR ALL USING (public.get_current_user_role() = 'admin');

-- STUDENT SEMESTERS RLS
CREATE POLICY "Users can manage their own semesters" ON public.student_semesters 
FOR ALL USING (auth.uid() = user_id);

-- STUDENT SUBJECT MARKS RLS
CREATE POLICY "Users can manage marks for their own semesters" ON public.student_subject_marks 
FOR ALL USING (
  (SELECT user_id FROM public.student_semesters WHERE id = semester_id) = auth.uid()
);

-- Insert some sample admin templates
INSERT INTO public.admin_subject_templates (subject_name, default_credits, year, semester, branch) VALUES
('Mathematics I', 4, 1, 1, 'CSE'),
('Physics I', 3, 1, 1, 'CSE'),
('Chemistry', 3, 1, 1, 'CSE'),
('Programming Fundamentals', 4, 1, 1, 'CSE'),
('English Communication', 2, 1, 1, 'CSE'),
('Mathematics II', 4, 1, 2, 'CSE'),
('Physics II', 3, 1, 2, 'CSE'),
('Data Structures', 4, 1, 2, 'CSE'),
('Digital Logic', 3, 1, 2, 'CSE'),
('Engineering Graphics', 2, 1, 2, 'CSE');

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();