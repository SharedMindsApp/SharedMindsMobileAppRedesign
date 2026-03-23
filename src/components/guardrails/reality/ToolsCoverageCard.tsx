import { Wrench, DollarSign, AlertTriangle } from 'lucide-react';
import type { ToolCoverage } from '../../../lib/guardrailsTypes';

interface ToolsCoverageCardProps {
  coverage: ToolCoverage;
}

export function ToolsCoverageCard({ coverage }: ToolsCoverageCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tools Coverage</h3>
          <p className="text-sm text-gray-600 mt-1">Required tools and software</p>
        </div>
        <div className="p-2 rounded-lg bg-orange-50">
          <Wrench size={20} className="text-orange-600" />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">{coverage.coveragePercent}%</span>
          <span className="text-sm text-gray-600">Coverage</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              coverage.coveragePercent >= 70
                ? 'bg-green-500'
                : coverage.coveragePercent >= 40
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${coverage.coveragePercent}%` }}
          />
        </div>
      </div>

      {coverage.missingTools.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-medium text-gray-900">Missing Tools</h4>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {coverage.missingTools.length}
            </span>
            {coverage.essentialMissingCount > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full flex items-center gap-1">
                <AlertTriangle size={10} />
                {coverage.essentialMissingCount} Critical
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {coverage.missingTools.slice(0, 5).map((tool, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  tool.is_essential
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                    {tool.is_essential && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                        Essential
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{tool.category}</p>
                </div>
                {tool.cost !== null && (
                  <div className="text-sm font-medium text-gray-700">
                    ${tool.cost.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
          {coverage.estimatedTotalCost > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">${coverage.estimatedTotalCost.toFixed(2)}</span>{' '}
                estimated to acquire missing tools
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900">
            All required tools available
          </p>
        </div>
      )}
    </div>
  );
}
