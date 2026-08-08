import { useState } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, User } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';

export default function Login() {
  const { signInAsTeacher, signInAsStudent, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';
  const navigatedRole = location.state?.role;

  const [role, setRole] = useState(() => {
    if (navigatedRole) {
      localStorage.setItem('bytebridge_role', navigatedRole);
      return navigatedRole;
    }
    return localStorage.getItem('bytebridge_role') || 'student';
  });
  const [studentForm, setStudentForm] = useState({ studentId: '', birthdate: '' });
  const [teacherForm, setTeacherForm] = useState({ fullName: '', subjectCode: '' });
  const [error, setError] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  // Wait for auth to finish loading before redirecting automatically
  if (!loading) {
    // Already logged in with a profile → go where they came from (or the dashboard)
    if (user && profile) {
      return <Navigate to={from} replace />;
    }
  }

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingLocal(true);

    try {
      const { error: signInError } = await signInAsStudent(
        studentForm.studentId,
        studentForm.birthdate
      );
      if (signInError) throw signInError;
      navigate(from);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your Student ID and birthday.');
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
      navigate(from);
    } catch (err) {
      setError('Invalid teacher credentials. Please check your name and subject code.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const switchRole = (nextRole) => {
    setRole(nextRole);
    localStorage.setItem('bytebridge_role', nextRole);
    setError('');
  };

  return (
    <AuthLayout>
      <>
        {/* Role selector */}
          <div className="mb-8 grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => switchRole('student')}
              className={`h-11 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                role === 'student'
                  ? 'bg-white text-primary-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>
            <button
              type="button"
              onClick={() => switchRole('teacher')}
              className={`h-11 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                role === 'teacher'
                  ? 'bg-white text-primary-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              Teacher
            </button>
          </div>

          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-500">
            {role === 'student' ? 'Sign in to your student account' : 'Sign in to your teacher account'}
          </p>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {role === 'student' ? (
            <form className="mt-8 space-y-5" onSubmit={handleStudentSubmit}>
              <AuthInput
                label="Student ID"
                type="text"
                required
                placeholder="e.g. 2024-0001"
                value={studentForm.studentId}
                onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
              />

              <AuthInput
                label="Birthday"
                type="date"
                required
                value={studentForm.birthdate}
                onChange={(e) => setStudentForm({ ...studentForm, birthdate: e.target.value })}
              />

              <AuthButton loading={loadingLocal} loadingText="Signing In...">
                Sign In
              </AuthButton>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleTeacherSubmit}>
              <AuthInput
                label="Full Name"
                type="text"
                required
                placeholder="e.g. John Smith"
                value={teacherForm.fullName}
                onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
              />

              <AuthInput
                label="Subject Code"
                type="text"
                required
                placeholder="e.g. ICT 101"
                value={teacherForm.subjectCode}
                onChange={(e) => setTeacherForm({ ...teacherForm, subjectCode: e.target.value })}
              />

              <AuthButton loading={loadingLocal} loadingText="Signing In...">
                Sign In as Teacher
              </AuthButton>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            {role === 'student' ? (
              <>
                Don't have an account?{' '}
                <Link to="/register" state={{ from, role }} className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link to="/register-teacher" state={{ from, role }} className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
                  Create one
                </Link>
              </>
            )}
          </p>
      </>
    </AuthLayout>
  );
}
