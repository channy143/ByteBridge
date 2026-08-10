import { useState, useEffect, useRef } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, User, ShieldCheck, X } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import { homePathFor } from '../utils/roles';

export default function Login() {
  const { signInAsTeacher, signInAsStudent, signInAsAdmin, registerTeacher, user, profile, loading } = useAuth();
  const location = useLocation();
  const navigatedRole = location.state?.role;

  const [role, setRole] = useState(() => {
    if (navigatedRole) {
      localStorage.setItem('bytebridge_role', navigatedRole);
      return navigatedRole;
    }
    return localStorage.getItem('bytebridge_role') || 'student';
  });
  const [studentForm, setStudentForm] = useState({ studentId: '', birthdate: '' });
  const [teacherForm, setTeacherForm] = useState({ fullName: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  // Teacher self-registration (open by design — the admin assigns subjects
  // after the account exists).
  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [regError, setRegError] = useState('');
  const [regSaving, setRegSaving] = useState(false);

  // Hidden admin login: press CTRL + A, then T + A. No visible hint.
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const seqRef = useRef({ keys: [], timer: null });

  useEffect(() => {
    const resetSeq = () => {
      if (seqRef.current.timer) clearTimeout(seqRef.current.timer);
      seqRef.current = { keys: [], timer: null };
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        resetSeq();
        setAdminOpen(false);
        return;
      }

      const k = e.key.toLowerCase();
      if (e.ctrlKey && k === 'a') {
        // CTRL + A arms the sequence
        e.preventDefault();
        resetSeq();
        seqRef.current.keys = ['a'];
        seqRef.current.timer = setTimeout(resetSeq, 4000);
        return;
      }

      const next = [...seqRef.current.keys, k];
      if (next.length > 3) {
        resetSeq();
        return;
      }
      if (next[0] !== 'a') return;
      if (['t', 'a'].slice(0, next.length - 1).join('') !== next.slice(0, next.length - 1).join('')) {
        resetSeq();
        return;
      }
      seqRef.current.keys = next;
      if (next[0] === 'a' && next[1] === 't' && next[2] === 'a') {
        resetSeq();
        setAdminOpen(true);
        setAdminError('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      resetSeq();
    };
  }, []);

  // Wait for auth to finish loading before redirecting automatically
  if (!loading) {
    // Already logged in with a profile → go where they came from (or their role home)
    if (user && profile) {
      const from = location.state?.from;
      return <Navigate to={from && from !== '/login' ? from : homePathFor(profile)} replace />;
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
      // The login page auto-redirects to the role home once the session AND
      // the profile are loaded, which prevents the white-screen flash.
    } catch (err) {
      setError(err.message || 'Login failed. Please check your Student ID and birthday.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoadingLocal(true);

    try {
      const { error: signInError } = await signInAsTeacher(
        teacherForm.fullName,
        teacherForm.password
      );
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Invalid teacher credentials. Please check your name and password.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    setRegError('');
    if (regForm.password !== regForm.confirm) {
      setRegError('Passwords do not match.');
      return;
    }
    setRegSaving(true);
    try {
      await registerTeacher(regForm.fullName, regForm.email, regForm.password);
      setTeacherForm({ fullName: regForm.fullName.trim(), password: '' });
      setRegOpen(false);
      setRegForm({ fullName: '', email: '', password: '', confirm: '' });
      setNotice('Teacher account created. Sign in with your name and password.');
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegSaving(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    try {
      const { error: signInError } = await signInAsAdmin(adminForm.email, adminForm.password);
      if (signInError) throw signInError;
      setAdminOpen(false);
      // Auto-redirects to /admin once the profile is loaded.
    } catch (err) {
      setAdminError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  const switchRole = (nextRole) => {
    setRole(nextRole);
    localStorage.setItem('bytebridge_role', nextRole);
    setError('');
    setNotice('');
    setRegOpen(false);
  };

  return (
    <AuthLayout>
      <>
        {/* Branding */}
        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">ByteBridge</h1>
        <p className="mt-1 text-[13px] font-semibold text-primary-700">BTLED ICT Educational Portal</p>
        <p className="mt-3 text-[13px] text-slate-500 leading-relaxed">
          Learn, teach, collaborate, and keep track of your academic progress in one place.
        </p>

        {/* Role selector */}
        <div className="mt-7 mb-6 grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-xl">
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

        {error && (
          <div className="mb-5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg px-4 py-3">
            {notice}
          </div>
        )}

        {role === 'student' ? (
          <form className="space-y-5" onSubmit={handleStudentSubmit}>
            <h2 className="text-lg font-bold text-slate-900">Student Access</h2>

            <AuthInput
              label="Student ID Number"
              type="text"
              required
              placeholder="Enter your student ID"
              value={studentForm.studentId}
              onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
            />

            <AuthInput
              label="Birthdate"
              type="date"
              required
              value={studentForm.birthdate}
              onChange={(e) => setStudentForm({ ...studentForm, birthdate: e.target.value })}
            />

            <AuthButton loading={loadingLocal} loadingText="Signing In...">
              Access Student Portal
            </AuthButton>

            <p className="text-[12.5px] text-slate-400">
              Student access is available to enrolled BTLED ICT students.
            </p>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                state={{ from: location.state?.from, role }}
                className="font-semibold text-primary-900 hover:text-primary-700 transition-colors"
              >
                Create one
              </Link>
            </p>
          </form>
        ) : regOpen ? (
          <form className="space-y-5" onSubmit={handleRegisterTeacher}>
            <h2 className="text-lg font-bold text-slate-900">Register as a Teacher</h2>

            <AuthInput
              label="Full Name"
              type="text"
              required
              placeholder="Enter your full name"
              value={regForm.fullName}
              onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
            />
            <AuthInput
              label="Email Address"
              type="email"
              required
              placeholder="you@bytebridge.edu"
              value={regForm.email}
              onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
            />
            <AuthInput
              label="Password"
              type="password"
              required
              placeholder="Create a password"
              value={regForm.password}
              onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
            />
            <AuthInput
              label="Confirm Password"
              type="password"
              required
              placeholder="Re-enter your password"
              value={regForm.confirm}
              onChange={(e) => setRegForm({ ...regForm, confirm: e.target.value })}
            />

            {regError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-[13px] rounded-lg px-3.5 py-2.5">
                {regError}
              </div>
            )}

            <AuthButton loading={regSaving} loadingText="Creating Account...">
              Create Teacher Account
            </AuthButton>

            <p className="text-[12.5px] text-slate-400">
              Your account will be created immediately. An administrator assigns your subjects
              before you can start managing classes.
            </p>

            <p className="text-center text-sm text-slate-500">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setRegOpen(false); setRegError(''); }}
                className="font-semibold text-primary-900 hover:text-primary-700 transition-colors"
              >
                Back to sign in
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleTeacherSubmit}>
            <h2 className="text-lg font-bold text-slate-900">Teacher Access</h2>

            <AuthInput
              label="Teacher Name"
              type="text"
              required
              placeholder="Enter your full name"
              value={teacherForm.fullName}
              onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
            />

            <AuthInput
              label="Password"
              type="password"
              required
              placeholder="Enter your password"
              value={teacherForm.password}
              onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
            />

            <AuthButton loading={loadingLocal} loadingText="Signing In...">
              Access Teacher Portal
            </AuthButton>

            <p className="text-[12.5px] text-slate-400">
              Use the account password set for you (or chosen at registration).
            </p>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setRegOpen(true); setRegError(''); }}
                className="font-semibold text-primary-900 hover:text-primary-700 transition-colors"
              >
                Register as a teacher
              </button>
            </p>
          </form>
        )}

        {/* Hidden Admin Login (CTRL + A, then T + A) */}
        {adminOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setAdminOpen(false)}
            />
            <div className="relative w-full max-w-[400px] bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 rounded-lg bg-primary-900 flex items-center justify-center">
                    <ShieldCheck className="h-4.5 w-4.5 text-white" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight">Administrator Access</h3>
                    <p className="text-[11.5px] text-slate-400">Restricted area — authorized personnel only.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {adminError && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-[13px] rounded-lg px-3.5 py-2.5">
                  {adminError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleAdminSubmit}>
                <AuthInput
                  label="Admin Email / Username"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@bytebridge.edu"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
                <AuthInput
                  label="Password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
                <AuthButton loading={adminLoading} loadingText="Signing In...">
                  Sign In
                </AuthButton>
              </form>
            </div>
          </div>
        )}
      </>
    </AuthLayout>
  );
}