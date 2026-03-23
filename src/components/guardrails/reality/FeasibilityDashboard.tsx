import { useState, useEffect } from 'react';
import { Loader, AlertCircle, Activity } from 'lucide-react';
import { getRealityCheckReport } from '../../../lib/guardrails';
import type { ProjectFeasibility } from '../../../lib/guardrailsTypes';
import { FeasibilityScoreCard } from './FeasibilityScoreCard';
import { SkillsCoverageCard } from './SkillsCoverageCard';
import { ToolsCoverageCard } from './ToolsCoverageCard';
import { TimeFeasibilityCard } from './TimeFeasibilityCard';
import { RiskPanel } from './RiskPanel';
import { RecommendationsList } from './RecommendationsList';

interface FeasibilityDashboardProps {
  masterProjectId: string;
}

export function FeasibilityDashboard({ masterProjectId }: FeasibilityDashboardProps) {
  const [report, setReport] = useState<ProjectFeasibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getRealityCheckReport(masterProjectId);
      setReport(data);
    } catch (err) {
      console.error('Failed to load reality check report:', err);
      setError('Failed to load feasibility report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [masterProjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading feasibility report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Error Loading Report</h3>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadReport}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reality Check Not Available</h2>
          <p className="text-gray-600">
            Reality Check will analyze your project once you've added roadmap items, skills, and
            tools requirements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Feasibility Dashboard</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Comprehensive analysis of your project's readiness and resource requirements
        </p>
      </div>

      {/* Mobile: Single column, Desktop: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <FeasibilityScoreCard score={report.feasibilityScore} status={report.feasibilityStatus} />
        </div>

        <SkillsCoverageCard coverage={report.skillCoverage} />
        <ToolsCoverageCard coverage={report.toolCoverage} />

        <TimeFeasibilityCard timeFeasibility={report.timeFeasibility} />
        <RiskPanel riskAnalysis={report.riskAnalysis} />

        <div className="lg:col-span-2">
          <RecommendationsList recommendations={report.recommendations} />
        </div>
      </div>
    </div>
  );
}
