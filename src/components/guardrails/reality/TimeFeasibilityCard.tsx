import { Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import type { TimeFeasibility } from '../../../lib/guardrailsTypes';

interface TimeFeasibilityCardProps {
  timeFeasibility: TimeFeasibility;
}

export function TimeFeasibilityCard({ timeFeasibility }: TimeFeasibilityCardProps) {
  const hasDeficit = timeFeasibility.deficitOrSurplus < 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Time Feasibility</h3>
          <p className="text-sm text-gray-600 mt-1">Weekly hours analysis</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-50">
          <Clock size={20} className="text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Hours Needed</p>
          <p className="text-xl font-bold text-gray-900">
            {timeFeasibility.weeklyHoursNeeded}h
          </p>
          <p className="text-xs text-gray-500 mt-1">per week</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Available</p>
          <p className="text-xl font-bold text-gray-900">
            {timeFeasibility.weeklyHoursAvailable}h
          </p>
          <p className="text-xs text-gray-500 mt-1">per week</p>
        </div>
      </div>

      <div
        className={`p-4 rounded-lg border ${
          hasDeficit
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {hasDeficit ? (
            <TrendingDown size={18} className="text-red-600" />
          ) : (
            <TrendingUp size={18} className="text-green-600" />
          )}
          <span
            className={`text-sm font-semibold ${
              hasDeficit ? 'text-red-900' : 'text-green-900'
            }`}
          >
            {hasDeficit ? 'Time Deficit' : 'Time Surplus'}
          </span>
        </div>
        <p className={`text-sm ${hasDeficit ? 'text-red-800' : 'text-green-800'}`}>
          {hasDeficit
            ? `You need ${Math.abs(timeFeasibility.deficitOrSurplus).toFixed(1)} more hours per week`
            : `You have ${timeFeasibility.deficitOrSurplus.toFixed(1)} extra hours per week`}
        </p>
      </div>

      {timeFeasibility.estimatedProjectWeeks > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Calendar size={16} className="text-blue-600" />
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{timeFeasibility.estimatedProjectWeeks} weeks</span>{' '}
            estimated duration
          </p>
        </div>
      )}

      {timeFeasibility.recommendedTimelineExtensionWeeks > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            Consider extending timeline by{' '}
            <span className="font-semibold">
              {timeFeasibility.recommendedTimelineExtensionWeeks} week
              {timeFeasibility.recommendedTimelineExtensionWeeks > 1 ? 's' : ''}
            </span>{' '}
            to match available hours
          </p>
        </div>
      )}
    </div>
  );
}
