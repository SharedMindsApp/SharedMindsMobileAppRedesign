import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import {
  getTemplateLinkByToken,
  importTemplateFromToken,
} from '../../lib/trackerStudio/trackerTemplateLinkService';
import type { TrackerTemplate } from '../../lib/trackerStudio/types';
import { showToast } from '../Toast';

export function TemplateImportPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TrackerTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadTemplate();
    }
  }, [token]);

  const loadTemplate = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const preview = await getTemplateLinkByToken(token);
      setTemplate(preview.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!token) return;

    try {
      setImporting(true);
      setError(null);
      await importTemplateFromToken(token);
      showToast('success', 'Template imported successfully');
      navigate('/tracker-studio/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import template');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Template</h2>
            <p className="text-red-800 mb-4">{error || 'Template not found'}</p>
            <div className="space-y-2 text-sm text-red-700">
              <p>Possible reasons:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Invalid or expired share link</li>
                <li>Link has been revoked</li>
                <li>Maximum uses reached</li>
                <li>Template has been archived</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/tracker-studio/templates')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  const granularityLabel = template.entry_granularity.charAt(0).toUpperCase() + template.entry_granularity.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/tracker-studio/templates')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Templates
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Template</h1>
          <p className="text-gray-600">Review this template and import it to your collection</p>
        </div>

        {/* Template Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{template.name}</h2>
            {template.description && (
              <p className="text-gray-600">{template.description}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>{template.field_schema.length} {template.field_schema.length === 1 ? 'field' : 'fields'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{granularityLabel}</span>
            </div>
          </div>

          {/* Fields */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Fields</h3>
            <div className="space-y-2">
              {template.field_schema.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{field.label}</p>
                    <p className="text-xs text-gray-500 capitalize">{field.type}</p>
                  </div>
                  {field.validation && (
                    <div className="text-xs text-gray-500">
                      {field.validation.min !== undefined && `Min: ${field.validation.min}`}
                      {field.validation.max !== undefined && ` Max: ${field.validation.max}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Import Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What happens when you import?</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>A copy of this template will be added to your templates</li>
                <li>You can create trackers from the imported template</li>
                <li>The template contains no data (structure only)</li>
                <li>You own the imported template completely</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Import Button */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/tracker-studio/templates')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={18} />
            {importing ? 'Importing...' : 'Import Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
