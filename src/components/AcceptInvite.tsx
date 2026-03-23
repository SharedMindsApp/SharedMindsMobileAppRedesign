import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../core/auth/AuthProvider';
import { acceptHouseholdInvite } from '../lib/household';

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [householdName, setHouseholdName] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link. Please check your email for the correct link.');
      return;
    }

    if (!user) {
      sessionStorage.setItem('inviteToken', token);
      navigate('/login?redirect=accept-invite');
      return;
    }

    acceptInvite();
  }, [user, token]);

  async function acceptInvite() {
    if (!token) return;

    try {
      const result = await acceptHouseholdInvite(token);
      setStatus('success');
      setHouseholdName(result.household.name);
      setMessage(result.message || 'Successfully joined household');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to accept invite');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader className="animate-spin text-blue-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Accepting Invite</h2>
              <p className="text-gray-600">Please wait while we process your invitation...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {householdName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-900">
                    You've joined <span className="font-bold">{householdName}</span>
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <XCircle className="text-red-600" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Error</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Go to Home
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@sharedmind.com" className="text-blue-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
