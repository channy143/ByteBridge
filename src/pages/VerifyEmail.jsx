import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout, Mail, CheckCircle, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Layout className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify Your Email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100 text-center">
          
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <Mail className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Account Created Successfully!
          </h3>

          <p className="text-sm text-slate-600 mb-2">
            Please check your email and click the verification link to activate your account.
          </p>

          {email && (
            <p className="text-sm text-slate-500 mb-6">
              We sent a verification link to: <br />
              <span className="font-medium text-slate-800">{email}</span>
            </p>
          )}

          {!email && (
            <p className="text-sm text-slate-500 mb-6">
              Please verify your email before accessing your account.
            </p>
          )}

          {resendMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              resendMessage.includes('sent') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resendMessage}
            </div>
          )}

          <div className="space-y-3">
            {email && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}

            <Link
              to="/login"
              onClick={handleBackToLogin}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
