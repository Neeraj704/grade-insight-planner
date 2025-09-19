import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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

interface SubjectTemplate {
  id: number;
  subject_name: string;
  default_credits: number;
  year: number;
  semester: number;
  branch: string;
  grading_scheme_id?: number | null;
}

interface GradingScheme {
  id: number;
  scheme_name: string;
  grade_cutoffs: Record<string, number>;
  is_default: boolean;
}

const Admin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SubjectTemplate[]>([]);
  const [gradingSchemes, setGradingSchemes] = useState<GradingScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SubjectTemplate | null>(null);
  const [editingScheme, setEditingScheme] = useState<GradingScheme | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [deleteSchemeId, setDeleteSchemeId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    subject_name: '',
    default_credits: 3,
    year: 1,
    semester: 1,
    branch: 'CSE',
    grading_scheme_id: null as number | null,
  });

  const [schemeFormData, setSchemeFormData] = useState({
    scheme_name: '',
    grade_cutoffs: {
      'A+': 85,
      'A': 75,
      'B+': 65,
      'B': 55,
      'C': 50,
      'P': 45,
      'P-': 40,
      'F': 0,
    },
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You need admin privileges to access this page.',
      });
      return;
    }
    loadTemplates();
    loadGradingSchemes();
  }, [profile]);

  const loadGradingSchemes = async () => {
    try {
      const { data, error } = await supabase
        .from('grading_schemes')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      
      setGradingSchemes((data || []).map(scheme => ({
        ...scheme,
        grade_cutoffs: scheme.grade_cutoffs as Record<string, number>
      })));
    } catch (error) {
      console.error('Error loading grading schemes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load grading schemes.',
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_subject_templates')
        .select('*')
        .order('year', { ascending: true })
        .order('semester', { ascending: true })
        .order('branch', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subject templates.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('admin_subject_templates')
          .update(formData)
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
        
        toast({
          title: 'Updated Successfully',
          description: 'Subject template has been updated.',
        });
      } else {
        const { error } = await supabase
          .from('admin_subject_templates')
          .insert(formData);
        
        if (error) throw error;
        
        toast({
          title: 'Added Successfully',
          description: 'New subject template has been added.',
        });
      }
      
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({
        subject_name: '',
        default_credits: 3,
        year: 1,
        semester: 1,
        branch: 'CSE',
        grading_scheme_id: null,
      });
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save subject template.',
      });
    }
  };

  const handleEdit = (template: SubjectTemplate) => {
    setEditingTemplate(template);
      setFormData({
        subject_name: template.subject_name,
        default_credits: template.default_credits,
        year: template.year,
        semester: template.semester,
        branch: template.branch,
        grading_scheme_id: template.grading_scheme_id || null,
      });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('admin_subject_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Deleted Successfully',
        description: 'Subject template has been deleted.',
      });
      
      loadTemplates();
      setDeleteTemplateId(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete subject template.',
      });
    }
  };

  const handleSchemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingScheme) {
        const { error } = await supabase
          .from('grading_schemes')
          .update({
            scheme_name: schemeFormData.scheme_name,
            grade_cutoffs: schemeFormData.grade_cutoffs,
          })
          .eq('id', editingScheme.id);
        
        if (error) throw error;
        
        toast({
          title: 'Updated Successfully',
          description: 'Grading scheme has been updated.',
        });
      } else {
        const { error } = await supabase
          .from('grading_schemes')
          .insert({
            scheme_name: schemeFormData.scheme_name,
            grade_cutoffs: schemeFormData.grade_cutoffs,
          });
        
        if (error) throw error;
        
        toast({
          title: 'Added Successfully',
          description: 'New grading scheme has been added.',
        });
      }
      
      setIsSchemeDialogOpen(false);
      setEditingScheme(null);
      setSchemeFormData({
        scheme_name: '',
        grade_cutoffs: {
          'A+': 85, 'A': 75, 'B+': 65, 'B': 55, 'C': 50, 'P': 45, 'P-': 40, 'F': 0,
        } as any,
      });
      loadGradingSchemes();
    } catch (error) {
      console.error('Error saving grading scheme:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save grading scheme.',
      });
    }
  };

  const handleEditScheme = (scheme: GradingScheme) => {
    setEditingScheme(scheme);
    setSchemeFormData({
      scheme_name: scheme.scheme_name,
      grade_cutoffs: { ...scheme.grade_cutoffs },
    });
    setIsSchemeDialogOpen(true);
  };

  const handleDeleteScheme = async (id: number) => {
    try {
      const { error } = await supabase
        .from('grading_schemes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Deleted Successfully',
        description: 'Grading scheme has been deleted.',
      });
      
      loadGradingSchemes();
      setDeleteSchemeId(null);
    } catch (error) {
      console.error('Error deleting grading scheme:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete grading scheme.',
      });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage subject templates for all students</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTemplate(null)} className="bg-brand-primary hover:bg-brand-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add New Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Subject Template' : 'Add New Subject Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject Name</label>
                <Input
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  placeholder="Enter subject name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Credits</label>
                <Input
                  type="number"
                  value={formData.default_credits}
                  onChange={(e) => setFormData({ ...formData, default_credits: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="10"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Year</label>
                  <Select value={formData.year.toString()} onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}>
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
                  <Select value={formData.semester.toString()} onValueChange={(v) => setFormData({ ...formData, semester: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2].map(s => (
                        <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <Select value={formData.branch} onValueChange={(v) => setFormData({ ...formData, branch: v })}>
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-primary hover:bg-brand-primary/90">
                  {editingTemplate ? 'Update' : 'Add'} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.subject_name}</TableCell>
                    <TableCell>{template.default_credits}</TableCell>
                    <TableCell>Year {template.year}</TableCell>
                    <TableCell>Semester {template.semester}</TableCell>
                    <TableCell>{template.branch}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="h-8 w-8 p-0 text-danger hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No subject templates found. Add your first template to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;