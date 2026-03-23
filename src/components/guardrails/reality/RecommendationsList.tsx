import { Lightbulb, CheckCircle } from 'lucide-react';

interface RecommendationsListProps {
  recommendations: string[];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
          <p className="text-sm text-gray-600 mt-1">Actions to improve feasibility</p>
        </div>
        <div className="p-2 rounded-lg bg-amber-50">
          <Lightbulb size={20} className="text-amber-600" />
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-2">
          {recommendations.map((recommendation, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <CheckCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">{recommendation}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <p className="text-sm text-green-900">
            No recommendations needed. Your project looks ready to start!
          </p>
        </div>
      )}
    </div>
  );
}
