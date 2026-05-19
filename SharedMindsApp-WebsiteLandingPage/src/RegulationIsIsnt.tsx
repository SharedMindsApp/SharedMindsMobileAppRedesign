import { Check, X } from 'lucide-react';

export default function RegulationIsIsnt() {
  const isItems = [
    'Awareness, not enforcement',
    'Descriptive, not prescriptive',
    'Optional, not mandatory',
    'Designed to be ignored if you want to',
  ];

  const isntItems = [
    'Monitoring productivity',
    'Tracking performance',
    'Judging behaviour',
    'Telling you how to work',
  ];

  return (
    <section className="py-28 sm:py-36 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.02),transparent_60%)]" />

      <svg className="absolute top-1/2 -translate-y-1/2 left-10 w-24 h-24 opacity-8 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="30" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="1" opacity="0.3" className="animate-[pulse_16s_ease-in-out_infinite]" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="rgb(6, 182, 212)" strokeWidth="1" opacity="0.25" className="animate-[pulse_18s_ease-in-out_infinite_1s]" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-12">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-200/60 max-w-3xl mx-auto">
            <img
              src="https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Clear distinction between supportive awareness and prescriptive control"
              loading="lazy"
              className="w-full h-72 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
          <div className="group relative bg-gradient-to-br from-blue-100/90 via-cyan-100/70 to-teal-100/60 rounded-3xl p-10 lg:p-12 border-2 border-blue-200/80 transition-all duration-500 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-200/50 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-200/0 via-cyan-200/0 to-blue-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-blue-400/40">
                  <Check className="w-8 h-8 text-white transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Regulation is</h2>
              </div>

              <ul className="space-y-5">
                {isItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-4 group/item"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5 flex-shrink-0 group-hover/item:scale-150 transition-transform duration-300" />
                    <p className="text-lg text-slate-900 font-medium leading-relaxed group-hover/item:text-blue-900 transition-colors">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-rose-100/80 via-amber-100/60 to-orange-100/50 rounded-3xl p-10 lg:p-12 border-2 border-rose-200/70 transition-all duration-500 hover:border-rose-300 hover:shadow-2xl hover:shadow-rose-200/40 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-200/0 via-amber-200/0 to-rose-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-rose-400/40">
                  <X className="w-8 h-8 text-white transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Regulation isn't</h2>
              </div>

              <ul className="space-y-5">
                {isntItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-4 group/item"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-rose-600 mt-1.5 flex-shrink-0 group-hover/item:scale-150 transition-transform duration-300" />
                    <p className="text-lg text-slate-900 font-medium leading-relaxed group-hover/item:text-rose-900 transition-colors">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
