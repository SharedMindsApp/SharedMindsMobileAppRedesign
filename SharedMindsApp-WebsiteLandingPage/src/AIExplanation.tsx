import { Brain, Eye, Shield, Sparkles } from 'lucide-react';

export default function AIExplanation() {
  const principles = [
    {
      icon: Eye,
      title: 'Observes patterns, not outcomes',
      description: 'Patterns emerge as you move between contexts, shift attention, and respond to friction. Regulation focuses on noticing these rhythms — not judging results or productivity.',
    },
    {
      icon: Sparkles,
      title: 'Brings signals together',
      description: 'Signals across time help build awareness: how you start, pause, return, and navigate. The focus isn\'t what you achieve, but how you think and work.',
    },
    {
      icon: Brain,
      title: 'Suggests orientation, not actions',
      description: 'You might notice, "I\'ve been switching contexts rapidly." Regulation offers perspective — never instructions. What you do next is always your choice.',
    },
    {
      icon: Shield,
      title: 'Never enforces or overrides choice',
      description: 'Any prompt or insight can be dismissed, ignored, or adapted. Regulation supports you — it never directs you.',
    },
  ];

  return (
    <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-slate-50/40 to-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-100/10 rounded-full blur-3xl animate-[pulse_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-cyan-100/10 rounded-full blur-3xl animate-[pulse_21s_ease-in-out_infinite_2s]" />
      </div>

      <svg className="absolute bottom-32 right-16 w-40 h-40 opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>
        <g className="animate-[float_20s_ease-in-out_infinite]">
          <path d="M 30 60 L 60 30 L 90 60 L 60 90 Z" fill="none" stroke="url(#aiGrad)" strokeWidth="1" opacity="0.5" />
          <circle cx="60" cy="60" r="8" fill="url(#aiGrad)" opacity="0.6" />
        </g>
      </svg>

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-16 space-y-5">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            How Regulation is Supported
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Regulation helps make patterns visible without removing your autonomy or control.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {principles.map((principle, index) => {
            const Icon = principle.icon;

            return (
              <div
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-slate-200/60 transition-all duration-500 hover:bg-white hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/40 hover:-translate-y-1"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:bg-blue-100 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                    <Icon className="w-6 h-6 text-blue-600 transition-all duration-500 group-hover:scale-110" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 leading-snug">
                      {principle.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative bg-gradient-to-br from-blue-50 via-cyan-50/50 to-blue-50 rounded-3xl p-10 lg:p-12 border-2 border-blue-200/60">
          <div className="absolute -top-3 -right-3 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-3 -left-3 w-24 h-24 bg-cyan-200/30 rounded-full blur-2xl" />

          <div className="relative text-center space-y-4">
            <h3 className="text-2xl font-bold text-slate-900">
              Regulation as interpretation, not automation
            </h3>
            <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto">
              Regulation is about understanding context and behavior — not optimizing or automating your work. It helps you see patterns you might otherwise miss, while you remain fully in control of what happens next.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
