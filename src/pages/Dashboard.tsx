import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, TrendingUp, GraduationCap, BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Semester {
  id: number;
  semester_title: string;
  calculated_sgpa: number | null;
  total_credits: number | null;
  created_at: string;
  year: number;
  semester: number;
  branch: string;
}

const Dashboard = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentCGPA: 0,
    totalCredits: 0,
    latestSGPA: 0,
  });
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('student_semesters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching semesters:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your semesters.',
        });
        return;
      }

      setSemesters(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (semesterData: Semester[]) => {
    if (semesterData.length === 0) {
      setStats({ currentCGPA: 0, totalCredits: 0, latestSGPA: 0 });
      return;
    }

    // Calculate CGPA: weighted average of all SGPAs
    let totalWeightedPoints = 0;
    let totalCredits = 0;

    semesterData.forEach(semester => {
      if (semester.calculated_sgpa && semester.total_credits) {
        totalWeightedPoints += semester.calculated_sgpa * semester.total_credits;
        totalCredits += semester.total_credits;
      }
    });

    const currentCGPA = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;
    const latestSGPA = semesterData[0]?.calculated_sgpa || 0;

    setStats({
      currentCGPA: Math.round(currentCGPA * 100) / 100,
      totalCredits,
      latestSGPA: Math.round(latestSGPA * 100) / 100,
    });
  };

  const handleAddSemester = () => {
    navigate('/semesters/new');
  };

  const handleSemesterClick = (semesterId: number) => {
    navigate(`/semesters/${semesterId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name || 'Student'}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Track your academic progress and plan your future semesters
          </p>
        </div>
        <Button onClick={handleAddSemester} className="bg-brand-primary hover:bg-brand-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add New Semester
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.currentCGPA.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall academic performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <GraduationCap className="h-4 w-4 text-brand-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalCredits}
            </div>
            <p className="text-xs text-muted-foreground">
              Credits completed so far
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest SGPA</CardTitle>
            <BookCopy className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.latestSGPA.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent semester
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Semesters Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">Your Semesters</h3>
          <Button variant="outline" onClick={() => navigate('/semesters')}>
            View All
          </Button>
        </div>

        {semesters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookCopy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No semesters yet
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first semester to track your academic progress.
              </p>
              <Button onClick={handleAddSemester} className="bg-brand-primary hover:bg-brand-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Semester
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {semesters.slice(0, 6).map((semester) => (
              <Card 
                key={semester.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSemesterClick(semester.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{semester.semester_title}</CardTitle>
                  <CardDescription>
                    Year {semester.year} • Semester {semester.semester} • {semester.branch}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">SGPA</p>
                      <p className="text-2xl font-bold text-foreground">
                        {semester.calculated_sgpa?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Credits</p>
                      <p className="text-xl font-semibold text-foreground">
                        {semester.total_credits || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;