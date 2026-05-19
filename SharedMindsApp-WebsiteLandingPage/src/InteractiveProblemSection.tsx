import { useState, useEffect, useRef } from 'react';
import { Zap, Brain, Users } from 'lucide-react';
import TagModal from './TagModal';
import { tagMapping, type TagData } from './tagData';

interface Problem {
  icon: typeof Zap;
  title: string;
  subtitle: string;
  description: string;
  insight: string;
  tags: string[];
  color: string;
  colorHex: string;
}

interface Particle {
  id: number;
  pathIndex: number;
  progress: number;
  speed: number;
}

export default function InteractiveProblemSection() {
  const [activeCard, setActiveCard] = useState<number>(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagData | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number>();

  const problems: Problem[] = [
    {
      icon: Zap,
      title: 'Time & Energy',
      subtitle: 'Planning fails when systems ignore how you work',
      description: 'Traditional tools assume endless focus and consistent energy. But that\'s not how humans work. We have different rhythms, different capacity on different days, and different ways of managing attention.',
      insight: 'Most productivity tools fail here.',
      tags: ['Focus', 'Capacity', 'Rhythm', 'Recovery'],
      color: 'from-blue-500 to-cyan-500',
      colorHex: '#3b82f6',
    },
    {
      icon: Brain,
      title: 'Externalising Thinking',
      subtitle: 'Organisation fails when everything stays in your head',
      description: 'Trying to hold everything in working memory is exhausting. Tasks, context, decisions, reminders—when these live only in your mind, organisation becomes overwhelming before you even start.',
      insight: 'Your mind is for thinking, not storing.',
      tags: ['Tasks', 'Notes', 'Context', 'Memory'],
      color: 'from-emerald-500 to-teal-500',
      colorHex: '#10b981',
    },
    {
      icon: Users,
      title: 'Shared Context',
      subtitle: 'Work breaks down when information isn\'t shared',
      description: 'When people don\'t have access to the same information, conversations, and decisions, everything becomes harder. Collaboration requires shared understanding, not just shared files.',
      insight: 'Alignment happens through shared understanding.',
      tags: ['Conversations', 'Clarity', 'Coordination', 'Visibility'],
      color: 'from-amber-500 to-orange-500',
      colorHex: '#f59e0b',
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const sectionRect = sectionRef.current.getBoundingClientRect();
      const viewportMiddle = window.innerHeight / 2;

      if (sectionRect.top < viewportMiddle && sectionRect.bottom > viewportMiddle) {
        let closestCard = 0;
        let minDistance = Infinity;

        cardsRef.current.forEach((card, index) => {
          if (card) {
            const cardRect = card.getBoundingClientRect();
            const cardMiddle = cardRect.top + cardRect.height / 2;
            const distance = Math.abs(cardMiddle - viewportMiddle);

            if (distance < minDistance) {
              minDistance = distance;
              closestCard = index;
            }
          }
        });

        setActiveCard(closestCard);

        const sectionHeight = sectionRect.height;
        const scrolled = window.innerHeight - sectionRect.top;
        const progress = Math.min(Math.max(scrolled / sectionHeight, 0), 1);
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const section = sectionRef.current;
    section?.addEventListener('mousemove', handleMouseMove);

    return () => section?.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const initialParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      pathIndex: i % 3,
      progress: (i / 4) * 0.33,
      speed: 0.002 + Math.random() * 0.003,
    }));
    setParticles(initialParticles);

    const animate = () => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          progress: (p.progress + p.speed) % 1,
        }))
      );
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getPathPoint = (pathIndex: number, progress: number) => {
    const paths = [
      { x1: 33, y1: 50, x2: 66, y2: 50 },
      { x1: 33, y1: 50, x2: 50, y2: 75 },
      { x1: 66, y1: 50, x2: 50, y2: 75 },
    ];

    const path = paths[pathIndex];
    return {
      x: path.x1 + (path.x2 - path.x1) * progress,
      y: path.y1 + (path.y2 - path.y1) * progress,
    };
  };

  const isPathActive = (pathIndex: number): boolean => {
    if (pathIndex === 0) return activeCard === 0 || activeCard === 1;
    if (pathIndex === 1) return activeCard === 0 || activeCard === 2;
    if (pathIndex === 2) return activeCard === 1 || activeCard === 2;
    return false;
  };

  const handleTagClick = (tagName: string) => {
    const tagData = tagMapping[tagName];
    if (tagData) {
      setSelectedTag(tagData);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedTag(null);
    }, 300);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30 transition-opacity duration-1000">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${problems[activeCard].colorHex}40, transparent)`,
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
          }}
        ></div>
        <div
          className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${problems[(activeCard + 1) % 3].colorHex}40, transparent)`,
            transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)`,
          }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${problems[(activeCard + 2) % 3].colorHex}30, transparent)`,
            transform: `translate(-50%, -50%) scale(${1 + scrollProgress * 0.2})`,
          }}
        ></div>
      </div>

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${problems[activeCard].colorHex} 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          transition: 'background-image 0.7s ease',
        }}
      ></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            <span className="inline-block" style={{ animation: hasAnimated ? 'fadeInUp 0.6s ease-out' : 'none' }}>
              Organisation isn't broken—
            </span>
            <br />
            <span className="inline-block" style={{ animation: hasAnimated ? 'fadeInUp 0.6s ease-out 0.2s backwards' : 'none' }}>
              the tools are.
            </span>
          </h2>
          <p
            className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
            style={{ animation: hasAnimated ? 'fadeInUp 0.6s ease-out 0.4s backwards' : 'none' }}
          >
            Most productivity tools ignore the fundamentals of how people actually work. SharedMinds starts from reality.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
            style={{ zIndex: 0 }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <linearGradient id="line0" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={activeCard === 0 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#10b981" stopOpacity={activeCard === 1 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={activeCard === 0 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={activeCard === 2 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <linearGradient id="line2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity={activeCard === 1 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={activeCard === 2 ? "0.7" : "0.2"}>
                  <animate attributeName="stop-opacity" values="0.7;0.9;0.7" dur="2s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>

            <line
              x1="33%"
              y1="50%"
              x2="66%"
              y2="50%"
              stroke="url(#line0)"
              strokeWidth={activeCard === 0 || activeCard === 1 ? "4" : "2"}
              strokeLinecap="round"
              className="transition-all duration-700"
              filter={activeCard === 0 || activeCard === 1 ? "url(#glow)" : ""}
            />
            <line
              x1="33%"
              y1="50%"
              x2="50%"
              y2="75%"
              stroke="url(#line1)"
              strokeWidth={activeCard === 0 || activeCard === 2 ? "4" : "2"}
              strokeLinecap="round"
              className="transition-all duration-700"
              filter={activeCard === 0 || activeCard === 2 ? "url(#glow)" : ""}
            />
            <line
              x1="66%"
              y1="50%"
              x2="50%"
              y2="75%"
              stroke="url(#line2)"
              strokeWidth={activeCard === 1 || activeCard === 2 ? "4" : "2"}
              strokeLinecap="round"
              className="transition-all duration-700"
              filter={activeCard === 1 || activeCard === 2 ? "url(#glow)" : ""}
            />

            {particles.map((particle) => {
              const point = getPathPoint(particle.pathIndex, particle.progress);
              const isActive = isPathActive(particle.pathIndex);

              return (
                <circle
                  key={particle.id}
                  cx={`${point.x}%`}
                  cy={`${point.y}%`}
                  r={isActive ? "4" : "2"}
                  fill={
                    particle.pathIndex === 0 ? "#3b82f6" :
                    particle.pathIndex === 1 ? "#10b981" :
                    "#f59e0b"
                  }
                  opacity={isActive ? 0.8 : 0.3}
                  filter={isActive ? "url(#glow)" : ""}
                  className="transition-all duration-300"
                />
              );
            })}

            <circle
              cx="50%"
              cy="62.5%"
              r="16"
              fill="white"
              stroke={problems[activeCard].colorHex}
              strokeWidth="3"
              filter="url(#glow)"
              className="transition-all duration-700"
              style={{
                transformOrigin: '50% 62.5%',
              }}
            >
              <animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" values="3;4;3" dur="2s" repeatCount="indefinite" />
            </circle>

            <text
              x="50%"
              y="62.5%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={problems[activeCard].colorHex}
              fontSize="10"
              fontWeight="bold"
              className="transition-all duration-700"
            >
              SM
            </text>
          </svg>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {problems.slice(0, 2).map((problem, index) => {
              const isActive = activeCard === index;
              const animationDelay = hasAnimated ? `${index * 150}ms` : '0ms';

              return (
                <div
                  key={index}
                  ref={(el) => (cardsRef.current[index] = el)}
                  className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-lg border-2 transition-all duration-700 ${
                    isActive
                      ? 'border-slate-300 shadow-2xl'
                      : 'border-slate-100 opacity-75'
                  } ${
                    hasAnimated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{
                    position: 'relative',
                    zIndex: isActive ? 10 : 1,
                    transitionDelay: animationDelay,
                    transform: isActive
                      ? `scale(1.05) translateY(${Math.sin(Date.now() / 1000) * 2}px)`
                      : 'scale(1)',
                    animation: !isActive ? `float 6s ease-in-out infinite ${index * 0.5}s` : 'none',
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${problem.color} rounded-3xl transition-all duration-700 ${
                      isActive ? 'opacity-10' : 'opacity-0'
                    }`}
                  ></div>

                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700"
                    style={{
                      opacity: isActive ? 0.15 : 0,
                      background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${problem.colorHex}40, transparent 40%)`,
                    }}
                  ></div>

                  <div className="relative">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${problem.color} shadow-lg mb-6 transition-all duration-500 ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                      style={{
                        animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                        boxShadow: isActive ? `0 0 30px ${problem.colorHex}60` : '',
                        transform: isActive ? `rotate(${Math.sin(Date.now() / 500) * 5}deg)` : 'rotate(0deg)',
                      }}
                    >
                      <problem.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {problem.title.split('').map((char, i) => (
                        <span
                          key={i}
                          className="inline-block"
                          style={{
                            animation: isActive ? `letterFadeIn 0.5s ease-out ${i * 0.03}s backwards` : 'none',
                          }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </h3>
                    <p className="text-lg text-slate-600 font-medium mb-4">
                      {problem.subtitle}
                    </p>

                    <div className="mb-6">
                      <p className="text-slate-700 leading-relaxed mb-3">
                        {problem.description}
                      </p>
                      <div
                        className={`relative overflow-hidden transition-all duration-500 ${
                          isActive ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                          style={{
                            animation: isActive ? 'shimmer 2s infinite' : 'none',
                          }}
                        ></div>
                        <p className={`text-sm font-semibold bg-gradient-to-r ${problem.color} bg-clip-text text-transparent py-2`}>
                          {problem.insight}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {problem.tags.map((tag, tagIndex) => (
                        <button
                          key={tagIndex}
                          onClick={() => handleTagClick(tag)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r ${problem.color} text-white shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer active:scale-95`}
                          style={{
                            animation: isActive ? `tagBounce 0.5s ease-out ${tagIndex * 0.1}s` : 'none',
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`absolute -bottom-px left-0 right-0 h-1.5 bg-gradient-to-r ${problem.color} rounded-b-3xl transition-all duration-500 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                    style={{
                      boxShadow: isActive ? `0 0 20px ${problem.colorHex}80` : '',
                    }}
                  ></div>

                  <div
                    className="absolute -inset-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 rounded-3xl"
                    style={{
                      animation: isActive ? 'borderShimmer 3s infinite' : 'none',
                    }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 max-w-2xl mx-auto">
            {problems.slice(2).map((problem, index) => {
              const cardIndex = index + 2;
              const isActive = activeCard === cardIndex;
              const animationDelay = hasAnimated ? `${cardIndex * 150}ms` : '0ms';

              return (
                <div
                  key={cardIndex}
                  ref={(el) => (cardsRef.current[cardIndex] = el)}
                  className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-lg border-2 transition-all duration-700 ${
                    isActive
                      ? 'border-slate-300 shadow-2xl'
                      : 'border-slate-100 opacity-75'
                  } ${
                    hasAnimated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{
                    position: 'relative',
                    zIndex: isActive ? 10 : 1,
                    transitionDelay: animationDelay,
                    transform: isActive
                      ? `scale(1.05) translateY(${Math.sin(Date.now() / 1000) * 2}px)`
                      : 'scale(1)',
                    animation: !isActive ? `float 6s ease-in-out infinite ${cardIndex * 0.5}s` : 'none',
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${problem.color} rounded-3xl transition-all duration-700 ${
                      isActive ? 'opacity-10' : 'opacity-0'
                    }`}
                  ></div>

                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700"
                    style={{
                      opacity: isActive ? 0.15 : 0,
                      background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${problem.colorHex}40, transparent 40%)`,
                    }}
                  ></div>

                  <div className="relative">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${problem.color} shadow-lg mb-6 transition-all duration-500 ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                      style={{
                        animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                        boxShadow: isActive ? `0 0 30px ${problem.colorHex}60` : '',
                        transform: isActive ? `rotate(${Math.sin(Date.now() / 500) * 5}deg)` : 'rotate(0deg)',
                      }}
                    >
                      <problem.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {problem.title.split('').map((char, i) => (
                        <span
                          key={i}
                          className="inline-block"
                          style={{
                            animation: isActive ? `letterFadeIn 0.5s ease-out ${i * 0.03}s backwards` : 'none',
                          }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </h3>
                    <p className="text-lg text-slate-600 font-medium mb-4">
                      {problem.subtitle}
                    </p>

                    <div className="mb-6">
                      <p className="text-slate-700 leading-relaxed mb-3">
                        {problem.description}
                      </p>
                      <div
                        className={`relative overflow-hidden transition-all duration-500 ${
                          isActive ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                          style={{
                            animation: isActive ? 'shimmer 2s infinite' : 'none',
                          }}
                        ></div>
                        <p className={`text-sm font-semibold bg-gradient-to-r ${problem.color} bg-clip-text text-transparent py-2`}>
                          {problem.insight}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {problem.tags.map((tag, tagIndex) => (
                        <button
                          key={tagIndex}
                          onClick={() => handleTagClick(tag)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r ${problem.color} text-white shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer active:scale-95`}
                          style={{
                            animation: isActive ? `tagBounce 0.5s ease-out ${tagIndex * 0.1}s` : 'none',
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`absolute -bottom-px left-0 right-0 h-1.5 bg-gradient-to-r ${problem.color} rounded-b-3xl transition-all duration-500 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                    style={{
                      boxShadow: isActive ? `0 0 20px ${problem.colorHex}80` : '',
                    }}
                  ></div>

                  <div
                    className="absolute -inset-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 rounded-3xl"
                    style={{
                      animation: isActive ? 'borderShimmer 3s infinite' : 'none',
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center mt-12 gap-3">
          {problems.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                activeCard === index ? 'w-12' : 'w-8 opacity-40'
              }`}
              style={{
                backgroundColor: problems[index].colorHex,
              }}
            ></div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            SharedMinds is built around these realities. Our features—Guardrails, Spaces, and Regulation—work together to support how you actually think and work.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes letterFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes tagBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes borderShimmer {
          0% {
            transform: translateX(-100%) translateY(-100%);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(100%) translateY(100%);
            opacity: 0;
          }
        }
      `}</style>

      <TagModal isOpen={isModalOpen} onClose={handleCloseModal} tag={selectedTag} />
    </section>
  );
}
