import { useState } from 'react';
import { Brain, Focus, Sparkles, Shield, Wind, Compass, Zap, Heart } from 'lucide-react';

interface Context {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  whenToUse: string;
  bgGradient: string;
  iconColor: string;
}

export default function CognitiveContexts() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const contexts: Context[] = [
    {
      id: 'deep-focus',
      icon: Focus,
      name: 'Deep Focus',
      description: 'When you need sustained attention on a single thing',
      whenToUse: 'Quiets signals, minimizes context switching, supports sustained work',
      bgGradient: 'from-blue-200/90 to-cyan-200/70',
      iconColor: 'text-blue-700',
    },
    {
      id: 'exploration',
      icon: Sparkles,
      name: 'Exploration',
      description: 'When you\'re gathering ideas, researching, or discovering',
      whenToUse: 'Allows branching freely, supports novelty seeking without guilt',
      bgGradient: 'from-cyan-200/90 to-teal-200/70',
      iconColor: 'text-cyan-700',
    },
    {
      id: 'recovery',
      icon: Heart,
      name: 'Recovery',
      description: 'When you need space to rest or process',
      whenToUse: 'Reduces all signals, emphasizes care over progress',
      bgGradient: 'from-rose-200/85 to-pink-200/70',
      iconColor: 'text-rose-700',
    },
    {
      id: 'maintenance',
      icon: Shield,
      name: 'Maintenance',
      description: 'For routine tasks, admin work, or clearing small things',
      whenToUse: 'Supports task completion without demanding depth',
      bgGradient: 'from-slate-200/80 to-blue-200/60',
      iconColor: 'text-slate-700',
    },
    {
      id: 'transition',
      icon: Wind,
      name: 'Transition',
      description: 'When you\'re moving between contexts or re-orienting',
      whenToUse: 'Offers gentle guidance without forcing a specific direction',
      bgGradient: 'from-blue-200/85 to-slate-200/65',
      iconColor: 'text-blue-700',
    },
    {
      id: 'building',
      icon: Zap,
      name: 'Building',
      description: 'For creative work, making, or constructing something new',
      whenToUse: 'Balances exploration with forward movement',
      bgGradient: 'from-amber-200/90 to-yellow-200/70',
      iconColor: 'text-amber-700',
    },
  ];

  return (
    <section className="py-32 sm:py-40 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-[pulse_15s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl animate-[pulse_18s_ease-in-out_infinite_2s]" />
      </div>

      <svg className="absolute bottom-20 left-10 w-48 h-48 opacity-15 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
        <defs>
          <linearGradient id="contextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.15 }} />
          </linearGradient>
        </defs>
        <g className="animate-[float_25s_ease-in-out_infinite]">
          <rect x="30" y="30" width="40" height="40" rx="8" fill="url(#contextGrad)" opacity="0.5" />
          <rect x="80" y="30" width="40" height="40" rx="8" fill="url(#contextGrad)" opacity="0.4" />
          <rect x="30" y="80" width="40" height="40" rx="8" fill="url(#contextGrad)" opacity="0.6" />
          <rect x="80" y="80" width="40" height="40" rx="8" fill="url(#contextGrad)" opacity="0.3" />
        </g>
      </svg>

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-16 space-y-5">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Cognitive Contexts
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Choose a lens that matches how your mind is working right now. These aren't modes you commit to — they're temporary perspectives you can shift anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {contexts.map((context) => {
            const Icon = context.icon;
            const isHovered = hoveredId === context.id;

            return (
              <div
                key={context.id}
                onMouseEnter={() => setHoveredId(context.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  group relative bg-gradient-to-br ${context.bgGradient} rounded-3xl p-8 border-2
                  transition-all duration-500 cursor-pointer
                  ${isHovered
                    ? 'border-blue-300 shadow-2xl shadow-blue-100/50 scale-105 -translate-y-1'
                    : 'border-slate-200/60 hover:border-blue-200 hover:shadow-lg'
                  }
                `}
              >
                <div className="mb-5">
                  <div className={`
                    w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center
                    transition-all duration-500
                    ${isHovered ? 'scale-110 shadow-lg -translate-y-1' : ''}
                  `}>
                    <Icon className={`w-7 h-7 ${context.iconColor} transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : ''}`} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {context.name}
                </h3>

                <p className="text-slate-700 leading-relaxed mb-4">
                  {context.description}
                </p>

                <div className={`
                  overflow-hidden transition-all duration-500
                  ${isHovered ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}
                `}>
                  <div className={`pt-4 border-t border-slate-300/40 transition-opacity duration-300 ${isHovered ? 'opacity-100 delay-200' : 'opacity-0'}`}>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {context.whenToUse}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-200/60">
            <img
              src="https://images.pexels.com/photos/5212317/pexels-photo-5212317.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Person in reflective state choosing their approach"
              loading="lazy"
              className="w-full h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/30 via-transparent to-transparent" />
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-10 border-2 border-slate-200/60 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Compass className="w-6 h-6 text-blue-600" />
              <p className="text-lg font-semibold text-slate-900">Always reversible</p>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Switch contexts freely as your needs change. There's no commitment, no wrong choice, and no penalty for changing your mind.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
