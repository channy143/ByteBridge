import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, RefreshCw } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthButton from '../components/auth/AuthButton';

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || '';
  const { resendVerificationEmail, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    if (!email) {
      setResendMessage('Please go back to the registration page and try again.');
      return;
    }

    setResending(true);
    setResendMessage('');

    try {
      const { error } = await resendVerificationEmail(email);
      if (error) throw error;
      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (err) {
      setResendMessage(err.message || 'Failed to resend. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = async () => {
    // Sign out any partial session before going to login
    await signOut();
  };

  return (
    <AuthLayout showBack={false}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-7">
          <Mail className="w-8 h-8 text-primary-900" />
        </div>

        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">
          Verify Your Email
        </h1>

        <div className="mt-3 mx-auto w-12 h-[3px] bg-primary-600 rounded-full"></div>

        <p className="mt-5 text-sm text-slate-500 leading-relaxed">
          Account created successfully! Please check your email and click the verification link
          to activate your account.
        </p>

        {email ? (
          <p className="mt-3 text-sm text-slate-400">
            We sent a verification link to: <br />
            <span className="font-medium text-slate-800">{email}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Please verify your email before accessing your account.
          </p>
        )}

        {resendMessage && (
          <div className={`mt-6 p-3 rounded-lg text-sm text-left ${
            resendMessage.includes('sent')
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {resendMessage}
          </div>
        )}

        <div className="mt-9 space-y-3">
          {email && (
            <AuthButton
              variant="secondary"
              loading={resending}
              loadingText="Sending..."
              onClick={handleResend}
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              Resend Verification Email
            </AuthButton>
          )}

          <AuthButton onClick={handleBackToLogin}>
            Back to Login
          </AuthButton>
        </div>
      </div>
    </AuthLayout>
  );
}
