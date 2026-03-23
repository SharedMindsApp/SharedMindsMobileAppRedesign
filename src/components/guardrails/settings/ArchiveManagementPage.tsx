import { useState, useEffect } from 'react';
import { Archive, ChevronDown, ChevronRight } from 'lucide-react';
import type { MasterProject, Domain } from '../../../lib/guardrailsTypes';
import {
  getCompletedProjects,
  getAbandonedProjects,
  getArchivedProjects,
  getDomains,
} from '../../../lib/guardrails';
import { CompletedProjectsPanel } from './archive/CompletedProjectsPanel';
import { AbandonedProjectsPanel } from './archive/AbandonedProjectsPanel';
import { ArchivedProjectsPanel } from './archive/ArchivedProjectsPanel';

export function ArchiveManagementPage() {
  const [completedProjects, setCompletedProjects] = useState<MasterProject[]>([]);
  const [abandonedProjects, setAbandonedProjects] = useState<MasterProject[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<MasterProject[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'completed' | 'abandoned' | 'archived' | null>('completed');

  async function loadData() {
    try {
      setLoading(true);
      const [completed, abandoned, archived, domainsList] = await Promise.all([
        getCompletedProjects(),
        getAbandonedProjects(),
        getArchivedProjects(),
        getDomains(),
      ]);

      setCompletedProjects(completed);
      setAbandonedProjects(abandoned);
      setArchivedProjects(archived);
      setDomains(domainsList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getDomainName(domainId: string): string {
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || 'Unknown';
  }

  function toggleSection(section: 'completed' | 'abandoned' | 'archived') {
    setExpandedSection(expandedSection === section ? null : section);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="text-blue-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">Archive Management</h1>
        </div>
        <p className="text-gray-600">
          Manage your completed, abandoned, and archived projects
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('completed')}
            className="w-full px-6 py-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedSection === 'completed' ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                Completed Projects
              </h2>
              <span className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
                {completedProjects.length}
              </span>
            </div>
          </button>
          {expandedSection === 'completed' && (
            <div className="p-6 border-t border-gray-200">
              <CompletedProjectsPanel
                projects={completedProjects}
                domains={domains}
                onUpdate={loadData}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('abandoned')}
            className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedSection === 'abandoned' ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                Abandoned Projects
              </h2>
              <span className="px-3 py-1 bg-amber-600 text-white text-sm font-medium rounded-full">
                {abandonedProjects.length}
              </span>
            </div>
          </button>
          {expandedSection === 'abandoned' && (
            <div className="p-6 border-t border-gray-200">
              <AbandonedProjectsPanel
                projects={abandonedProjects}
                domains={domains}
                onUpdate={loadData}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('archived')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedSection === 'archived' ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                Archived Projects
              </h2>
              <span className="px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded-full">
                {archivedProjects.length}
              </span>
            </div>
          </button>
          {expandedSection === 'archived' && (
            <div className="p-6 border-t border-gray-200">
              <ArchivedProjectsPanel
                projects={archivedProjects}
                domains={domains}
                onUpdate={loadData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
