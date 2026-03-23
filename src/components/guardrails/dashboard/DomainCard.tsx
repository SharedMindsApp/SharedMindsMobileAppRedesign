import { useState } from 'react';
import { Briefcase, Home, Palette, Heart, Plus, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import type { Domain, MasterProject, RoadmapItem } from '../../../lib/guardrailsTypes';

interface DomainCardProps {
  domain: Domain;
  project: MasterProject | null;
  stats: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    blockedItems: number;
  };
  onCreateProject: (domainId: string) => void;
  onOpenProject: (projectId: string) => void;
}

const domainIcons = {
  work: Briefcase,
  personal: Home,
  creative: Palette,
  health: Heart,
};

const domainColors = {
  work: 'blue',
  personal: 'green',
  creative: 'orange',
  health: 'red',
};

export function DomainCard({ domain, project, stats, onCreateProject, onOpenProject }: DomainCardProps) {
  const Icon = domainIcons[domain.name];
  const color = domainColors[domain.name];
  const completionPercentage = stats.totalItems > 0
    ? Math.round((stats.completedItems / stats.totalItems) * 100)
    : 0;

  return (
    <div className={`bg-white rounded-xl border-2 border-${color}-200 p-6 hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
            <Icon className={`text-${color}-600`} size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">{domain.name}</h3>
            {project && (
              <p className="text-sm text-gray-600 line-clamp-1">{project.name}</p>
            )}
          </div>
        </div>
      </div>

      {project ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`bg-${color}-600 h-2 rounded-full transition-all`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
              <CheckCircle size={14} className="text-green-600 mb-1" />
              <span className="font-semibold text-gray-900">{stats.completedItems}</span>
              <span className="text-gray-500">Done</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-600 mb-1" />
              <span className="font-semibold text-gray-900">{stats.inProgressItems}</span>
              <span className="text-gray-500">Active</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gray-50 rounded">
              <AlertCircle size={14} className="text-red-600 mb-1" />
              <span className="font-semibold text-gray-900">{stats.blockedItems}</span>
              <span className="text-gray-500">Blocked</span>
            </div>
          </div>

          <button
            onClick={() => onOpenProject(project.id)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors font-medium`}
          >
            Open Project
            <ExternalLink size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">No active project in this domain</p>
          <button
            onClick={() => onCreateProject(domain.id)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors font-medium`}
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      )}
    </div>
  );
}
