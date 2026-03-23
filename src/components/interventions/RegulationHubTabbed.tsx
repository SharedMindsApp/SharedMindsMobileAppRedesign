import { useState, useEffect } from 'react';
import { Shield, Settings, TrendingUp, Sparkles, FlaskConical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RegulationOverviewTab } from './tabs/RegulationOverviewTab';
import { RegulationPresetsTab } from './tabs/RegulationPresetsTab';
import { RegulationConfigureTab } from './tabs/RegulationConfigureTab';
import { RegulationInsightsTab } from './tabs/RegulationInsightsTab';
import { RegulationTestingTab } from './tabs/RegulationTestingTab';
import { getTestingModeEnabled } from '../../lib/regulation/testingModeService';

type TabId = 'overview' | 'presets' | 'configure' | 'insights' | 'testing';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function RegulationHubTabbed() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [testingModeEnabled, setTestingModeEnabled] = useState(false);

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'presets',
      label: 'Presets',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'testing',
      label: 'Testing',
      icon: <FlaskConical className="w-4 h-4" />,
      adminOnly: true,
    },
  ];

  useEffect(() => {
    if (user) {
      checkTestingMode();
    }
  }, [user]);

  async function checkTestingMode() {
    if (!user) return;
    const enabled = await getTestingModeEnabled(user.id);
    setTestingModeEnabled(enabled);
  }

  const visibleTabs = tabs.filter(
    (tab) => !tab.adminOnly || (tab.adminOnly && (profile?.is_admin || testingModeEnabled))
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-100 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Regulation</h1>
            <p className="text-lg text-gray-700 mb-4 leading-relaxed">
              Your supportive workspace companion. Regulation notices patterns in how you work and offers gentle tools when you might find them helpful.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-green-200 shadow-sm">
                <span className="text-sm font-medium text-gray-800">Nothing is automatic</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-blue-200 shadow-sm">
                <span className="text-sm font-medium text-gray-800">You control everything</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-purple-200 shadow-sm">
                <span className="text-sm font-medium text-gray-800">Always reversible</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <RegulationOverviewTab />}
          {activeTab === 'presets' && <RegulationPresetsTab />}
          {activeTab === 'configure' && <RegulationConfigureTab />}
          {activeTab === 'insights' && <RegulationInsightsTab />}
          {activeTab === 'testing' && <RegulationTestingTab />}
        </div>
      </div>
    </div>
  );
}
