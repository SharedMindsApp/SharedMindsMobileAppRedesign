import { useEffect, useState } from 'react';

export default function RegulationHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollOpacity = Math.max(0, 1 - scrollY / 400);

  return (
    <section className="relative py-20 sm:py-24 lg:py-32 overflow-hidden min-h-[90vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)
            `,
            animation: 'gradientDrift 25s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Regulation that supports you — without telling you what to do
            </h1>
            <p className="text-xl sm:text-2xl text-slate-700 leading-relaxed">
              SharedMinds Regulation helps make patterns visible so you can respond with clarity, not guilt.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Instead of alerts, scores, or nudges, Regulation offers calm signals, gentle orientation, and optional tools that respect your autonomy.
            </p>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-200/50 lg:hidden">
              <img
                src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Person in calm, focused state working thoughtfully"
                loading="lazy"
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
            </div>
          </div>

          <div className="relative h-[600px] hidden lg:block">
            <div
              className="absolute top-8 left-12 w-64 h-48 rounded-3xl bg-gradient-to-br from-blue-200/80 to-cyan-200/60 backdrop-blur-sm border-2 border-blue-300/50 shadow-2xl shadow-blue-200/40 p-6"
              style={{
                transform: `translateY(${scrollY * 0.05}px) rotate(-2deg)`,
                animation: 'floatGentle 8s ease-in-out infinite',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600/80 animate-pulse" />
                  <div className="h-2 bg-blue-500/50 rounded-full w-32" />
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 bg-white/60 rounded-full w-full" />
                  <div className="h-1.5 bg-white/60 rounded-full w-4/5" />
                </div>
                <div className="pt-4">
                  <div className="flex gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-3 bg-blue-400/60 rounded-sm"
                        style={{ height: `${Math.random() * 40 + 20}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute top-32 right-8 w-56 h-40 rounded-3xl bg-gradient-to-br from-amber-200/70 to-yellow-200/50 backdrop-blur-sm border-2 border-amber-300/50 shadow-xl shadow-amber-200/30 p-5"
              style={{
                transform: `translateY(${scrollY * 0.08}px) rotate(3deg)`,
                animation: 'floatGentle 10s ease-in-out infinite 1s',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/50" />
                  <div className="h-1.5 bg-amber-400/60 rounded-full w-16" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-white/50 rounded-full w-full" />
                  <div className="h-2 bg-white/50 rounded-full w-3/4" />
                  <div className="h-2 bg-white/50 rounded-full w-5/6" />
                </div>
                <div className="pt-2 flex gap-1.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-300/40" />
                  <div className="w-12 h-12 rounded-xl bg-blue-300/50" />
                  <div className="w-12 h-12 rounded-xl bg-cyan-300/50" />
                </div>
              </div>
            </div>

            <div
              className="absolute top-96 left-24 w-48 h-32 rounded-3xl bg-gradient-to-br from-cyan-200/70 to-teal-200/60 backdrop-blur-sm border-2 border-cyan-300/50 shadow-xl shadow-cyan-200/30 p-4"
              style={{
                transform: `translateY(${scrollY * 0.06}px) rotate(1deg)`,
                animation: 'floatGentle 9s ease-in-out infinite 2s',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/60" />
                <div className="h-1.5 bg-cyan-400/60 rounded-full w-20" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-white/60"
                    style={{ opacity: 0.4 + Math.random() * 0.5 }}
                  />
                ))}
              </div>
            </div>

            <div
              className="absolute bottom-24 right-16 w-52 h-36 rounded-3xl bg-gradient-to-br from-blue-200/80 to-cyan-300/60 backdrop-blur-sm border-2 border-blue-400/50 shadow-2xl shadow-blue-200/40 p-5"
              style={{
                transform: `translateY(${scrollY * 0.07}px) rotate(-1deg)`,
                animation: 'floatGentle 11s ease-in-out infinite 0.5s',
              }}
            >
              <div className="relative h-full">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="25"
                      fill="none"
                      stroke="rgb(6, 182, 212)"
                      strokeWidth="1"
                      opacity="0.6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="15"
                      fill="none"
                      stroke="rgb(20, 184, 166)"
                      strokeWidth="1"
                      opacity="0.7"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="h-1.5 bg-blue-400/60 rounded-full w-full" />
                </div>
              </div>
            </div>

            <div
              className="absolute top-64 right-32 w-44 h-28 rounded-2xl bg-gradient-to-br from-teal-200/70 to-cyan-200/60 backdrop-blur-sm border-2 border-teal-300/50 shadow-lg shadow-teal-200/30 p-4"
              style={{
                transform: `translateY(${scrollY * 0.09}px) rotate(2deg)`,
                animation: 'floatGentle 7s ease-in-out infinite 1.5s',
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-teal-500/50"
                    style={{ opacity: 0.4 + i * 0.15 }}
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-white/60 rounded-full w-full" />
                <div className="h-1.5 bg-white/60 rounded-full w-4/5" />
                <div className="h-1.5 bg-white/60 rounded-full w-3/5" />
              </div>
            </div>

            <div
              className="absolute bottom-44 left-16 w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-300/70 to-cyan-200/60 backdrop-blur-sm border-2 border-blue-400/50 shadow-xl shadow-blue-200/30 p-3"
              style={{
                transform: `translateY(${scrollY * 0.04}px) rotate(-3deg)`,
                animation: 'floatGentle 12s ease-in-out infinite 3s',
              }}
            >
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-300/30 to-cyan-300/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-400/50 mx-auto mb-2" />
                  <div className="h-1.5 bg-cyan-400/60 rounded-full w-16 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradientDrift {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(2%, -2%) scale(1.02);
          }
          50% {
            transform: translate(-2%, 2%) scale(0.98);
          }
          75% {
            transform: translate(2%, 2%) scale(1.01);
          }
        }

        @keyframes floatGentle {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-15px) translateX(8px);
          }
        }
      `}</style>
    </section>
  );
}
