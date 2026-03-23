import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { signIn, checkUserHasHousehold } from '../lib/auth';
import { signInWithOAuth, type OAuthProvider } from '../lib/auth/oauth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setError('Please enter your password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    try {
      setLoading(true);
      await signIn({ email, password });

      const hasHousehold = await checkUserHasHousehold();

      if (hasHousehold) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding/household');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else {
        setError(err.message || 'Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setError(null);
    try {
      setOauthLoading(provider);
      await signInWithOAuth(provider);
    } catch (err: any) {
      console.error(`${provider} sign in error:`, err);
      setError(err.message || `Failed to sign in with ${provider}. Please try again.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <LogIn size={32} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Log in to your SharedMinds account</p>
          </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
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
                  Logging In...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Log In
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading || oauthLoading !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 size={20} className="animate-spin text-gray-600" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>

              <button
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading || oauthLoading !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 size={20} className="animate-spin text-gray-600" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">Apple</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/auth/reset"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
