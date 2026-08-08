import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, User } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';

export default function Login() {
  const [role, setRole] = useState('student');
  const [studentForm, setStudentForm] = useState({ email: '', password: '' });
  const [teacherForm, setTeacherForm] = useState({ fullName: '', subjectCode: '' });
  const [remember, setRemember] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState('');
  const [error, setError] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  const { signIn, signInAsTeacher, resetPassword, user, emailConfirmed, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Prefill remembered email
  useEffect(() => {
    const saved = localStorage.getItem('bytebridge_email');
    if (saved) {
      setStudentForm(f => ({ ...f, email: saved }));
      setRemember(true);
    }
  }, []);

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

      // Persist the remembered email
      if (remember) {
        localStorage.setItem('bytebridge_email', studentForm.email.trim());
      } else {
        localStorage.removeItem('bytebridge_email');
      }

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

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSent('');
    setLoadingLocal(true);

    const email = forgotEmail.trim() || studentForm.email.trim();
    if (!email) {
      setError('Please enter your email address.');
      setLoadingLocal(false);
      return;
    }

    try {
      const { error: forgotError } = await resetPassword(email);
      if (forgotError) throw forgotError;
      setForgotSent('Reset link sent! Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send the reset link. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const switchRole = (nextRole) => {
    setRole(nextRole);
    setError('');
    setShowForgot(false);
    setForgotSent('');
  };

  return (
    <AuthLayout>
      {showForgot ? (
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleForgot}>
            <AuthInput
              label="Email Address"
              type="email"
              required
              placeholder="student@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />

            {forgotSent && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                {forgotSent}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <AuthButton loading={loadingLocal} loadingText="Sending...">
              Send Reset Link
            </AuthButton>

            <button
              type="button"
              onClick={() => { setShowForgot(false); setError(''); setForgotSent(''); }}
              className="w-full text-center text-sm font-medium text-slate-500 hover:text-primary-900 transition-colors"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      ) : (
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
                label="Email Address"
                type="email"
                required
                placeholder="student@email.com"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              />

              <div>
                <AuthInput
                  label="Password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                />
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center text-sm text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    className="text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

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
                <Link to="/register" className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link to="/register-teacher" className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
                  Create one
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </AuthLayout>
  );
}
