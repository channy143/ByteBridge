import { useAuth } from '../contexts/AuthContext';
import { LogOut, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import TeacherDashboard from '../components/dashboard/TeacherDashboard';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile?.role === 'student' && <StudentDashboard profile={profile} />}
        {profile?.role === 'teacher' && <TeacherDashboard profile={profile} />}
        {!profile && (
           <div className="text-center py-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
             <p className="mt-4 text-slate-600">Loading your dashboard...</p>
           </div>
        )}
      </main>
    </div>
  );
}
