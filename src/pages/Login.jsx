import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout, User, GraduationCap } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('student');
  const [studentForm, setStudentForm] = useState({ email: '', password: '' });
  const [teacherForm, setTeacherForm] = useState({ fullName: '', subjectCode: '' });
  const [error, setError] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  
  const { signIn, signInAsTeacher, user, emailConfirmed, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Wait for auth to finish loading before redirecting automatically
  if (!loading) {
    // Already logged in, verified, and has a profile → go to dashboard
    if (user && emailConfirmed && profile) {
      return <Navigate to="/dashboard" replace />;
    }

    // Logged in but not verified → go to verify
    if (user && !emailConfirmed) {
      return <Navigate to="/verify-email" replace />;
    }
  }

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLocal(true);

    try {
      const { data, error: signInError } = await signIn(
        studentForm.email,
        studentForm.password
      );
      if (signInError) throw signInError;

      // Check if email is confirmed
      if (!data?.user?.email_confirmed_at) {
        navigate('/verify-email');
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('Email not confirmed')) {
        navigate('/verify-email');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLocal(true);

    try {
      const { error: signInError } = await signInAsTeacher(
        teacherForm.fullName,
        teacherForm.subjectCode
      );
      if (signInError) throw signInError;
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid teacher credentials. Please check your name and subject code.');
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Layout className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to ByteBridge
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Educational Portal for BTLED ICT Majors
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
          
          {/* Role Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              className={`flex-1 flex justify-center items-center py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('teacher'); setError(''); }}
              className={`flex-1 flex justify-center items-center py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              Teacher
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Student Form */}
          {role === 'student' && (
            <form className="space-y-5" onSubmit={handleStudentSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    placeholder="e.g. juan@email.com"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loadingLocal}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingLocal ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Teacher Form */}
          {role === 'teacher' && (
            <form className="space-y-5" onSubmit={handleTeacherSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={teacherForm.fullName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Subject Code</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICT 101"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={teacherForm.subjectCode}
                    onChange={(e) => setTeacherForm({ ...teacherForm, subjectCode: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Logging in...' : 'Sign in as Teacher'}
                </button>
              </div>
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
}
