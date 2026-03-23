import { useParams } from 'react-router-dom';

export function OffshootIdeasListPage() {
  const { masterProjectId } = useParams<{ masterProjectId: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Offshoot Ideas</h1>
          <p className="text-gray-600 mb-2">Master Project ID: {masterProjectId}</p>
          <p className="text-gray-500">Coming soon.</p>
        </div>
      </div>
    </div>
  );
}
