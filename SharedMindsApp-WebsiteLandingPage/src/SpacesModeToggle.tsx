import { useState } from 'react';
import { User, Users, Sparkles, Target, Brain, CheckCircle } from 'lucide-react';

type SpaceMode = 'personal' | 'shared';

export default function SpacesModeToggle() {
  const [mode, setMode] = useState<SpaceMode>('personal');

  const modeData = {
    personal: {
      icon: User,
      title: 'Personal Spaces',
      bgColor: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      iconBgColor: 'bg-emerald-600',
      accentColor: 'text-emerald-600',
      features: [
        { icon: User, label: 'Private', description: 'Your own thinking environment' },
        { icon: Sparkles, label: 'Flexible & exploratory', description: 'No fixed structure required' },
        { icon: Brain, label: 'Thinking-first', description: 'Space to process and explore' },
        { icon: CheckCircle, label: 'No pressure', description: 'Nothing needs to be perfect' }
      ]
    },
    shared: {
      icon: Users,
      title: 'Shared Spaces',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      iconBgColor: 'bg-blue-600',
      accentColor: 'text-blue-600',
      features: [
        { icon: Users, label: 'Collaborative', description: 'Built for coordination' },
        { icon: Target, label: 'Clear & coordinated', description: 'Everyone on the same page' },
        { icon: Brain, label: 'Context-first', description: 'Shared understanding at a glance' },
        { icon: CheckCircle, label: 'Shared clarity', description: 'Reduce confusion and misalignment' }
      ]
    }
  };

  const currentMode = modeData[mode];
  const ModeIcon = currentMode.icon;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-8 sm:mb-12 px-4 sm:px-0">
        <div className="inline-flex bg-slate-100 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-inner w-full sm:w-auto">
          <button
            onClick={() => setMode('personal')}
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex-1 sm:flex-initial ${
              mode === 'personal'
                ? 'bg-white text-emerald-700 shadow-md scale-105'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Personal Spaces</span>
            </div>
          </button>
          <button
            onClick={() => setMode('shared')}
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex-1 sm:flex-initial ${
              mode === 'shared'
                ? 'bg-white text-blue-700 shadow-md scale-105'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Shared Spaces</span>
            </div>
          </button>
        </div>
      </div>

      <div className={`relative bg-gradient-to-br ${currentMode.bgColor} border-2 ${currentMode.borderColor} rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl transition-all duration-500`}>
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 ${currentMode.iconBgColor} rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors duration-500`}>
            <ModeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{currentMode.title}</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {currentMode.features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-500 hover:bg-white/90 hover:shadow-md"
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <FeatureIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${currentMode.accentColor} flex-shrink-0 mt-0.5`} />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-base sm:text-lg mb-0.5 sm:mb-1">{feature.label}</h4>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-900/10">
          <p className="text-center text-slate-700 text-sm sm:text-base italic">
            Both use the same underlying system — just applied differently
          </p>
        </div>
      </div>
    </div>
  );
}
