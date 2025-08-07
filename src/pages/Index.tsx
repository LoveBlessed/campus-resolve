import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, LogOut, User } from 'lucide-react';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import ComplaintForm from '@/components/forms/ComplaintForm';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show complaint form if student wants to submit
  if (showComplaintForm && profile?.role === 'student') {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <ComplaintForm
          onBack={() => setShowComplaintForm(false)}
          onSuccess={() => setShowComplaintForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-primary">Student Complaint System</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.role === 'admin' ? 'Admin Dashboard' : 'Student Dashboard'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.role === 'admin' ? 'Administrator' : `Student ID: ${profile?.student_id}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {profile?.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <StudentDashboard onSubmitComplaint={() => setShowComplaintForm(true)} />
        )}
      </main>
    </div>
  );
};

export default Index;
