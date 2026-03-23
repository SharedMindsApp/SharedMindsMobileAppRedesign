import { useState } from 'react';
import { Settings, ChevronDown, ChevronRight, Shield, Sliders, Zap, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ConfigSection = 'calibration' | 'responses' | 'limits' | 'safemode';

export function RegulationConfigureTab() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<ConfigSection | null>(null);

  const sections = [
    {
      id: 'calibration' as ConfigSection,
      title: 'Signal Calibration',
      icon: <Sliders className="w-5 h-5 text-blue-600" />,
      description: 'Adjust when patterns become visible',
      whenToUse: 'When signals appear too often or too rarely for your preference',
      action: () => navigate('/regulation/calibration'),
      actionLabel: 'Open Calibration',
    },
    {
      id: 'responses' as ConfigSection,
      title: 'Response Configuration',
      icon: <Zap className="w-5 h-5 text-purple-600" />,
      description: 'Create, edit, or remove support tools',
      whenToUse: 'When you want to customize which tools are available to you',
      action: () => navigate('/regulation/create'),
      actionLabel: 'Manage Responses',
    },
    {
      id: 'limits' as ConfigSection,
      title: 'Limits & Control',
      icon: <Ban className="w-5 h-5 text-red-600" />,
      description: 'Set boundaries on when and how tools can appear',
      whenToUse: 'When you want specific rules about tool behavior or appearance',
      action: () => navigate('/regulation/governance'),
      actionLabel: 'Set Limits',
    },
    {
      id: 'safemode' as ConfigSection,
      title: 'Safe Mode',
      icon: <Shield className="w-5 h-5 text-green-600" />,
      description: 'Pause all responses immediately',
      whenToUse: 'When you need everything to go quiet for a while',
      action: () => navigate('/regulation/governance'),
      actionLabel: 'Manage Safe Mode',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-8 border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-gray-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure</h2>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              Fine-tune how regulation works for you. This section is for people who want control over specific
              behaviors. Most users never need to come here.
            </p>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 italic">
                If you're not sure what you're looking for, the Presets tab is probably a better starting point. These
                settings are for when you have specific preferences about signal thresholds, tool behaviors, or system
                boundaries.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{section.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="mt-4 space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-xs font-medium text-gray-900 mb-1">When to use this</p>
                      <p className="text-sm text-gray-700">{section.whenToUse}</p>
                    </div>

                    <button
                      onClick={section.action}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-sm"
                    >
                      {section.actionLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">You don't need to be here</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Most people use Presets and never touch these settings. This section exists for people who know exactly what
          they want to change and why. If you're exploring "just in case," the Overview and Presets tabs are more
          useful places to spend your time.
        </p>
      </div>
    </div>
  );
}
