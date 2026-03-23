import { useState } from 'react';
import { Archive, Eye, Calendar, AlertCircle, Info } from 'lucide-react';
import type { MasterProject, Domain } from '../../../../lib/guardrailsTypes';
import { archiveProject } from '../../../../lib/guardrails';
import { ProjectSummaryModal } from './ProjectSummaryModal';
import { ArchiveProjectConfirmModal } from './ArchiveProjectConfirmModal';

interface AbandonedProjectsPanelProps {
  projects: MasterProject[];
  domains: Domain[];
  onUpdate: () => void;
}

const domainDisplayNames: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  creative: 'Startup',
  health: 'Health',
};

export function AbandonedProjectsPanel({ projects, domains, onUpdate }: AbandonedProjectsPanelProps) {
  const [selectedProject, setSelectedProject] = useState<MasterProject | null>(null);
  const [projectToArchive, setProjectToArchive] = useState<MasterProject | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);

  function getDomainName(domainId: string): string {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return 'Unknown';
    return domainDisplayNames[domain.name] || domain.name;
  }

  async function handleArchive(project: MasterProject) {
    try {
      setArchiving(true);
      await archiveProject(project.id);
      setProjectToArchive(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to archive project:', error);
      const message = error instanceof Error ? error.message : 'Failed to archive project';
      alert(message);
    } finally {
      setArchiving(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
        <p className="text-gray-500">No abandoned projects</p>
        <p className="text-sm text-gray-400 mt-1">
          Abandoned projects will appear here before being archived
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {projects.map(project => (
          <div
            key={project.id}
            className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                  {getDomainName(project.domain_id)}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>
                    Abandoned {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {project.abandonment_reason && (
                  <button
                    onClick={() => setShowReasonFor(showReasonFor === project.id ? null : project.id)}
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Info size={14} />
                    {showReasonFor === project.id ? 'Hide' : 'Show'} Reason
                  </button>
                )}
              </div>
              {showReasonFor === project.id && project.abandonment_reason && (
                <div className="mt-2 p-3 bg-white border border-amber-200 rounded text-sm text-gray-700">
                  <span className="font-medium">Reason: </span>
                  {project.abandonment_reason}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setSelectedProject(project)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Eye size={16} />
                View Summary
              </button>
              <button
                onClick={() => setProjectToArchive(project)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Archive size={16} />
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedProject && (
        <ProjectSummaryModal
          project={selectedProject}
          domain={domains.find(d => d.id === selectedProject.domain_id)}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {projectToArchive && (
        <ArchiveProjectConfirmModal
          project={projectToArchive}
          onConfirm={() => handleArchive(projectToArchive)}
          onCancel={() => setProjectToArchive(null)}
          isArchiving={archiving}
        />
      )}
    </>
  );
}
