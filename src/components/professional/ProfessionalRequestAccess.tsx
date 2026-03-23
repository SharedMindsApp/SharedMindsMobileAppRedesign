import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { requestProfessionalAccess } from '../../lib/professional';

export function ProfessionalRequestAccess() {
  const [householdId, setHouseholdId] = useState('');
  const [accessLevel, setAccessLevel] = useState<'summary' | 'full_insights'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!householdId.trim()) {
      setError('Please enter a household ID');
      return;
    }

    try {
      setLoading(true);
      const result = await requestProfessionalAccess(householdId.trim(), accessLevel);
      setSuccess(true);
      setHouseholdId('');
      setTimeout(() => {
        navigate('/professional/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request access');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/professional/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Household Access</h1>
          <p className="text-gray-600">Request permission to view a household's insights</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter the household ID provided by your client</li>
              <li>Choose your desired access level</li>
              <li>The household owner will review and approve your request</li>
              <li>Once approved, you can view insights based on the granted access level</li>
            </ol>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
          <p className="font-medium">Request Sent!</p>
          <p className="text-sm">
            Your access request has been sent to the household owner. You'll be notified when
            they approve it.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="householdId" className="block text-sm font-medium text-gray-700 mb-2">
            Household ID
          </label>
          <input
            id="householdId"
            type="text"
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            placeholder="Enter the household ID from your client"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-2">
            Ask your client to provide their household ID from Settings
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Access Level
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
              <input
                type="radio"
                name="accessLevel"
                value="summary"
                checked={accessLevel === 'summary'}
                onChange={(e) => setAccessLevel(e.target.value as 'summary' | 'full_insights')}
                className="mt-1"
                disabled={loading}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Summary Access</p>
                <p className="text-sm text-gray-600 mt-1">
                  View Harmony Profile, Action Plan, and aggregated charts. Best for general
                  support and monitoring.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
              <input
                type="radio"
                name="accessLevel"
                value="full_insights"
                checked={accessLevel === 'full_insights'}
                onChange={(e) => setAccessLevel(e.target.value as 'summary' | 'full_insights')}
                className="mt-1"
                disabled={loading}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Full Insights Access</p>
                <p className="text-sm text-gray-600 mt-1">
                  Access to detailed friction points, perception gaps, and comprehensive analysis.
                  Best for therapeutic work and in-depth support.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>Privacy Guarantee:</strong> Raw questionnaire answers are never exposed. You'll
            only see processed insights based on the access level granted by the household.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !householdId.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Home size={20} />
              Request Access
            </>
          )}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Where do I get the household ID?</strong>
            <br />
            Ask your client to find their household ID in Settings. They can share it with you
            securely.
          </p>
          <p>
            <strong>How long does approval take?</strong>
            <br />
            The household owner will receive your request immediately. Approval time depends on
            when they review it.
          </p>
          <p>
            <strong>Can I change the access level later?</strong>
            <br />
            Yes, you can request a change, but it requires household owner approval.
          </p>
        </div>
      </div>
    </div>
  );
}
