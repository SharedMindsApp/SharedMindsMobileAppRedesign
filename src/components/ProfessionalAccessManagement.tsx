import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Clock, Check, X, Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import { getUserHousehold, Household } from '../lib/household';
import { getHouseholdProfessionals, manageProfessionalAccess, ProfessionalAccess } from '../lib/professional';

export function ProfessionalAccessManagement() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const householdData = await getUserHousehold();

      if (!householdData) {
        navigate('/onboarding/household');
        return;
      }

      setHousehold(householdData);
      const professionalsList = await getHouseholdProfessionals(householdData.id);
      setProfessionals(professionalsList);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load professional access data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    professionalId: string,
    action: 'approve' | 'deny' | 'revoke' | 'change_level',
    accessLevel?: 'summary' | 'full_insights'
  ) {
    if (!household) return;

    try {
      setProcessingId(professionalId);
      setError(null);
      setSuccess(null);

      const result = await manageProfessionalAccess(
        household.id,
        professionalId,
        action,
        accessLevel
      );

      setSuccess(result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} access`);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const pendingProfessionals = professionals.filter((p) => p.status === 'pending');
  const approvedProfessionals = professionals.filter((p) => p.status === 'approved');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Professional Access</h1>
          <p className="text-gray-600">Manage which professionals can view your household insights</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
          <X className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={20} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start gap-3">
          <Check className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">Success</p>
            <p className="text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Privacy & Security</p>
            <p>
              Professionals can only see summary insights or full insights based on the access
              level you grant. Raw questionnaire answers are never shared. You can revoke access
              at any time.
            </p>
          </div>
        </div>
      </div>

      {pendingProfessionals.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock size={24} className="text-amber-600" />
              Pending Requests ({pendingProfessionals.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingProfessionals.map((prof: any) => (
              <div key={prof.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {prof.profiles?.full_name || 'Professional'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {prof.profiles?.email}
                    </p>
                    {prof.profiles?.professional_type && (
                      <p className="text-sm text-gray-600">
                        {prof.profiles.professional_type}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Requested {new Date(prof.requested_at).toLocaleDateString()} • Access
                      Level: {prof.access_level === 'summary' ? 'Summary' : 'Full Insights'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(prof.professional_id, 'approve')}
                    disabled={processingId === prof.professional_id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {processingId === prof.professional_id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(prof.professional_id, 'deny')}
                    disabled={processingId === prof.professional_id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    <X size={18} />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-green-600" />
            Approved Professionals ({approvedProfessionals.length})
          </h2>
        </div>
        {approvedProfessionals.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Professionals</h3>
            <p className="text-gray-600">
              When professionals request access, they'll appear here for you to review and approve.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {approvedProfessionals.map((prof: any) => (
              <div key={prof.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {prof.profiles?.full_name || 'Professional'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{prof.profiles?.email}</p>
                    {prof.profiles?.professional_type && (
                      <p className="text-sm text-gray-600">{prof.profiles.professional_type}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                        Active
                      </div>
                      <div className="text-xs text-gray-500">
                        Approved {new Date(prof.approved_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <select
                    value={prof.access_level}
                    onChange={(e) =>
                      handleAction(
                        prof.professional_id,
                        'change_level',
                        e.target.value as 'summary' | 'full_insights'
                      )
                    }
                    disabled={processingId === prof.professional_id}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="summary">Summary Access</option>
                    <option value="full_insights">Full Insights Access</option>
                  </select>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to revoke access for this professional?')) {
                        handleAction(prof.professional_id, 'revoke');
                      }
                    }}
                    disabled={processingId === prof.professional_id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
