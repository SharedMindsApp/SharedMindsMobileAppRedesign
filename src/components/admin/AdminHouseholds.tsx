import { useEffect, useState } from 'react';
import { Home, Users, AlertCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getHouseholds, Household } from '../../lib/admin';

export function AdminHouseholds() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHouseholds({ limit: 100 });
      setHouseholds(data.households || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Household Management</h1>
          <p className="text-gray-600">View and manage all households</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading households...</div>
          ) : households.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No households found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {households.map((household) => {
                const memberCount = household.members?.[0]?.count || 0;
                return (
                  <div
                    key={household.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                        <Home size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{household.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(household.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Users size={16} />
                          Members
                        </span>
                        <span className="font-semibold text-gray-900">
                          {memberCount} / {household.member_limit}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((memberCount / household.member_limit) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>

                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          ID: {household.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
