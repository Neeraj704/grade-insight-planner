import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, BookOpen, Calendar, GraduationCap, Trash2 } from 'lucide-react';

interface Semester {
  id: number;
  semester_title: string;
  year: number;
  semester: number;
  branch: string;
  calculated_sgpa: number | null;
  total_credits: number | null;
  created_at: string;
}

const Semesters = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('student_semesters')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error loading semesters:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load semesters.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSemester = async (semesterId: number, semesterTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${semesterTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('student_semesters')
        .delete()
        .eq('id', semesterId);

      if (error) throw error;

      toast({
        title: 'Semester Deleted',
        description: `"${semesterTitle}" has been deleted successfully.`,
      });

      loadSemesters();
    } catch (error) {
      console.error('Error deleting semester:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete the semester. Please try again.',
      });
    }
  };

  const getSgpaBadgeColor = (sgpa: number | null) => {
    if (!sgpa) return 'bg-muted-foreground text-white';
    if (sgpa >= 9) return 'bg-success text-white';
    if (sgpa >= 7) return 'bg-accent text-black';
    if (sgpa >= 6) return 'bg-yellow-500 text-white';
    return 'bg-danger text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-brand-primary" />
          <div>
            <h1 className="text-2xl font-bold">All Semesters</h1>
            <p className="text-muted-foreground">Manage and view all your academic semesters</p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/semesters/new')}
          className="bg-brand-primary hover:bg-brand-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Semester
        </Button>
      </div>

      {semesters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Semesters Yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by creating your first semester to track your academic progress.
            </p>
            <Button
              onClick={() => navigate('/semesters/new')}
              className="bg-brand-primary hover:bg-brand-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Semester
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesters.map((semester) => (
            <Card
              key={semester.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/semesters/${semester.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{semester.semester_title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSemester(semester.id, semester.semester_title);
                    }}
                    className="h-8 w-8 p-0 text-danger hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Year {semester.year} • Semester {semester.semester} • {semester.branch}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Badge className={getSgpaBadgeColor(semester.calculated_sgpa)}>
                      SGPA: {semester.calculated_sgpa?.toFixed(2) || 'N/A'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-secondary">
                      {semester.total_credits || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Credits</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(semester.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {semesters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Academic Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">
                  {semesters.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Semesters</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-secondary">
                  {semesters.reduce((sum, s) => sum + (s.total_credits || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Credits</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {semesters.filter(s => (s.calculated_sgpa || 0) >= 7).length}
                </div>
                <div className="text-sm text-muted-foreground">Good Semesters (≥7.0)</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {semesters.length > 0 
                    ? (semesters.reduce((sum, s, _, arr) => {
                        const sgpa = s.calculated_sgpa || 0;
                        const credits = s.total_credits || 0;
                        return sum + (sgpa * credits);
                      }, 0) / semesters.reduce((sum, s) => sum + (s.total_credits || 0), 0)).toFixed(2)
                    : '0.00'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Overall CGPA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Semesters;