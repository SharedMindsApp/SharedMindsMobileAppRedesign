import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../lib/auth';

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    try {
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <KeyRound size={32} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">
              Enter your email and we'll send you a link to reset your password
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-800 font-medium mb-1">Reset link sent!</p>
                  <p className="text-sm text-green-700">
                    Check your email for instructions to reset your password.
                  </p>
                </div>
              </div>

              <Link
                to="/auth/login"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
              >
                <ArrowLeft size={20} />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-base disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
