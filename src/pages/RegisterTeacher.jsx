import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthButton from '../components/auth/AuthButton';

export default function RegisterTeacher() {
  const [form, setForm] = useState({
    fullName: '',
    subjectCode: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, profile, loading: authLoading, signUp } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';
  const role = location.state?.role || 'teacher';

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

    if (!form.subjectCode) {
      setErrors({ subjectCode: 'Subject code is required.' });
      return;
    }

    setLoading(true);

    try {
      // Use the subject code (lowercase, no spaces) as the password, consistent with teacher login
      const password = form.subjectCode.trim().toLowerCase().replace(/\s+/g, '');

      // Create Supabase Auth account and save all metadata
      const { error: signUpError } = await signUp(
        form.email.trim(),
        password,
        {
          full_name: form.fullName.trim(),
          subject_code: form.subjectCode.trim(),
          role: 'teacher'
        }
      );

      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
          throw new Error('This email address is already registered. Please log in instead.');
        }
        throw new Error(signUpError.message || 'Failed to create account. Please try again.');
      }

      // Success — account created. No manual navigation here: the register
      // page redirects once the session AND the auto-created profile are
      // loaded, preventing a white-screen/login-page flash.
      // Confirmations are disabled, so no email step is needed.

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
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Teacher Account</h1>
      <p className="mt-1 text-sm text-slate-500">Register your teacher account</p>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
        Create your account to start managing courses and activities on ByteBridge.
      </p>

      {error && (
        <div className="mt-5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-6" onSubmit={handleSubmit}>
        {/* Teacher Information */}
        <div className="pb-5 border-b border-slate-100">
          {sectionLabel('Teacher Information')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
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
              label="Subject Code"
              name="subjectCode"
              required
              placeholder="e.g. ICT 101"
              value={form.subjectCode}
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
              placeholder="teacher@email.com"
              className="sm:col-span-2"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            You'll sign in using your Full Name and Subject Code (lowercase, no spaces) as the password — e.g. &quot;ICT 101&quot; becomes &quot;ict101&quot;.
          </p>
        </div>

        <div className="mt-6">
          <AuthButton loading={loading} loadingText="Creating Account...">
            Create Teacher Account
          </AuthButton>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" state={{ from, role }} className="font-semibold text-primary-900 hover:text-primary-700 transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
