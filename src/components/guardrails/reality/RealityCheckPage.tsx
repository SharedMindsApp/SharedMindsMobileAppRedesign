import { useState, useEffect } from 'react';
import { Activity, Award, Wrench } from 'lucide-react';
import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { FeasibilityDashboard } from './FeasibilityDashboard';
import { SkillsMatrix } from './SkillsMatrix';
import { ToolsMatrix } from './ToolsMatrix';

interface RealityCheckPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

type RealityTab = 'feasibility' | 'skills' | 'tools';

export function RealityCheckPage({ masterProjectId, masterProjectName }: RealityCheckPageProps) {
  const [activeTab, setActiveTab] = useState<RealityTab>('feasibility');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = [
    { id: 'feasibility' as RealityTab, name: isMobile ? 'Dashboard' : 'Feasibility Dashboard', icon: Activity },
    { id: 'skills' as RealityTab, name: isMobile ? 'Skills' : 'Skills Matrix', icon: Award },
    { id: 'tools' as RealityTab, name: isMobile ? 'Tools' : 'Tools Matrix', icon: Wrench },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeaderTabs
        masterProjectId={masterProjectId}
        projectName={masterProjectName}
      />

      {/* Mobile-optimized: Horizontally scrollable tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className={`flex gap-1 py-3 ${isMobile ? 'overflow-x-auto px-4 scrollbar-hide' : 'px-6'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${isMobile ? 'min-w-fit' : ''}
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={16} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'feasibility' && (
          <FeasibilityDashboard masterProjectId={masterProjectId} />
        )}
        {activeTab === 'skills' && (
          <SkillsMatrix masterProjectId={masterProjectId} />
        )}
        {activeTab === 'tools' && (
          <ToolsMatrix masterProjectId={masterProjectId} />
        )}
      </div>
    </div>
  );
}
