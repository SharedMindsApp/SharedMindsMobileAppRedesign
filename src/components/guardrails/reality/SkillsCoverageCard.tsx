import { Award, Clock } from 'lucide-react';
import type { SkillCoverage } from '../../../lib/guardrailsTypes';

interface SkillsCoverageCardProps {
  coverage: SkillCoverage;
}

export function SkillsCoverageCard({ coverage }: SkillsCoverageCardProps) {
  const totalLearningHours = coverage.missingSkills.reduce(
    (sum, skill) => sum + skill.learning_hours,
    0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Skills Coverage</h3>
          <p className="text-sm text-gray-600 mt-1">Your skill level vs requirements</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-50">
          <Award size={20} className="text-purple-600" />
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

      {coverage.missingSkills.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-medium text-gray-900">Missing Skills</h4>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {coverage.missingSkills.length}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {coverage.missingSkills.slice(0, 5).map((skill, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-red-50 border border-red-100 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{skill.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">
                      Importance: {skill.importance}/5
                    </span>
                    {skill.learning_hours > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock size={12} />
                        {skill.learning_hours}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalLearningHours > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">{totalLearningHours} hours</span> estimated to
                learn missing skills
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900">
            All required skills covered
          </p>
        </div>
      )}
    </div>
  );
}
