import React, { useState, useEffect } from 'react';
import { Eye, Calendar, Check, Shield } from 'lucide-react';

export default function SignalsSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [patternNodes, setPatternNodes] = useState<Array<{ x: number; y: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const nodes = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }));
    setPatternNodes(nodes);
  }, []);

  const cards = [
    {
      icon: Eye,
      title: 'Signals are read-only',
      description: 'They observe patterns without demanding changes.',
      color: 'blue',
      pattern: 'observe',
    },
    {
      icon: Calendar,
      title: 'They expire automatically',
      description: 'No accumulation of guilt or unread notifications.',
      color: 'cyan',
      pattern: 'expire',
    },
    {
      icon: Check,
      title: 'Can be dismissed instantly',
      description: "You're always in control of what you see.",
      color: 'blue',
      pattern: 'control',
    },
    {
      icon: Shield,
      title: 'Exist only inside Regulation',
      description: 'They never intrude into your workspace.',
      color: 'cyan',
      pattern: 'boundary',
    },
  ];

  const getColorClasses = (color: string, type: 'bg' | 'border' | 'text' | 'hover-bg' | 'hover-border' | 'hover-shadow') => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        'hover-bg': 'group-hover:bg-blue-100',
        'hover-border': 'hover:border-blue-300',
        'hover-shadow': 'hover:shadow-blue-200/40',
      },
      cyan: {
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-600',
        'hover-bg': 'group-hover:bg-cyan-100',
        'hover-border': 'hover:border-cyan-300',
        'hover-shadow': 'hover:shadow-cyan-200/40',
      },
    };
    return colors[color as keyof typeof colors][type];
  };

  const renderPatternVisualization = (pattern: string, isHovered: boolean) => {
    if (!isHovered) return null;

    switch (pattern) {
      case 'observe':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-full border-2 border-blue-400/20 rounded-full"
                  style={{
                    width: `${(i + 1) * 33}%`,
                    height: `${(i + 1) * 33}%`,
                    animation: `ripple ${2 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        );
      case 'expire':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute top-4 right-4 flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400/40 rounded-full"
                  style={{
                    height: `${20 + Math.sin(i) * 15}px`,
                    animation: `fadeBar 2s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        );
      case 'control':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-20 h-20">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-400/40 rounded-full"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-30px)`,
                      animation: `orbit 3s linear infinite`,
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 'boundary':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="boundaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: 'rgb(6, 182, 212)', stopOpacity: 0.1 }} />
                </linearGradient>
              </defs>
              <path
                d="M 30 100 Q 70 70, 100 100 T 170 100"
                fill="none"
                stroke="url(#boundaryGradient)"
                strokeWidth="2"
                className="animate-[drawPath_2s_ease-in-out_infinite]"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="py-32 sm:py-40 bg-gradient-to-b from-white via-blue-50/20 to-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: Math.max(0, 1 - Math.abs(scrollY - 2000) / 800) }}
      >
        {patternNodes.map((node, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/20 rounded-full"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              animation: `pulse ${node.duration}s ease-in-out infinite`,
              animationDelay: `${node.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-20 space-y-6">
          <div className="inline-block">
            <div className="flex items-center gap-3 mb-4 justify-center">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-blue-400/50 rounded-full" />
              <div className="w-2 h-2 bg-blue-500/60 rounded-full animate-pulse" />
              <div className="w-12 h-0.5 bg-gradient-to-l from-transparent via-cyan-400/50 to-cyan-400/50 rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Signals: noticing patterns, calmly
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Signals appear when certain patterns repeat — like rapid context switching, expanding scope, or fragmented focus. They don't interrupt you, notify you, or demand action.
          </p>
        </div>

        <div className="relative mb-16">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-full h-full max-w-2xl opacity-10" viewBox="0 0 400 400">
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx="200"
                  cy="200"
                  r={30 + i * 25}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="1"
                  opacity={0.5 - i * 0.08}
                  style={{
                    animation: `breathe ${4 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </svg>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 relative z-10">
            {cards.map((card, index) => {
              const Icon = card.icon;
              const isHovered = hoveredCard === index;

              return (
                <div
                  key={index}
                  className={`group relative bg-white/70 backdrop-blur-md rounded-3xl p-8 border-2 ${getColorClasses(card.color, 'border')} transition-all duration-700 ${getColorClasses(card.color, 'hover-border')} hover:shadow-2xl ${getColorClasses(card.color, 'hover-shadow')} hover:-translate-y-2 hover:bg-white/90`}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                  }}
                >
                  {renderPatternVisualization(card.pattern, isHovered)}

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-14 h-14 rounded-2xl ${getColorClasses(card.color, 'bg')} flex items-center justify-center transition-all duration-500 ${getColorClasses(card.color, 'hover-bg')} group-hover:scale-125 group-hover:rotate-6`}
                      >
                        <Icon className={`w-7 h-7 ${getColorClasses(card.color, 'text')} transition-all duration-500 group-hover:scale-110`} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-slate-800">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed transition-colors duration-300 group-hover:text-slate-700">
                      {card.description}
                    </p>
                  </div>

                  <div className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color === 'blue' ? 'from-blue-400/10' : 'from-cyan-400/10'} to-transparent rounded-full blur-2xl`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-blue-50/80 via-cyan-50/60 to-blue-50/80 backdrop-blur-sm rounded-3xl p-10 border-2 border-blue-100/60 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-300/30 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />
          </div>

          <div className="relative z-10 flex items-center justify-center gap-4">
            <div className="w-2 h-2 bg-blue-500/40 rounded-full animate-pulse" />
            <p className="text-center text-xl text-slate-800 font-medium leading-relaxed">
              Signals are observations — not warnings.
            </p>
            <div className="w-2 h-2 bg-cyan-500/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
        }

        @keyframes fadeBar {
          0%, 100% {
            opacity: 0.4;
            height: 20px;
          }
          50% {
            opacity: 0.1;
            height: 8px;
          }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateY(-30px);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateY(-30px);
          }
        }

        @keyframes drawPath {
          0%, 100% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
          50% {
            stroke-dashoffset: 100;
            opacity: 0.6;
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
      `}</style>
    </section>
  );
}
