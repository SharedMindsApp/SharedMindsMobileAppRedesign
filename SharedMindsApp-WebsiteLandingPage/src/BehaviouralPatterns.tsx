import { useState } from 'react';
import { GitBranch, Sparkles, Shield, Brain, Wind, Compass } from 'lucide-react';

interface Pattern {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  response: string;
  color: string;
  bgGradient: string;
}

export default function BehaviouralPatterns() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const patterns: Pattern[] = [
    {
      id: 'switching',
      icon: Wind,
      title: 'Task switching without progress',
      description: 'Moving between contexts rapidly, starting but not settling',
      response: 'Regulation notices the pattern and offers a gentle signal — not to stop you, but to help you become aware. You might choose to orient yourself, or simply continue.',
      color: 'text-blue-700',
      bgGradient: 'from-blue-200/90 to-cyan-200/70',
    },
    {
      id: 'expansion',
      icon: GitBranch,
      title: 'Scope expansion and novelty seeking',
      description: 'Adding new dimensions, following tangents, expanding rather than deepening',
      response: 'A signal appears showing the pattern. You can choose to acknowledge it, narrow focus, or keep exploring — the choice is always yours.',
      color: 'text-cyan-700',
      bgGradient: 'from-cyan-200/90 to-teal-200/70',
    },
    {
      id: 'friction',
      icon: Shield,
      title: 'Avoidance and friction before starting',
      description: 'Hesitation, procrastination, or difficulty beginning',
      response: 'Regulation can suggest a smaller entry point or reframe the context, but never forces action. Support is offered, not prescribed.',
      color: 'text-rose-700',
      bgGradient: 'from-rose-200/80 to-pink-200/60',
    },
    {
      id: 'abandonment',
      icon: Compass,
      title: 'Returning after project abandonment',
      description: 'Coming back to something left incomplete, often with guilt',
      response: 'Regulation helps you re-orient without shame. It shows what was there before, so you can resume without judgment.',
      color: 'text-amber-700',
      bgGradient: 'from-amber-200/80 to-yellow-200/60',
    },
    {
      id: 'overload',
      icon: Brain,
      title: 'Cognitive overload from holding too much',
      description: 'Too many contexts, decisions, or threads active simultaneously',
      response: 'A calm signal suggests pausing to externalize or prioritize. No urgency, no pressure — just a gentle invitation to lighten the load.',
      color: 'text-teal-700',
      bgGradient: 'from-teal-200/85 to-cyan-200/65',
    },
    {
      id: 'scattered',
      icon: Sparkles,
      title: 'Fragmented attention across many things',
      description: 'Attention distributed thinly, difficulty sustaining focus',
      response: 'Regulation offers context about what\'s pulling your attention and supports you in choosing where to direct it next.',
      color: 'text-blue-800',
      bgGradient: 'from-blue-300/85 to-cyan-200/65',
    },
  ];

  return (
    <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-slate-50/30 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)]" />

      <svg className="absolute top-20 right-10 w-64 h-64 opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="patternGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: 'center' }}>
          <circle cx="100" cy="50" r="8" fill="url(#patternGrad)" />
          <circle cx="150" cy="100" r="6" fill="url(#patternGrad)" />
          <circle cx="100" cy="150" r="8" fill="url(#patternGrad)" />
          <circle cx="50" cy="100" r="6" fill="url(#patternGrad)" />
          <line x1="100" y1="50" x2="150" y2="100" stroke="url(#patternGrad)" strokeWidth="1" opacity="0.4" />
          <line x1="150" y1="100" x2="100" y2="150" stroke="url(#patternGrad)" strokeWidth="1" opacity="0.4" />
          <line x1="100" y1="150" x2="50" y2="100" stroke="url(#patternGrad)" strokeWidth="1" opacity="0.4" />
          <line x1="50" y1="100" x2="100" y2="50" stroke="url(#patternGrad)" strokeWidth="1" opacity="0.4" />
        </g>
      </svg>

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Recognizing patterns in how you work
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Regulation notices when certain behaviors repeat. It doesn't diagnose or judge — it simply makes patterns visible so you can respond with awareness.
          </p>

          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-200/60 max-w-3xl mx-auto mt-8">
            <img
              src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Person managing multiple tasks and contexts thoughtfully"
              loading="lazy"
              className="w-full h-72 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 via-transparent to-transparent" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {patterns.map((pattern) => {
            const Icon = pattern.icon;
            const isExpanded = expandedId === pattern.id;

            return (
              <button
                key={pattern.id}
                onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
                className={`
                  group relative text-left rounded-3xl p-8 border-2 transition-all duration-500
                  bg-gradient-to-br ${pattern.bgGradient}
                  ${isExpanded
                    ? 'border-blue-300 shadow-xl shadow-blue-100/50 scale-[1.02]'
                    : 'border-slate-200/60 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/30'
                  }
                `}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500
                    ${isExpanded ? 'bg-blue-100 scale-110' : 'bg-white/80 group-hover:bg-blue-50 group-hover:-translate-y-0.5'}
                  `}>
                    <Icon className={`w-6 h-6 ${pattern.color} transition-all duration-500 ${isExpanded ? 'scale-110' : 'group-hover:scale-110'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-snug">
                      {pattern.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {pattern.description}
                    </p>
                  </div>
                </div>

                <div className={`
                  overflow-hidden transition-all duration-500
                  ${isExpanded ? 'max-h-48 opacity-100 mt-6' : 'max-h-0 opacity-0'}
                `}>
                  <div className={`pt-4 border-t border-blue-200/40 transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-150' : 'opacity-0'}`}>
                    <p className="text-sm font-medium text-blue-900 mb-2">How Regulation responds:</p>
                    <p className="text-slate-700 leading-relaxed">
                      {pattern.response}
                    </p>
                  </div>
                </div>

                {!isExpanded && (
                  <div className="mt-4 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to see how Regulation responds
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl p-8 border-2 border-blue-100/60">
          <p className="text-center text-lg text-slate-800 leading-relaxed">
            These patterns aren't problems to fix — they're part of how minds work. Regulation helps you see them clearly, so you can choose how to respond.
          </p>
        </div>
      </div>
    </section>
  );
}
