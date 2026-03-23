import { AdminLayout } from './AdminLayout';
import { FileText } from 'lucide-react';

export function AdminReports() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Reports</h1>
          <p className="text-gray-600">View and manage all generated harmony reports</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reports Management</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            This section will display all generated AI harmony reports with filtering and search capabilities.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
