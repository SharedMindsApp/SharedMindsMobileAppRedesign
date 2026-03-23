import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import type { RiskAnalysis } from '../../../lib/guardrailsTypes';

interface RiskPanelProps {
  riskAnalysis: RiskAnalysis;
}

export function RiskPanel({ riskAnalysis }: RiskPanelProps) {
  const riskConfig = {
    low: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Low Risk',
    },
    medium: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Medium Risk',
    },
    high: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'High Risk',
    },
  };

  const config = riskConfig[riskAnalysis.riskLevel];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Risk & Overwhelm Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Potential challenges and blockers</p>
        </div>
        <div className="p-2 rounded-lg bg-red-50">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Overwhelm Index</p>
          <p className="text-xl font-bold text-gray-900">{riskAnalysis.overwhelmIndex}</p>
          <p className="text-xs text-gray-500">out of 100</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Blockers</p>
          <p className="text-xl font-bold text-gray-900">{riskAnalysis.blockersCount}</p>
          <p className="text-xs text-gray-500">tasks blocked</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Complexity</p>
          <p className="text-xl font-bold text-gray-900">{riskAnalysis.complexityScore}</p>
          <p className="text-xs text-gray-500">score</p>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} ${config.borderColor} border mb-4`}>
        <Zap size={14} className={config.color} />
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
      </div>

      {riskAnalysis.warnings.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Warnings</h4>
          {riskAnalysis.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-900">{warning}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" />
          <p className="text-sm text-green-900">No significant warnings detected</p>
        </div>
      )}
    </div>
  );
}
