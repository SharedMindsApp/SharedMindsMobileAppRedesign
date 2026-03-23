import { useState } from 'react';
import { ArchiveRestore, Eye, Calendar, Package } from 'lucide-react';
import type { MasterProject, Domain } from '../../../../lib/guardrailsTypes';
import { unarchiveProject } from '../../../../lib/guardrails';
import { ProjectSummaryModal } from './ProjectSummaryModal';

interface ArchivedProjectsPanelProps {
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

export function ArchivedProjectsPanel({ projects, domains, onUpdate }: ArchivedProjectsPanelProps) {
  const [selectedProject, setSelectedProject] = useState<MasterProject | null>(null);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);

  function getDomainName(domainId: string): string {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return 'Unknown';
    return domainDisplayNames[domain.name] || domain.name;
  }

  async function handleUnarchive(project: MasterProject) {
    const confirmed = window.confirm(
      `Unarchive "${project.name}"? It will be moved back to ${project.status === 'completed' ? 'Completed' : 'Abandoned'} Projects.`
    );

    if (!confirmed) return;

    try {
      setUnarchiving(project.id);
      await unarchiveProject(project.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to unarchive project:', error);
      const message = error instanceof Error ? error.message : 'Failed to unarchive project';
      alert(message);
    } finally {
      setUnarchiving(null);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto text-gray-300 mb-4" size={48} />
        <p className="text-gray-500">No archived projects</p>
        <p className="text-sm text-gray-400 mt-1">
          Archive completed or abandoned projects to keep your workspace clean
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
            className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                  {getDomainName(project.domain_id)}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                    project.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} />
                <span>
                  Archived {new Date(project.archived_at || project.updated_at).toLocaleDateString()}
                </span>
              </div>
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
                onClick={() => handleUnarchive(project)}
                disabled={unarchiving === project.id}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <ArchiveRestore size={16} />
                {unarchiving === project.id ? 'Unarchiving...' : 'Unarchive'}
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
    </>
  );
}
