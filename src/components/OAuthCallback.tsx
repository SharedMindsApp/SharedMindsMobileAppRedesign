import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureProfileExists, isNewUser } from '../lib/auth/oauth';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          navigate('/auth/login');
          return;
        }

        const userId = session.user.id;
        const email = session.user.email || '';
        const metadata = session.user.user_metadata;

        await ensureProfileExists(userId, email, metadata);

        const shouldOnboard = await isNewUser(userId);

        if (shouldOnboard) {
          navigate('/onboarding/household');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing Sign In</h1>
            <p className="text-gray-600">Please wait while we set up your account...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
