import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Save, Trash2, RotateCcw, Target, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SubjectMark {
  id?: number;
  subject_name: string;
  credits: number;
  cws_mark: number | null;
  mte_mark: number | null;
  ete_mark: number | null;
  assumed_marks: {
    cws: boolean;
    mte: boolean;
    ete: boolean;
  };
  is_graded: boolean;
  overridden_grade: string | null;
  overridden_points: number | null;
  total: number;
  grade: string;
  points: number;
}

interface GradingScheme {
  id: number;
  scheme_name: string;
  grade_cutoffs: Record<string, number>;
  is_default: boolean;
}

interface AdminTemplate {
  id: number;
  subject_name: string;
  default_credits: number;
  year: number;
  semester: number;
  branch: string;
  grading_scheme_id: number | null;
}

const SemesterInput = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [semesterTitle, setSemesterTitle] = useState('');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [branch, setBranch] = useState('CSE');
  const [subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [gradingSchemes, setGradingSchemes] = useState<GradingScheme[]>([]);
  const [gradeOverrideOpen, setGradeOverrideOpen] = useState<number | null>(null);
  
  const [stats, setStats] = useState({
    sgpa: 0,
    creditsForGpa: 0,
    totalDisplayCredits: 0,
  });

  useEffect(() => {
    loadGradingSchemes();
    if (id && id !== 'new') {
      loadSemester(parseInt(id));
    } else {
      // New semester - show setup form
      setShowSetupForm(true);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    calculateStats();
  }, [subjects]);

  const loadGradingSchemes = async () => {
    try {
      const { data, error } = await supabase
        .from('grading_schemes')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (error) {
        console.error('Error loading grading schemes:', error);
        return;
      }
      
      setGradingSchemes((data || []).map(scheme => ({
        ...scheme,
        grade_cutoffs: scheme.grade_cutoffs as Record<string, number>
      })));
    } catch (error) {
      console.error('Error loading grading schemes:', error);
    }
  };

  const loadSemester = async (semesterId: number) => {
    try {
      // Load semester details
      const { data: semesterData, error: semesterError } = await supabase
        .from('student_semesters')
        .select('*')
        .eq('id', semesterId)
        .single();

      if (semesterError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load semester data.',
        });
        navigate('/');
        return;
      }

      setSemesterTitle(semesterData.semester_title);
      setYear(semesterData.year);
      setSemester(semesterData.semester);
      setBranch(semesterData.branch);

      // Load subject marks
      const { data: marksData, error: marksError } = await supabase
        .from('student_subject_marks')
        .select('*')
        .eq('semester_id', semesterId);

      if (marksError) {
        console.error('Error loading marks:', marksError);
      }

      if (marksData && marksData.length > 0) {
        const formattedSubjects: SubjectMark[] = [];
        
        for (const mark of marksData) {
          const gradeData = await calculateGradeAndPoints(mark.cws_mark, mark.mte_mark, mark.ete_mark, null);
          formattedSubjects.push({
            id: mark.id,
            subject_name: mark.subject_name,
            credits: mark.credits,
            cws_mark: mark.cws_mark,
            mte_mark: mark.mte_mark,
            ete_mark: mark.ete_mark,
            assumed_marks: mark.assumed_marks as any,
            is_graded: mark.is_graded ?? true,
            overridden_grade: mark.overridden_grade,
            overridden_points: mark.overridden_points,
            ...gradeData,
          });
        }
        
        setSubjects(formattedSubjects);
      } else {
        loadTemplateSubjects();
      }
    } catch (error) {
      console.error('Error loading semester:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_subject_templates')
        .select('*')
        .eq('year', year)
        .eq('semester', semester)
        .eq('branch', branch);

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      if (data && data.length > 0) {
        const templateSubjects: SubjectMark[] = data.map(template => ({
          subject_name: template.subject_name,
          credits: template.default_credits,
          cws_mark: null,
          mte_mark: null,
          ete_mark: null,
          assumed_marks: { cws: false, mte: false, ete: false },
          is_graded: true,
          overridden_grade: null,
          overridden_points: null,
          total: 0,
          grade: 'F',
          points: 0,
        }));
        setSubjects(templateSubjects);
      }
    } catch (error) {
      console.error('Error loading template subjects:', error);
    }
  };

  const calculateGradeAndPoints = async (cws: number | null, mte: number | null, ete: number | null, templateSchemeId: number | null) => {
    const cwsScore = cws || 0;
    const mteScore = mte || 0;
    const eteScore = ete || 0;
    const total = cwsScore + mteScore + eteScore;

    let grade = 'F';
    let points = 0;

    // Use default scheme for now - in a full implementation, we'd use the template's scheme
    const defaultScheme = gradingSchemes.find(s => s.is_default) || {
      grade_cutoffs: { "A+": 85, "A": 75, "B+": 65, "B": 55, "C": 50, "P": 45, "P-": 40, "F": 0 }
    };

    const cutoffs = defaultScheme.grade_cutoffs;
    const gradeEntries = Object.entries(cutoffs).sort(([,a], [,b]) => b - a);

    for (const [gradeKey, minScore] of gradeEntries) {
      if (total >= minScore) {
        grade = gradeKey;
        break;
      }
    }

    // Map grades to points
    const gradeToPoints: Record<string, number> = {
      'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C': 6, 'P': 5, 'P-': 4, 'F': 0
    };
    points = gradeToPoints[grade] || 0;

    return { total, grade, points };
  };

  const calculateStats = () => {
    let totalWeightedPoints = 0;
    let creditsForGpa = 0;
    let totalDisplayCredits = 0;

    subjects.forEach(subject => {
      totalDisplayCredits += subject.credits;
      
      // Only include graded subjects in SGPA calculation
      if (subject.is_graded) {
        creditsForGpa += subject.credits;
        const pointsToUse = subject.overridden_points !== null ? subject.overridden_points : subject.points;
        totalWeightedPoints += pointsToUse * subject.credits;
      }
    });

    const sgpa = creditsForGpa > 0 ? totalWeightedPoints / creditsForGpa : 0;
    setStats({
      sgpa: Math.round(sgpa * 100) / 100,
      creditsForGpa,
      totalDisplayCredits,
    });
  };

  const updateSubject = async (index: number, field: keyof SubjectMark, value: any) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    
    // Recalculate grade and points if marks changed
    if (field === 'cws_mark' || field === 'mte_mark' || field === 'ete_mark') {
      const subject = updatedSubjects[index];
      const gradeData = await calculateGradeAndPoints(subject.cws_mark, subject.mte_mark, subject.ete_mark, null);
      updatedSubjects[index] = { ...updatedSubjects[index], ...gradeData };
    }
    
    setSubjects(updatedSubjects);
  };

  const toggleAssumed = (index: number, markType: 'cws' | 'mte' | 'ete') => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index].assumed_marks[markType] = !updatedSubjects[index].assumed_marks[markType];
    setSubjects(updatedSubjects);
  };

  const addSubject = () => {
    const newSubject: SubjectMark = {
      subject_name: '',
      credits: 3,
      cws_mark: null,
      mte_mark: null,
      ete_mark: null,
      assumed_marks: { cws: false, mte: false, ete: false },
      is_graded: true,
      overridden_grade: null,
      overridden_points: null,
      total: 0,
      grade: 'F',
      points: 0,
    };
    setSubjects([...subjects, newSubject]);
  };

  const removeSubject = async (index: number) => {
    const subject = subjects[index];
    
    // If the subject has an ID, delete from database
    if (subject.id) {
      const { error } = await supabase
        .from('student_subject_marks')
        .delete()
        .eq('id', subject.id);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete subject.',
        });
        return;
      }
    }
    
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(updatedSubjects);
  };

  const getSemesterOptions = (selectedYear: number) => {
    const semesterMap: Record<number, { value: number; label: string }[]> = {
      1: [{ value: 1, label: 'Semester 1' }, { value: 2, label: 'Semester 2' }],
      2: [{ value: 3, label: 'Semester 3' }, { value: 4, label: 'Semester 4' }],
      3: [{ value: 5, label: 'Semester 5' }, { value: 6, label: 'Semester 6' }],
      4: [{ value: 7, label: 'Semester 7' }, { value: 8, label: 'Semester 8' }],
    };
    return semesterMap[selectedYear] || [];
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const availableSemesters = getSemesterOptions(newYear);
    if (availableSemesters.length > 0) {
      setSemester(availableSemesters[0].value);
    }
  };

  const handleManualGradeOverride = async (index: number, newGrade: string) => {
    const gradeToPoints: Record<string, number> = {
      'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C': 6, 'P': 5, 'P-': 4, 'F': 0, 'S': 0, 'U': 0
    };

    const updatedSubjects = [...subjects];
    updatedSubjects[index] = {
      ...updatedSubjects[index],
      overridden_grade: newGrade,
      overridden_points: gradeToPoints[newGrade] || 0,
    };
    
    setSubjects(updatedSubjects);
    setGradeOverrideOpen(null);
  };

  const getSubjectGradingScheme = (templateSchemeId: number | null) => {
    if (templateSchemeId) {
      return gradingSchemes.find(s => s.id === templateSchemeId);
    }
    return gradingSchemes.find(s => s.is_default) || {
      scheme_name: 'Default',
      grade_cutoffs: { "A+": 85, "A": 75, "B+": 65, "B": 55, "C": 50, "P": 45, "P-": 40, "F": 0 }
    };
  };

  const resetToTemplate = async () => {
    await loadTemplateSubjects();
    toast({
      title: 'Reset Complete',
      description: 'Subjects have been reset to template defaults.',
    });
  };

  const saveSemester = async () => {
    if (!user) return;

    setSaving(true);
    try {
      let semesterId: number;

      if (id && id !== 'new') {
        // Update existing semester
        semesterId = parseInt(id);
        const { error: semesterError } = await supabase
          .from('student_semesters')
          .update({
            semester_title: semesterTitle,
            year,
            semester,
            branch,
            calculated_sgpa: stats.sgpa,
            total_credits: stats.totalDisplayCredits,
          })
          .eq('id', semesterId);

        if (semesterError) {
          throw semesterError;
        }
      } else {
        // Create new semester
        const { data: newSemester, error: semesterError } = await supabase
          .from('student_semesters')
          .insert({
            user_id: user.id,
            semester_title: semesterTitle || `Year ${year} - Semester ${semester}`,
            year,
            semester,
            branch,
            calculated_sgpa: stats.sgpa,
            total_credits: stats.totalDisplayCredits,
          })
          .select()
          .single();

        if (semesterError) {
          throw semesterError;
        }

        semesterId = newSemester.id;
      }

      // Delete existing marks and insert new ones
      await supabase
        .from('student_subject_marks')
        .delete()
        .eq('semester_id', semesterId);

      if (subjects.length > 0) {
        const marksToInsert = subjects.map(subject => ({
          semester_id: semesterId,
          subject_name: subject.subject_name,
          credits: subject.credits,
          cws_mark: subject.cws_mark,
          mte_mark: subject.mte_mark,
          ete_mark: subject.ete_mark,
          assumed_marks: subject.assumed_marks,
          is_graded: subject.is_graded,
          overridden_grade: subject.overridden_grade,
          overridden_points: subject.overridden_points,
        }));

        const { error: marksError } = await supabase
          .from('student_subject_marks')
          .insert(marksToInsert);

        if (marksError) {
          throw marksError;
        }
      }

      toast({
        title: 'Saved Successfully',
        description: 'Your semester data has been saved.',
      });

      if (id === 'new') {
        navigate(`/semesters/${semesterId}`);
      }
    } catch (error) {
      console.error('Error saving semester:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save semester data.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getGradeBadgeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'bg-success text-white';
    if (['B+', 'B', 'C'].includes(grade)) return 'bg-accent text-black';
    if (['P', 'P-'].includes(grade)) return 'bg-yellow-500 text-white';
    return 'bg-danger text-white';
  };

  const handleSetupComplete = async () => {
    setSemesterTitle(`Year ${year} - Semester ${semester}`);
    setShowSetupForm(false);
    await loadTemplateSubjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (showSetupForm) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>New Semester Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Year</label>
              <Select value={year.toString()} onValueChange={(v) => handleYearChange(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(y => (
                    <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Semester</label>
              <Select value={semester.toString()} onValueChange={(v) => setSemester(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSemesterOptions(year).map(sem => (
                    <SelectItem key={sem.value} value={sem.value.toString()}>{sem.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Branch</label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">Computer Science Engineering</SelectItem>
                  <SelectItem value="ECE">Electronics & Communication</SelectItem>
                  <SelectItem value="ME">Mechanical Engineering</SelectItem>
                  <SelectItem value="CE">Civil Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSetupComplete} className="w-full bg-brand-primary hover:bg-brand-primary/90">
              Load Subjects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2 lg:space-y-0">
          <Input
            value={semesterTitle}
            onChange={(e) => setSemesterTitle(e.target.value)}
            placeholder={`Year ${year} - Semester ${semester}`}
            className="text-xl font-semibold"
          />
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Select value={year.toString()} onValueChange={(v) => handleYearChange(parseInt(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(y => (
                  <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={semester.toString()} onValueChange={(v) => setSemester(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getSemesterOptions(year).map(sem => (
                  <SelectItem key={sem.value} value={sem.value.toString()}>Sem {sem.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
                <SelectItem value="ME">ME</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToTemplate}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Template
          </Button>
          <Button onClick={saveSemester} disabled={saving} className="bg-brand-primary hover:bg-brand-primary/90">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calculated SGPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-primary">{stats.sgpa.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-secondary">{stats.totalDisplayCredits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Marks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Marks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Subject Name</TableHead>
                  <TableHead className="w-[80px]">Credits</TableHead>
                  <TableHead className="w-[120px]">CWS (30)</TableHead>
                  <TableHead className="w-[120px]">MTE (30)</TableHead>
                  <TableHead className="w-[120px]">ETE (40)</TableHead>
                  <TableHead className="w-[80px]">Total</TableHead>
                  <TableHead className="w-[80px]">Grade</TableHead>
                  <TableHead className="w-[80px]">Graded</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              value={subject.subject_name}
                              onChange={(e) => updateSubject(index, 'subject_name', e.target.value)}
                              placeholder="Subject name"
                              className="min-w-[180px]"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium mb-1">Grading Scheme: {getSubjectGradingScheme(null).scheme_name}</div>
                              {Object.entries(getSubjectGradingScheme(null).grade_cutoffs)
                                .sort(([,a], [,b]) => b - a)
                                .map(([grade, cutoff]) => (
                                  <div key={grade}>{grade}: {cutoff} and above</div>
                                ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={subject.credits}
                        onChange={(e) => updateSubject(index, 'credits', parseInt(e.target.value) || 0)}
                        className="w-[70px]"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={subject.cws_mark || ''}
                          onChange={(e) => updateSubject(index, 'cws_mark', parseFloat(e.target.value) || null)}
                          placeholder="0"
                          className={cn(
                            'w-[80px]',
                            subject.assumed_marks.cws && 'bg-assumed-bg border-assumed-border border-dashed'
                          )}
                        />
                        <Button
                          variant={subject.assumed_marks.cws ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleAssumed(index, 'cws')}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          A
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={subject.mte_mark || ''}
                          onChange={(e) => updateSubject(index, 'mte_mark', parseFloat(e.target.value) || null)}
                          placeholder="0"
                          className={cn(
                            'w-[80px]',
                            subject.assumed_marks.mte && 'bg-assumed-bg border-assumed-border border-dashed'
                          )}
                        />
                        <Button
                          variant={subject.assumed_marks.mte ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleAssumed(index, 'mte')}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          A
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={subject.ete_mark || ''}
                          onChange={(e) => updateSubject(index, 'ete_mark', parseFloat(e.target.value) || null)}
                          placeholder="0"
                          className={cn(
                            'w-[80px]',
                            subject.assumed_marks.ete && 'bg-assumed-bg border-assumed-border border-dashed'
                          )}
                        />
                        <Button
                          variant={subject.assumed_marks.ete ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleAssumed(index, 'ete')}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          A
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{subject.total}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getGradeBadgeColor(
                          subject.is_graded 
                            ? (subject.overridden_grade || subject.grade)
                            : (subject.total >= 40 ? 'S' : 'U')
                        )}>
                          {subject.is_graded 
                            ? (subject.overridden_grade || subject.grade)
                            : (subject.total >= 40 ? 'S' : 'U')
                          }
                          {subject.overridden_grade && '*'}
                        </Badge>
                        {subject.is_graded && (
                          <AlertDialog open={gradeOverrideOpen === index} onOpenChange={(open) => setGradeOverrideOpen(open ? index : null)}>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Manual Grade Override</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will override the automatically calculated grade. Use this feature carefully as it affects your SGPA calculation.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Select onValueChange={(value) => handleManualGradeOverride(index, value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['A+', 'A', 'B+', 'B', 'C', 'P', 'P-', 'F'].map(grade => (
                                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={subject.is_graded}
                        onCheckedChange={(checked) => updateSubject(index, 'is_graded', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubject(index)}
                        className="h-8 w-8 p-0 text-danger hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={addSubject}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
            <Button onClick={() => navigate('/predictions')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Target className="mr-2 h-4 w-4" />
              What-If Predictions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SemesterInput;