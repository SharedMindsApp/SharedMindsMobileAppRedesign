import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { FeasibilityStatus } from '../../../lib/guardrailsTypes';

interface FeasibilityScoreCardProps {
  score: number;
  status: FeasibilityStatus;
}

export function FeasibilityScoreCard({ score, status }: FeasibilityScoreCardProps) {
  const statusConfig = {
    green: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      ringColor: 'stroke-green-600',
      icon: CheckCircle,
      label: 'Fully Feasible',
      description: 'This project is ready to start with your current resources.',
    },
    yellow: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      ringColor: 'stroke-yellow-600',
      icon: AlertCircle,
      label: 'Needs Adjustments',
      description: 'Some resources or time adjustments recommended.',
    },
    red: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      ringColor: 'stroke-red-600',
      icon: XCircle,
      label: 'Not Realistic Right Now',
      description: 'Significant gaps in skills, tools, or time availability.',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`bg-white rounded-xl border ${config.borderColor} p-6`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feasibility Score</h3>
          <p className="text-sm text-gray-600 mt-1">Overall project readiness</p>
        </div>
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon size={20} className={config.color} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width="140" height="140" className="transform -rotate-90">
            <circle
              cx="70"
              cy="70"
              r="58"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r="58"
              className={config.ringColor}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${config.color}`}>{score}</div>
            <div className="text-xs text-gray-500">out of 100</div>
          </div>
        </div>

        <div className="flex-1">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor} ${config.borderColor} border mb-3`}>
            <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
