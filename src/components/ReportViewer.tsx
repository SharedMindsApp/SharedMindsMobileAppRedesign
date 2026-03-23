import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Lightbulb,
  Heart,
  Brain,
  Target,
  TrendingUp,
  Users,
  AlertCircle,
} from 'lucide-react';
import { getLatestReport, generateHouseholdReport, Report } from '../lib/reports';

type ReportContent = {
  section_summaries: string[];
  insight_analysis: string[];
  perception_gaps: string[];
  strengths: string[];
  emotional_dynamics: string[];
  adhd_dynamics: string[];
  action_plan: {
    immediate_actions: string[];
    weekly_practices: string[];
    long_term_systems: string[];
  };
};

type CollapsibleSectionProps = {
  title: string;
  items: string[];
  icon: React.ReactNode;
  defaultOpen?: boolean;
};

function CollapsibleSection({ title, items, icon, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-600">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">({items.length})</span>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3 pt-4">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <p className="text-gray-700 leading-relaxed flex-1">{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ActionChecklistProps = {
  title: string;
  items: string[];
  icon: React.ReactNode;
  checkedItems: Set<string>;
  onToggle: (item: string) => void;
  defaultOpen?: boolean;
};

function ActionChecklist({
  title,
  items,
  icon,
  checkedItems,
  onToggle,
  defaultOpen = false,
}: ActionChecklistProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-green-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-green-600">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-600">
            ({Array.from(checkedItems).filter((id) => id.startsWith(title)).length}/{items.length})
          </span>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-3 border-t border-green-200">
          {items.map((item, idx) => {
            const itemId = `${title}-${idx}`;
            const isChecked = checkedItems.has(itemId);

            return (
              <label
                key={idx}
                className="flex items-start gap-3 pt-3 cursor-pointer group hover:bg-white/50 p-3 rounded-lg transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onToggle(itemId)}
                  className="flex-shrink-0 mt-0.5"
                >
                  {isChecked ? (
                    <CheckCircle2 className="text-green-600" size={22} />
                  ) : (
                    <Circle className="text-gray-400 group-hover:text-green-400" size={22} />
                  )}
                </button>
                <span
                  className={`text-gray-700 leading-relaxed flex-1 ${
                    isChecked ? 'line-through text-gray-400' : ''
                  }`}
                >
                  {item}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportViewer() {
  const [report, setReport] = useState<Report | null>(null);
  const [reportContent, setReportContent] = useState<ReportContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const latestReport = await getLatestReport();

      if (!latestReport) {
        setError('No report found. Please generate a report first.');
        setLoading(false);
        return;
      }

      setReport(latestReport);

      try {
        const content = JSON.parse(latestReport.content);
        setReportContent(content);
      } catch (err) {
        console.error('Error parsing report content:', err);
        setError('Failed to parse report content');
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Generate a new report? This may take a few moments.')) {
      return;
    }

    try {
      setRegenerating(true);
      setError(null);
      const newReport = await generateHouseholdReport();
      setReport(newReport);

      try {
        const content = JSON.parse(newReport.content);
        setReportContent(content);
        setCheckedItems(new Set());
      } catch (err) {
        console.error('Error parsing report content:', err);
        setError('Report generated but failed to parse content');
      }
    } catch (err) {
      console.error('Error regenerating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleCheckItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <AlertCircle size={48} className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Report Available</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating...' : 'Regenerate Report'}
        </button>
      </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Household Report</h1>
          {report && (
            <p className="text-gray-600">
              Generated on {new Date(report.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {reportContent && (
          <div className="space-y-6">
            <CollapsibleSection
              title="Section Summaries"
              items={reportContent.section_summaries || []}
              icon={<FileText size={24} />}
              defaultOpen={true}
            />

            <CollapsibleSection
              title="Key Insights"
              items={reportContent.insight_analysis || []}
              icon={<Lightbulb size={24} />}
              defaultOpen={true}
            />

            <CollapsibleSection
              title="Perception Gaps"
              items={reportContent.perception_gaps || []}
              icon={<Users size={24} />}
            />

            <CollapsibleSection
              title="Household Strengths"
              items={reportContent.strengths || []}
              icon={<TrendingUp size={24} />}
            />

            <CollapsibleSection
              title="Emotional Dynamics"
              items={reportContent.emotional_dynamics || []}
              icon={<Heart size={24} />}
            />

            <CollapsibleSection
              title="ADHD Dynamics"
              items={reportContent.adhd_dynamics || []}
              icon={<Brain size={24} />}
            />

            <div className="pt-4">
              <div className="flex items-center gap-2 mb-6">
                <Target size={28} className="text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Action Plan</h2>
              </div>

              <div className="space-y-4">
                <ActionChecklist
                  title="Immediate Actions"
                  items={reportContent.action_plan?.immediate_actions || []}
                  icon={<Target size={24} />}
                  checkedItems={checkedItems}
                  onToggle={toggleCheckItem}
                  defaultOpen={true}
                />

                <ActionChecklist
                  title="Weekly Practices"
                  items={reportContent.action_plan?.weekly_practices || []}
                  icon={<RefreshCw size={24} />}
                  checkedItems={checkedItems}
                  onToggle={toggleCheckItem}
                />

                <ActionChecklist
                  title="Long-Term Systems"
                  items={reportContent.action_plan?.long_term_systems || []}
                  icon={<TrendingUp size={24} />}
                  checkedItems={checkedItems}
                  onToggle={toggleCheckItem}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
