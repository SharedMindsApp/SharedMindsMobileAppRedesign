import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getAnalytics } from '../../lib/admin';

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading analytics...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const eventTypes = analytics?.eventsByType || {};
  const eventEntries = Object.entries(eventTypes).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">Monitor user activity and system usage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Total Users</h3>
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.summary?.totalUsers || 0}</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Free</span>
                <span className="font-semibold">{analytics?.summary?.freeUsers || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Premium</span>
                <span className="font-semibold">{analytics?.summary?.premiumUsers || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Admin</span>
                <span className="font-semibold">{analytics?.summary?.adminUsers || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Households</h3>
              <BarChart3 className="text-teal-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.summary?.totalHouseholds || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Active households</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">AI Reports</h3>
              <BarChart3 className="text-amber-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.summary?.totalReports || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Generated reports</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Event Activity</h2>

          {eventEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No events recorded yet</div>
          ) : (
            <div className="space-y-3">
              {eventEntries.map(([eventType, count]: [string, any]) => {
                const maxCount = Math.max(...Object.values(eventTypes) as number[]);
                const percentage = (count / maxCount) * 100;

                return (
                  <div key={eventType} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{eventType}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
          <p className="text-gray-700 mb-4">
            Advanced charts and visualizations coming soon. This section will include:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Daily active users timeline
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              Questionnaire completion rates
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              Report generation trends
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
              User retention metrics
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
