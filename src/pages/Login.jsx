import { useState, useEffect } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, User, ShieldCheck, X } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import { homePathFor } from '../utils/roles';
import { formatAuthError } from '../utils/formatError';

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
  const [studentForm, setStudentForm] = useState({ studentId: '', birthdate: '', courseYearSection: '' });
  const [teacherForm, setTeacherForm] = useState({ fullName: '', subjectCode: '', courseYear: '1st Year' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  // Teacher self-registration
  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({ fullName: '', email: '', subjectCode: '', courseYear: '1st Year' });
  const [regError, setRegError] = useState('');
  const [regSaving, setRegSaving] = useState(false);

  // Hidden admin login: press CTRL + ALT + A. No visible hint.
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAdminOpen(false);
        setAdminError('');
        return;
      }

      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminOpen(true);
        setAdminError('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
        studentForm.birthdate,
        studentForm.courseYearSection
      );
      if (signInError) throw signInError;
      // The login page auto-redirects to the role home once the session AND
      // the profile are loaded, which prevents the white-screen flash.
    } catch (err) {
      setError(formatAuthError(err, 'student_login'));
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
        teacherForm.subjectCode,
        teacherForm.courseYear
      );
      if (signInError) throw signInError;
    } catch (err) {
      setError(formatAuthError(err, 'teacher_login'));
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.subjectCode.trim()) {
      setRegError('Please enter your assigned subject code.');
      return;
    }
    setRegSaving(true);
    try {
      await registerTeacher(regForm.fullName, regForm.email, regForm.subjectCode, regForm.courseYear);
      setTeacherForm({
        fullName: regForm.fullName.trim(),
        subjectCode: regForm.subjectCode.trim(),
        courseYear: regForm.courseYear,
      });
      setRegOpen(false);
      setRegForm({ fullName: '', email: '', subjectCode: '', courseYear: '1st Year' });
      setNotice('Teacher account created. Sign in with your name, subject code, and course year.');
    } catch (err) {
      setRegError(formatAuthError(err, 'teacher_register'));
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
      setAdminError(formatAuthError(err, 'admin_login'));
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">ByteBridge</h1>
        <p className="text-[12px] font-semibold text-primary-700">BTLED ICT Educational Portal</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Learn, teach, collaborate, and track your academic progress in one place.
        </p>

        {/* Role selector */}
        <div className="mt-3.5 mb-3.5 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => switchRole('student')}
            className={`h-8 rounded-md text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              role === 'student'
                ? 'bg-white text-primary-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </button>
          <button
            type="button"
            onClick={() => switchRole('teacher')}
            className={`h-8 rounded-md text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              role === 'teacher'
                ? 'bg-white text-primary-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Teacher
          </button>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-md px-3 py-2">
            {notice}
          </div>
        )}

        {role === 'student' ? (
          <form className="space-y-3" onSubmit={handleStudentSubmit}>
            <h2 className="text-[14px] font-bold text-slate-900">Student Access</h2>

            <AuthInput
              label="Student ID Number"
              type="text"
              required
              placeholder="e.g. 2024-0001"
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

            <AuthInput
              label="Course Year and Section"
              type="text"
              required
              placeholder="e.g. BTLED ICT 1-A"
              value={studentForm.courseYearSection}
              onChange={(e) => setStudentForm({ ...studentForm, courseYearSection: e.target.value })}
            />

            <div className="pt-1">
              <AuthButton loading={loadingLocal} loadingText="Signing In...">
                Access Student Portal
              </AuthButton>
            </div>

            <p className="text-[11.5px] text-slate-400">
              Student access is available to enrolled BTLED ICT students.
            </p>

            <p className="text-center text-xs text-slate-500 pt-1">
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
          <form className="space-y-3" onSubmit={handleRegisterTeacher}>
            <h2 className="text-[14px] font-bold text-slate-900">Register as a Teacher</h2>

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
              label="Subject Code"
              type="text"
              required
              placeholder="e.g. ICT 101"
              value={regForm.subjectCode}
              onChange={(e) => setRegForm({ ...regForm, subjectCode: e.target.value })}
            />
            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Course Year
              </label>
              <select
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 shadow-sm transition-colors outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                value={regForm.courseYear}
                onChange={(e) => setRegForm({ ...regForm, courseYear: e.target.value })}
                required
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            {regError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs rounded-md px-3 py-2">
                {regError}
              </div>
            )}

            <div className="pt-1">
              <AuthButton loading={regSaving} loadingText="Creating Account...">
                Create Teacher Account
              </AuthButton>
            </div>

            <p className="text-center text-xs text-slate-500 pt-1">
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
          <form className="space-y-3" onSubmit={handleTeacherSubmit}>
            <h2 className="text-[14px] font-bold text-slate-900">Teacher Access</h2>

            <AuthInput
              label="Teacher Full Name"
              type="text"
              required
              placeholder="Enter your full name"
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

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1">
                Course Year
              </label>
              <select
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 shadow-sm transition-colors outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                value={teacherForm.courseYear}
                onChange={(e) => setTeacherForm({ ...teacherForm, courseYear: e.target.value })}
                required
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="pt-1">
              <AuthButton loading={loadingLocal} loadingText="Signing In...">
                Access Teacher Portal
              </AuthButton>
            </div>

            <p className="text-[11.5px] text-slate-400">
              Sign in with your full name, assigned subject code, and course year.
            </p>

            <p className="text-center text-xs text-slate-500 pt-1">
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

        {/* Hidden Admin Login (CTRL + ALT + A) */}
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