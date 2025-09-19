import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Save, User } from 'lucide-react';

const Profile = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    enrollment_no: '',
    college_name: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        enrollment_no: profile.enrollment_no || '',
        college_name: profile.college_name || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-brand-primary" />
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <label htmlFor="full_name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="enrollment_no" className="text-sm font-medium">
                Enrollment Number
              </label>
              <Input
                id="enrollment_no"
                value={formData.enrollment_no}
                onChange={(e) => handleInputChange('enrollment_no', e.target.value)}
                placeholder="Enter your enrollment number"
              />
            </div>

            <div>
              <label htmlFor="college_name" className="text-sm font-medium">
                College Name
              </label>
              <Input
                id="college_name"
                value={formData.college_name}
                onChange={(e) => handleInputChange('college_name', e.target.value)}
                placeholder="Enter your college name"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-brand-primary hover:bg-brand-primary/90"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Account Type:</span>
            <span className="text-sm text-muted-foreground capitalize">
              {profile?.role || 'Student'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Member Since:</span>
            <span className="text-sm text-muted-foreground">
              {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;