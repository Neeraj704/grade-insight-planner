import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Target, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Semester {
  id: number;
  semester_title: string;
  calculated_sgpa: number;
  total_credits: number;
}

interface SubjectMark {
  id: number;
  subject_name: string;
  credits: number;
  cws_mark: number | null;
  mte_mark: number | null;
  ete_mark: number | null;
}

interface PredictionResult {
  requiredAverage: number;
  targetSubjects: Array<{
    subject_name: string;
    credits: number;
    requiredMarks: number;
  }>;
  isAchievable: boolean;
  currentProgress: {
    securedPoints: number;
    totalSecuredCredits: number;
    remainingCredits: number;
  };
}

const Predictions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [targetSgpa, setTargetSgpa] = useState<string>('');
  const [subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSubjects();
    }
  }, [selectedSemester]);

  const loadSemesters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('student_semesters')
        .select('id, semester_title, calculated_sgpa, total_credits')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error loading semesters:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load semesters.',
      });
    }
  };

  const loadSubjects = async () => {
    if (!selectedSemester) return;

    try {
      const { data, error } = await supabase
        .from('student_subject_marks')
        .select('*')
        .eq('semester_id', parseInt(selectedSemester));

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subjects.',
      });
    }
  };

  const calculateGradePoints = (total: number): number => {
    if (total >= 85) return 10;
    if (total >= 75) return 9;
    if (total >= 65) return 8;
    if (total >= 55) return 7;
    if (total >= 50) return 6;
    if (total >= 45) return 5;
    if (total >= 40) return 4;
    return 0;
  };

  const calculatePrediction = () => {
    if (!targetSgpa || !selectedSemester || subjects.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a semester and enter a target SGPA.',
      });
      return;
    }

    setLoading(true);

    try {
      const target = parseFloat(targetSgpa);
      if (target < 0 || target > 10) {
        throw new Error('SGPA must be between 0 and 10');
      }

      // Separate completed and incomplete subjects
      const completedSubjects = subjects.filter(s => 
        s.cws_mark !== null && s.mte_mark !== null && s.ete_mark !== null
      );
      
      const incompleteSubjects = subjects.filter(s => 
        s.ete_mark === null || s.ete_mark === 0
      );

      // Calculate secured points from completed subjects
      let securedPoints = 0;
      let totalSecuredCredits = 0;

      completedSubjects.forEach(subject => {
        const total = (subject.cws_mark || 0) + (subject.mte_mark || 0) + (subject.ete_mark || 0);
        const points = calculateGradePoints(total);
        securedPoints += points * subject.credits;
        totalSecuredCredits += subject.credits;
      });

      // Calculate total credits for the semester
      const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
      
      // Calculate required total weighted points for target SGPA
      const requiredTotalPoints = target * totalCredits;
      
      // Calculate remaining points needed
      const remainingPoints = requiredTotalPoints - securedPoints;
      const remainingCredits = totalCredits - totalSecuredCredits;

      if (remainingCredits === 0) {
        setPrediction({
          requiredAverage: 0,
          targetSubjects: [],
          isAchievable: true,
          currentProgress: {
            securedPoints,
            totalSecuredCredits,
            remainingCredits: 0,
          },
        });
        return;
      }

      // Calculate required average grade points for remaining subjects
      const requiredAveragePoints = remainingPoints / remainingCredits;
      
      // Convert grade points back to marks (approximate)
      let requiredMarks = 0;
      if (requiredAveragePoints >= 9.5) requiredMarks = 90;
      else if (requiredAveragePoints >= 8.5) requiredMarks = 80;
      else if (requiredAveragePoints >= 7.5) requiredMarks = 70;
      else if (requiredAveragePoints >= 6.5) requiredMarks = 60;
      else if (requiredAveragePoints >= 5.5) requiredMarks = 52;
      else if (requiredAveragePoints >= 4.5) requiredMarks = 47;
      else if (requiredAveragePoints >= 3.5) requiredMarks = 42;
      else requiredMarks = Math.max(0, requiredAveragePoints * 10);

      // Calculate specific requirements for each incomplete subject
      const targetSubjects = incompleteSubjects.map(subject => {
        const currentTotal = (subject.cws_mark || 0) + (subject.mte_mark || 0);
        const requiredEte = Math.max(0, requiredMarks - currentTotal);
        
        return {
          subject_name: subject.subject_name,
          credits: subject.credits,
          requiredMarks: Math.min(40, requiredEte), // ETE is out of 40
        };
      });

      const isAchievable = requiredAveragePoints <= 10 && requiredMarks <= 100;

      setPrediction({
        requiredAverage: requiredMarks,
        targetSubjects,
        isAchievable,
        currentProgress: {
          securedPoints,
          totalSecuredCredits,
          remainingCredits,
        },
      });

    } catch (error) {
      console.error('Error calculating prediction:', error);
      toast({
        variant: 'destructive',
        title: 'Calculation Error',
        description: 'Please check your inputs and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-accent" />
        <div>
          <h1 className="text-2xl font-bold">What-If Predictions</h1>
          <p className="text-muted-foreground">Calculate what you need to achieve your target SGPA</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id.toString()}>
                      {semester.semester_title} (Current: {semester.calculated_sgpa?.toFixed(2) || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Target SGPA</label>
              <Input
                type="number"
                value={targetSgpa}
                onChange={(e) => setTargetSgpa(e.target.value)}
                placeholder="Enter target SGPA (0-10)"
                min="0"
                max="10"
                step="0.01"
              />
            </div>
          </div>

          <Button 
            onClick={calculatePrediction}
            disabled={loading || !selectedSemester || !targetSgpa}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {loading ? 'Calculating...' : 'Calculate Prediction'}
          </Button>
        </CardContent>
      </Card>

      {prediction && (
        <div className="space-y-4">
          <Card className={prediction.isAchievable ? 'border-success' : 'border-danger'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prediction Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg ${prediction.isAchievable ? 'bg-success/10' : 'bg-danger/10'}`}>
                <h3 className="font-semibold mb-2">
                  {prediction.isAchievable ? '✅ Target Achievable' : '❌ Target May Be Difficult'}
                </h3>
                <p className="text-sm">
                  To achieve an SGPA of <strong>{targetSgpa}</strong>, you need an average of{' '}
                  <strong>{prediction.requiredAverage.toFixed(1)} marks</strong> in your remaining subjects.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-success">
                      {prediction.currentProgress.securedPoints.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Secured Points</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-brand-secondary">
                      {prediction.currentProgress.totalSecuredCredits}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed Credits</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-accent">
                      {prediction.currentProgress.remainingCredits}
                    </div>
                    <div className="text-sm text-muted-foreground">Remaining Credits</div>
                  </CardContent>
                </Card>
              </div>

              {prediction.targetSubjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Subject-wise Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {prediction.targetSubjects.map((subject, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="font-medium">{subject.subject_name}</span>
                          <div className="text-right">
                            <div className="font-semibold">
                              {subject.requiredMarks.toFixed(1)}/40 in ETE
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {subject.credits} credits
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {semesters.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Semesters Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create at least one semester with subjects to use predictions.
            </p>
            <Button onClick={() => window.location.href = '/semesters/new'} className="bg-brand-primary hover:bg-brand-primary/90">
              Create Your First Semester
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Predictions;