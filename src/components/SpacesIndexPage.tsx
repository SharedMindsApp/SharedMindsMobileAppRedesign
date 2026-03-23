import { useNavigate } from 'react-router-dom';
import { User, Users } from 'lucide-react';

export function SpacesIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Choose Your Space</h1>
          <p className="text-lg text-gray-600">Select the space you want to work in</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/spaces/personal')}
            className="group bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all p-8 text-left hover:shadow-xl"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
              <User size={32} className="text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Personal Space</h2>
            <p className="text-gray-600 text-lg">Your private dashboard for personal goals, tasks, and projects</p>
          </button>

          <button
            onClick={() => navigate('/spaces/shared')}
            className="group bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-amber-500 transition-all p-8 text-left hover:shadow-xl"
          >
            <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
              <Users size={32} className="text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Shared Spaces</h2>
            <p className="text-gray-600 text-lg">Collaborative dashboards for families, teams, and groups</p>
          </button>
        </div>
      </div>
    </div>
  );
}
