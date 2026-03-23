import { FolderKanban } from 'lucide-react';

export function SideProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <FolderKanban size={24} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Side Projects</h1>
            <p className="text-sm text-gray-500">Manage projects within your master project</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-900 font-medium mb-2">Coming Soon</p>
          <p className="text-green-700 text-sm">
            Side Projects coming soon.
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>
            Side projects help you organize smaller initiatives within your master projects.
            Each side project can contain up to 5 tasks to keep things focused and manageable.
          </p>
        </div>
      </div>
    </div>
  );
}
