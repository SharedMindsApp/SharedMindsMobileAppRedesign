import { FlaskConical, AlertTriangle, Eye, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RegulationTestingTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 rounded-xl p-8 border-2 border-amber-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Testing Mode</h2>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              This section is for inspecting system behavior, not user performance. Testing Mode shows how signals are
              computed, how contexts are evaluated, and how regulation decisions are made.
            </p>
            <div className="p-4 bg-white rounded-lg border border-amber-200">
              <p className="text-xs text-gray-600 italic">
                Nothing in this section reflects on user outcomes, productivity, or success. It's purely technical
                diagnostic information for understanding the regulation system itself.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/regulation/signals')}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Eye className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">Signal Traces</div>
            <div className="text-sm text-gray-600">See how individual signals are computed</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/regulation/contexts/test')}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <FlaskConical className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">Simulate Events</div>
            <div className="text-sm text-gray-600">Test how contexts would evaluate</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/regulation/testing')}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <Bug className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">Debug Dashboard</div>
            <div className="text-sm text-gray-600">Full system diagnostics</div>
          </div>
        </button>

        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-500 text-center">More testing tools coming soon</p>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Important Notice
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-2">
          Testing Mode is for understanding the system's internal logic. It shows technical decisions, threshold
          evaluations, and computational paths.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          It does NOT show user performance, effectiveness, or outcomes. Never interpret testing data as feedback on how
          well someone is working.
        </p>
      </div>
    </div>
  );
}
