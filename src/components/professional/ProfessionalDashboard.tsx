import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Home, Plus, Loader2, Shield, TrendingUp } from 'lucide-react';
import { getProfessionalHouseholds, ProfessionalHousehold } from '../../lib/professional';

export function ProfessionalDashboard() {
  const [households, setHouseholds] = useState<ProfessionalHousehold[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ProfessionalHousehold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getProfessionalHouseholds();
      setHouseholds(data.households);
      setPendingRequests(data.pendingRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load households');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Professional Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your client households</p>
        </div>
        <button
          onClick={() => navigate('/professional/request-access')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Request Access
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{households.length}</p>
              <p className="text-sm text-gray-600">Active Households</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{pendingRequests.length}</p>
              <p className="text-sm text-gray-600">Pending Requests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-teal-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {households.reduce((sum, h) => sum + (h.memberCount || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Total Members</p>
            </div>
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock size={24} className="text-amber-600" />
              Pending Access Requests
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{request.households.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested {new Date(request.requested_at).toLocaleDateString()} • Access
                      Level: {request.access_level === 'summary' ? 'Summary' : 'Full Insights'}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                    Awaiting Approval
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Home size={24} className="text-blue-600" />
            My Households
          </h2>
        </div>
        {households.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Households Yet</h3>
            <p className="text-gray-600 mb-6">
              Request access to a household to start monitoring insights and supporting families.
            </p>
            <button
              onClick={() => navigate('/professional/request-access')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Request Access
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {households.map((household) => (
              <div
                key={household.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/professional/households/${household.household_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {household.households.name}
                      </h3>
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {household.access_level === 'summary' ? 'Summary' : 'Full Insights'}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{household.memberCount || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={16} />
                        <span>
                          Approved {new Date(household.approved_at || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-600 font-medium">View Details →</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
