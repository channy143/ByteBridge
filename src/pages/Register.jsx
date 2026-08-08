import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';

export default function Register() {
  const [form, setForm] = useState({
    studentId: '',
    fullName: '',
    birthdate: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, emailConfirmed, signUp } = useAuth();
  const navigate = useNavigate();

  // Already logged in and verified
  if (user && emailConfirmed) {
    return <Navigate to="/dashboard" replace />;
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

    // Frontend validations
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }
    if (form.password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);

    try {
      // Open registration: any student can create an account.
      // The profile + official student record are auto-created on first
      // login via the register_new_student RPC.

      // Create Supabase Auth account and save all metadata
      const { error: signUpError } = await signUp(
        form.email.trim(),
        form.password,
        {
          student_id: form.studentId.trim(),
          full_name: form.fullName.trim(),
          birthdate: form.birthdate,
          role: 'student'
        }
      );

      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
          throw new Error('This email address is already registered. Please log in instead.');
        }
        throw new Error(signUpError.message || 'Failed to create account. Please try again.');
      }

      // Success! Navigate to verification page
      // Profile auto-creation will happen in AuthContext when they log in for the first time
      navigate('/verify-email', { state: { email: form.email.trim() } });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = (title) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="h-[3px] w-6 bg-primary-600 rounded-full"></span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-800">{title}</h3>
    </div>
  );

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Your Account</h1>
      <p className="mt-1 text-sm text-slate-500">Register as a ByteBridge student</p>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
        Create an account to start learning and collaborating on ByteBridge.
      </p>

      {error && (
        <div className="mt-5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-6" onSubmit={handleSubmit}>
        {/* Student Information */}
        <div className="pb-5 border-b border-slate-100">
          {sectionLabel('Student Information')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <AuthInput
              label="Student ID"
              name="studentId"
              required
              placeholder="e.g. 2024-0001"
              value={form.studentId}
              onChange={handleChange}
              disabled={loading}
            />
            <AuthInput
              label="Full Name"
              name="fullName"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={form.fullName}
              onChange={handleChange}
              disabled={loading}
            />
            <AuthInput
              label="Birthday"
              name="birthdate"
              type="date"
              required
              className="sm:col-span-2"
              value={form.birthdate}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Account Credentials */}
        <div className="pt-5">
          {sectionLabel('Account Credentials')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
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
            />
            <AuthInput
              label="Password"
              name="password"
              type="password"
              required
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              error={errors.password}
            />
            <AuthInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              required
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              error={errors.confirmPassword}
            />
          </div>
        </div>

        <div className="mt-6">
          <AuthButton loading={loading} loadingText="Creating Account...">
            Create Account
          </AuthButton>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
