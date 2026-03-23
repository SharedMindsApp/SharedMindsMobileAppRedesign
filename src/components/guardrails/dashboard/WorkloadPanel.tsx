import { BarChart3, Calendar } from 'lucide-react';
import type { Domain, MasterProject, RoadmapItem } from '../../../lib/guardrailsTypes';

interface WorkloadPanelProps {
  domains: Domain[];
  projects: MasterProject[];
  items: (RoadmapItem & { project?: MasterProject })[];
}

interface DomainWorkload {
  domain: Domain;
  projectCount: number;
  itemCount: number;
  activeItems: number;
}

export function WorkloadPanel({ domains, projects, items }: WorkloadPanelProps) {
  const workloadByDomain: DomainWorkload[] = domains.map(domain => {
    const domainProjects = projects.filter(p => p.domain_id === domain.id);
    const projectIds = domainProjects.map(p => p.id);
    const domainItems = items.filter(item => item.project && projectIds.includes(item.project.id));
    const activeItems = domainItems.filter(i => i.status === 'in_progress' || i.status === 'not_started').length;

    return {
      domain,
      projectCount: domainProjects.filter(p => p.status === 'active').length,
      itemCount: domainItems.length,
      activeItems,
    };
  });

  const maxItems = Math.max(...workloadByDomain.map(w => w.itemCount), 1);

  const next30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  const itemsByDate = next30Days.map(date => {
    const count = items.filter(item => {
      const startDate = item.start_date.split('T')[0];
      const endDate = item.end_date.split('T')[0];
      return startDate <= date && endDate >= date;
    }).length;
    return { date, count };
  });

  const maxDailyItems = Math.max(...itemsByDate.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Workload Distribution</h2>

      <div className="space-y-4 md:space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <BarChart3 size={18} className="md:w-5 md:h-5 text-gray-600" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">By Domain</h3>
          </div>
          <div className="space-y-4">
            {workloadByDomain.map(({ domain, projectCount, itemCount, activeItems }) => (
              <div key={domain.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{domain.name}</span>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{itemCount}</span> tasks
                    <span className="mx-2">•</span>
                    <span className="font-medium">{activeItems}</span> active
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${(itemCount / maxItems) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Calendar size={18} className="md:w-5 md:h-5 text-gray-600" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Next 30 Days</h3>
          </div>
          <div className="flex items-end gap-0.5 md:gap-1 h-24 md:h-32 overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            {itemsByDate.map(({ date, count }, index) => {
              const height = (count / maxDailyItems) * 100;
              const isToday = date === new Date().toISOString().split('T')[0];
              const showLabel = index % 5 === 0;

              return (
                <div key={date} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? 'bg-blue-600' : 'bg-blue-400'} ${count === 0 ? 'opacity-20' : 'opacity-100'}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${date}: ${count} tasks`}
                  />
                  {showLabel && (
                    <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left mt-2">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 md:mt-8 flex items-center justify-center gap-3 md:gap-4 text-xs text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400 flex-shrink-0" />
              <span>Regular day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-600 flex-shrink-0" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
