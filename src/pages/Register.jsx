import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';
import { formatAuthError } from '../utils/formatError';

export default function Register() {
  const [form, setForm] = useState({
    studentId: '',
    fullName: '',
    birthdate: '',
    courseYearSection: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, profile, loading: authLoading, signUp } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';
  const role = location.state?.role || 'student';

  // Already logged in with a profile → go where they were headed.
  // Waiting for the profile prevents a white-screen/login-page flash.
  if (!authLoading && user && profile) {
    return <Navigate to={from} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});

    if (!form.birthdate) {
      setErrors({ birthdate: 'Birthday is required.' });
      return;
    }
    if (!form.courseYearSection.trim()) {
      setErrors({ courseYearSection: 'Course Year and Section is required.' });
      return;
    }

    setLoading(true);

    try {
      // Use birthdate as the password (consistent with student login)
      const password = form.birthdate;

      const { error: signUpError } = await signUp(
        form.email.trim(),
        password,
        {
          student_id: form.studentId.trim(),
          full_name: form.fullName.trim(),
          birthdate: form.birthdate,
          course_year_section: form.courseYearSection.trim(),
          role: 'student'
        }
      );

      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
          throw new Error('This email address is already registered. Please log in instead.');
        }
        throw new Error(signUpError.message || 'Failed to create account. Please try again.');
      }

      // Success — account created. The profile + official student record are
      // auto-created in AuthContext on session.

    } catch (err) {
      setError(formatAuthError(err, 'student_register'));
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = (title) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="h-[2px] w-5 bg-primary-600 rounded-full"></span>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">{title}</h3>
    </div>
  );

  return (
    <AuthLayout>
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Your Account</h1>
      <p className="mt-0.5 text-xs text-slate-500">Register as a ByteBridge student</p>
      <p className="mt-1 text-[11.5px] text-slate-400 leading-relaxed">
        Create an account to start learning and collaborating on ByteBridge.
      </p>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-md px-3 py-2 flex items-start">
          <AlertCircle className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-3.5" onSubmit={handleSubmit}>
        {/* Student Information */}
        <div className="pb-3 border-b border-slate-100">
          {sectionLabel('Student Information')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
            <AuthInput
              label="Student ID"
              name="studentId"
              required
              placeholder="e.g. 2024-0001"
              value={form.studentId}
              onChange={handleChange}
              disabled={loading}
              error={errors.studentId}
            />
            <AuthInput
              label="Full Name"
              name="fullName"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={form.fullName}
              onChange={handleChange}
              disabled={loading}
              error={errors.fullName}
            />
            <AuthInput
              label="Birthday"
              name="birthdate"
              type="date"
              required
              value={form.birthdate}
              onChange={handleChange}
              disabled={loading}
              error={errors.birthdate}
            />
            <AuthInput
              label="Course Year and Section"
              name="courseYearSection"
              required
              placeholder="e.g. BTLED ICT 1-A"
              value={form.courseYearSection}
              onChange={handleChange}
              disabled={loading}
              error={errors.courseYearSection}
            />
          </div>
        </div>

        {/* Account Credentials */}
        <div className="pt-3">
          {sectionLabel('Account Credentials')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
            <AuthInput
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="student@email.com"
              className="sm:col-span-2"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              error={errors.email}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            You will sign in using your Student ID Number, Birthday, and Course Year & Section.
          </p>
        </div>

        <div className="mt-3.5">
          <AuthButton loading={loading} loadingText="Creating Account...">
            Create Account
          </AuthButton>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" state={{ from, role }} className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
