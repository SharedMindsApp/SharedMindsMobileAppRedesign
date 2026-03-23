import { useEffect, useState } from 'react';
import { ScrollText, Filter, AlertCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getLogs, AdminLog } from '../../lib/admin';

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLogs({
        action_type: actionFilter !== 'all' ? actionFilter : undefined,
        limit: 100,
      });
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('update')) return 'bg-blue-100 text-blue-700';
    if (action.includes('delete')) return 'bg-red-100 text-red-700';
    if (action.includes('create')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Logs</h1>
          <p className="text-gray-600">Monitor all admin actions and system events</p>
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
          <div className="mb-6">
            <div className="relative inline-block">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="update_user_role">Role Updates</option>
                <option value="reset_household">Household Resets</option>
                <option value="delete_user">User Deletions</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No logs found</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <ScrollText className="text-gray-400 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action_type)}`}>
                            {log.action_type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Admin: {log.admin_id.substring(0, 8)}...</span>
                          {log.target_id && (
                            <span>Target: {log.target_id.substring(0, 8)}...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
