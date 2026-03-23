import { useState } from 'react';
import { FileText, Loader2, Download, Calendar } from 'lucide-react';
import { generateHouseholdReport, getHouseholdReports, Report } from '../lib/reports';

interface ReportGeneratorProps {
  onReportGenerated?: () => void;
}

export function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      await generateHouseholdReport();
      onReportGenerated?.();
      await loadReports();
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const data = await getHouseholdReports();
      setReports(data);
      setShowReports(true);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadReport = (report: Report) => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `household-report-${new Date(report.created_at).toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText size={20} />
              Generate Household Report
            </>
          )}
        </button>

        <button
          onClick={loadReports}
          disabled={loadingReports}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loadingReports ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <FileText size={20} />
              View Reports
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showReports && reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Reports</h3>
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Household Harmony Report
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      {formatDate(report.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => downloadReport(report)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
