import { useEffect, useState } from 'react';
import { Users, Home, FileText, Activity, TrendingUp, AlertCircle, Layers, ArrowRight } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getAnalytics, AnalyticsSummary, AnalyticsEvent } from '../../lib/admin';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getAnalytics();
      setSummary(data.summary);
      setRecentEvents(data.recentEvents || []);
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
          <div className="text-gray-500">Loading dashboard...</div>
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
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: summary?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Free Users',
      value: summary?.freeUsers || 0,
      icon: Users,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
    },
    {
      label: 'Premium Users',
      value: summary?.premiumUsers || 0,
      icon: TrendingUp,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
    {
      label: 'Active Households',
      value: summary?.totalHouseholds || 0,
      icon: Home,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      label: 'Generated Reports',
      value: summary?.totalReports || 0,
      icon: FileText,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
    },
    {
      label: 'Admin Users',
      value: summary?.adminUsers || 0,
      icon: Activity,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor system metrics and user activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon size={24} className={stat.textColor} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <Link
          to="/admin/guardrails/project-types"
          className="block bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl border border-blue-600 p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                <Layers size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Guardrails Metadata</h2>
                <p className="text-blue-100 text-sm">Manage project types, templates, tags and mappings</p>
              </div>
            </div>
            <ArrowRight size={24} className="text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>

          {recentEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent events</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{event.event_type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">System Status</h2>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
