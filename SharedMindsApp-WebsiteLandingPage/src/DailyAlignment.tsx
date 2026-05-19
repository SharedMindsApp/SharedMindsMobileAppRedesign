import { Compass, Eye, Zap, CheckCircle } from 'lucide-react';

export default function DailyAlignment() {
  const alignmentMoments = [
    {
      icon: Eye,
      title: 'See where your attention is right now',
      description: 'Daily Alignment shows what you\'ve committed to today — so you don\'t have to keep recalculating it in your head. It helps you quickly re-orient when you feel scattered, stuck, or pulled in multiple directions.',
      color: 'blue',
      bgGradient: 'from-blue-100/90 to-cyan-100/70',
    },
    {
      icon: Compass,
      title: 'Choose what to work on — without overthinking',
      description: 'Drag tasks into your day, adjust time as needed, and shape your plan based on what\'s realistic right now. Nothing is locked in. You can change direction without starting over.',
      color: 'cyan',
      bgGradient: 'from-cyan-100/90 to-teal-100/70',
    },
    {
      icon: Zap,
      title: 'Adapt as your energy and context change',
      description: 'Daily Alignment supports task switching, pauses, and re-entry. If something takes longer, gets interrupted, or needs to move — the system adjusts with you.',
      color: 'teal',
      bgGradient: 'from-teal-100/85 to-cyan-100/65',
    },
    {
      icon: CheckCircle,
      title: 'Finish things cleanly and move on',
      description: 'Ticking something off gives a clear, satisfying sense of done — without scores, streaks, or judgement. You stay focused on what\'s next, not what you "should have done."',
      color: 'amber',
      bgGradient: 'from-amber-100/80 to-yellow-100/60',
    },
  ];

  return (
    <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-blue-50/20 to-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-100/20 blur-3xl animate-[pulse_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-cyan-100/20 blur-3xl animate-[pulse_22s_ease-in-out_infinite_3s]" />
      </div>

      <svg className="absolute top-20 left-1/2 -translate-x-1/2 w-32 h-32 opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="0.5" opacity="0.6" className="animate-[breathe_12s_ease-in-out_infinite]" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="rgb(6, 182, 212)" strokeWidth="0.5" opacity="0.5" className="animate-[breathe_14s_ease-in-out_infinite_1s]" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="0.5" opacity="0.4" className="animate-[breathe_16s_ease-in-out_infinite_2s]" />
      </svg>

      <div className="relative max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-16 space-y-5">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Daily Alignment — stay oriented while you work
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A live, flexible view of your day that helps you decide what to focus on now — without rigid schedules or pressure.
          </p>

          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-200/60 max-w-2xl mx-auto mt-8">
            <img
              src="https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Person working with focus and clarity while staying oriented"
              loading="lazy"
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/25 via-transparent to-transparent" />
          </div>
        </div>

        <div className="space-y-6 mb-12">
          {alignmentMoments.map((moment, index) => {
            const Icon = moment.icon;
            const colorClasses = {
              blue: {
                bg: 'bg-blue-200',
                icon: 'text-blue-700',
                border: 'border-blue-300/50',
                shadow: 'hover:shadow-blue-200/40',
              },
              cyan: {
                bg: 'bg-cyan-200',
                icon: 'text-cyan-700',
                border: 'border-cyan-300/50',
                shadow: 'hover:shadow-cyan-200/40',
              },
              teal: {
                bg: 'bg-teal-200',
                icon: 'text-teal-700',
                border: 'border-teal-300/50',
                shadow: 'hover:shadow-teal-200/40',
              },
              amber: {
                bg: 'bg-amber-200',
                icon: 'text-amber-700',
                border: 'border-amber-300/50',
                shadow: 'hover:shadow-amber-200/40',
              },
            };
            const colors = colorClasses[moment.color as keyof typeof colorClasses];

            return (
              <div
                key={index}
                className={`group relative bg-gradient-to-br ${moment.bgGradient} backdrop-blur-sm rounded-3xl p-8 border-2 ${colors.border} transition-all duration-500 hover:border-opacity-100 hover:shadow-2xl ${colors.shadow} hover:-translate-y-1`}
              >
                <div className="flex items-start gap-6">
                  <div className={`
                    w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0
                    transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-xl
                  `}>
                    <Icon className={`w-7 h-7 ${colors.icon} transition-all duration-500 group-hover:scale-110`} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 leading-snug">
                      {moment.title}
                    </h3>
                    <p className="text-slate-800 text-lg leading-relaxed font-medium">
                      {moment.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative bg-gradient-to-br from-blue-100/40 to-cyan-100/30 rounded-3xl p-10 border-2 border-blue-200/60 mb-8">
          <div className="absolute -top-2 -right-2 w-20 h-20 bg-blue-100/40 rounded-full blur-2xl" />
          <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-cyan-100/40 rounded-full blur-2xl" />

          <p className="relative text-center text-lg text-slate-900 leading-relaxed font-semibold">
            Daily Alignment is not a planner you set once.<br className="hidden sm:block" />
            It's a live workspace that helps you stay on track while the day is happening — especially when attention, energy, or priorities shift.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-8 border-2 border-slate-200/60">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Daily Alignment is:
            </h3>
            <ul className="space-y-2.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>A real-time guide for today's work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>A way to manage task switching and focus</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>A bridge between planning and execution</span>
              </li>
            </ul>
          </div>

          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-8 border-2 border-slate-200/60">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              Daily Alignment isn't:
            </h3>
            <ul className="space-y-2.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>A productivity scorecard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>A rigid schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>A reflection-only tool</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>A system that punishes unfinished work</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
