import { X, Calendar, Tag, FileText, AlertCircle } from 'lucide-react';
import type { MasterProject, Domain } from '../../../../lib/guardrailsTypes';

interface ProjectSummaryModalProps {
  project: MasterProject;
  domain?: Domain;
  onClose: () => void;
}

const domainDisplayNames: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  creative: 'Startup',
  health: 'Health',
};

export function ProjectSummaryModal({ project, domain, onClose }: ProjectSummaryModalProps) {
  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    abandoned: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Project Summary</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${statusColors[project.status]}`}>
                {project.status}
              </span>
              {domain && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full capitalize">
                  {domainDisplayNames[domain.name] || domain.name}
                </span>
              )}
              {project.is_archived && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                  Archived
                </span>
              )}
            </div>
          </div>

          {project.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-gray-600" />
                <h4 className="font-medium text-gray-900">Description</h4>
              </div>
              <p className="text-gray-700 leading-relaxed">{project.description}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-gray-600" />
              <h4 className="font-medium text-gray-900">Timeline</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900 font-medium">
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {project.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(project.completed_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {project.status === 'abandoned' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Abandoned:</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(project.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {project.archived_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Archived:</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(project.archived_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {project.abandonment_reason && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} className="text-amber-600" />
                <h4 className="font-medium text-gray-900">Abandonment Reason</h4>
              </div>
              <p className="text-gray-700 leading-relaxed p-3 bg-amber-50 border border-amber-200 rounded">
                {project.abandonment_reason}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
