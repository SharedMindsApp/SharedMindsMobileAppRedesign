import { useEffect, useState } from 'react';

export function MindMeshDemo() {
  const [nodes, setNodes] = useState<Array<{ id: number; x: number; y: number; opacity: number; scale: number }>>([]);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const sequence = [
      { id: 1, x: 30, y: 40 },
      { id: 2, x: 70, y: 30 },
      { id: 3, x: 50, y: 70 },
      { id: 4, x: 20, y: 75 },
      { id: 5, x: 80, y: 65 },
      { id: 6, x: 45, y: 25 },
      { id: 7, x: 60, y: 50 }
    ];

    sequence.forEach((node, index) => {
      setTimeout(() => {
        setNodes(prev => [...prev, { ...node, opacity: 0, scale: 0 }]);
        setTimeout(() => {
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, opacity: 1, scale: 1 } : n));
        }, 50);
      }, index * 400);
    });

    const pulseInterval = setInterval(() => {
      setPulse(prev => (prev + 1) % nodes.length);
    }, 600);

    const resetInterval = setInterval(() => {
      setNodes([]);
      sequence.forEach((node, index) => {
        setTimeout(() => {
          setNodes(prev => [...prev, { ...node, opacity: 0, scale: 0 }]);
          setTimeout(() => {
            setNodes(prev => prev.map(n => n.id === node.id ? { ...n, opacity: 1, scale: 1 } : n));
          }, 50);
        }, index * 400);
      });
    }, 5000);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(resetInterval);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full">
        {nodes.map((node, i) =>
          nodes.slice(i + 1).map((target) => (
            <line
              key={`${node.id}-${target.id}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              style={{
                opacity: Math.min(node.opacity, target.opacity) * 0.4,
                transition: 'opacity 0.4s ease-out'
              }}
            />
          ))
        )}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.6)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
          </linearGradient>
        </defs>
      </svg>
      {nodes.map((node, index) => (
        <div
          key={node.id}
          className="absolute rounded-full bg-gradient-to-br from-cyan-400 to-blue-400"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: pulse === index ? '16px' : '12px',
            height: pulse === index ? '16px' : '12px',
            transform: `translate(-50%, -50%) scale(${node.scale})`,
            opacity: node.opacity,
            transition: 'all 0.4s ease-out',
            boxShadow: pulse === index
              ? '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.4)'
              : '0 0 10px rgba(34, 211, 238, 0.5)'
          }}
        />
      ))}
    </div>
  );
}

export function RoadmapDemo() {
  const [blocks, setBlocks] = useState([
    { id: 1, left: 5, width: 22, color: 'cyan', height: 28 },
    { id: 2, left: 30, width: 28, color: 'blue', height: 36 },
    { id: 3, left: 62, width: 18, color: 'teal', height: 24 },
    { id: 4, left: 84, width: 12, color: 'purple', height: 20 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlocks(prev => prev.map(block => ({
        ...block,
        left: Math.max(0, Math.min(90, block.left + (Math.random() - 0.5) * 8)),
        width: Math.max(12, Math.min(32, block.width + (Math.random() - 0.5) * 6)),
        height: Math.max(20, Math.min(40, block.height + (Math.random() - 0.5) * 4))
      })));
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center px-4">
      <div className="relative w-full h-1 bg-gradient-to-r from-slate-800/20 via-slate-700/30 to-slate-800/20 rounded-full overflow-visible">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`absolute rounded-lg border transition-all duration-[1500ms] ease-out ${
              block.color === 'cyan'
                ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                : block.color === 'blue'
                ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : block.color === 'teal'
                ? 'bg-gradient-to-br from-teal-500/30 to-teal-600/10 border-teal-500/40 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
                : 'bg-gradient-to-br from-purple-500/30 to-purple-600/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            }`}
            style={{
              left: `${block.left}%`,
              width: `${block.width}%`,
              height: `${block.height}px`,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function TaskFlowDemo() {
  const [visibleTasks, setVisibleTasks] = useState<number[]>([0, 1, 2]);
  const [completedTask, setCompletedTask] = useState<number | null>(null);
  const tasks = [
    { id: 0, label: 'Review feedback', priority: 'high' },
    { id: 1, label: 'Draft outline', priority: 'medium' },
    { id: 2, label: 'Schedule call', priority: 'low' },
    { id: 3, label: 'Update docs', priority: 'medium' },
    { id: 4, label: 'Test feature', priority: 'high' },
    { id: 5, label: 'Deploy changes', priority: 'high' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedTask(visibleTasks[0]);
      setTimeout(() => {
        setVisibleTasks(prev => {
          const next = (prev[prev.length - 1] + 1) % tasks.length;
          return [...prev.slice(1), next];
        });
        setCompletedTask(null);
      }, 400);
    }, 1600);

    return () => clearInterval(interval);
  }, [visibleTasks]);

  return (
    <div className="relative w-full h-full flex items-center justify-center px-6">
      <div className="w-full space-y-2.5">
        {visibleTasks.map((taskId, index) => {
          const task = tasks[taskId];
          const isCompleting = completedTask === taskId;
          return (
            <div
              key={`${taskId}-${index}`}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-500 ease-out ${
                isCompleting
                  ? 'bg-teal-500/20 border-teal-500/40 scale-95 opacity-50'
                  : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/50'
              }`}
              style={{
                opacity: isCompleting ? 0.3 : 1 - (index * 0.15),
                transform: `translateY(${isCompleting ? '10px' : '0'}) scale(${isCompleting ? 0.95 : 1})`
              }}
            >
              <div className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                isCompleting
                  ? 'border-teal-400 bg-teal-400/20'
                  : task.priority === 'high'
                  ? 'border-cyan-400/50 bg-cyan-400/10'
                  : task.priority === 'medium'
                  ? 'border-blue-400/50 bg-blue-400/10'
                  : 'border-slate-400/50 bg-slate-400/10'
              }`}>
                {isCompleting && (
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </div>
              <div className={`text-sm flex-1 transition-all duration-300 ${
                isCompleting ? 'text-teal-300' : 'text-slate-300'
              }`}>
                {task.label}
              </div>
              {task.priority === 'high' && !isCompleting && (
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SideProjectsDemo() {
  const [activeContainer, setActiveContainer] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveContainer(prev => (prev + 1) % 3);
      setParticles(Array.from({ length: 3 }, (_, i) => ({
        id: Math.random(),
        x: Math.random() * 100,
        delay: i * 100
      })));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center gap-4 px-6">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`relative flex-1 h-40 rounded-2xl border transition-all duration-500 ease-out overflow-hidden ${
            activeContainer === index
              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan-500/40 scale-105 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
              : 'bg-slate-800/30 border-slate-700/30 scale-95 opacity-60'
          }`}
        >
          {activeContainer === index && (
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
          )}
          <div className="relative p-4 space-y-3 h-full flex flex-col">
            <div className={`w-14 h-2 rounded-full transition-all duration-400 ${
              activeContainer === index ? 'bg-cyan-400/60' : 'bg-slate-600/30'
            }`} />
            <div className={`w-10 h-1.5 rounded-full transition-all duration-400 delay-75 ${
              activeContainer === index ? 'bg-cyan-400/40' : 'bg-slate-600/20'
            }`} />
            <div className={`w-12 h-1.5 rounded-full transition-all duration-400 delay-150 ${
              activeContainer === index ? 'bg-cyan-400/40' : 'bg-slate-600/20'
            }`} />
            <div className="flex-1" />
            {activeContainer === index && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OffshootIdeasDemo() {
  const [ideas, setIdeas] = useState<Array<{ id: number; y: number; opacity: number; parked: boolean }>>([]);
  const [captureY, setCaptureY] = useState(30);

  useEffect(() => {
    let ideaId = 0;
    const sequence = setInterval(() => {
      const newY = 20 + Math.random() * 30;
      setCaptureY(newY);
      const id = ideaId++;

      setIdeas(prev => [...prev, { id, y: newY, opacity: 1, parked: false }]);

      setTimeout(() => {
        setIdeas(prev => prev.map(idea =>
          idea.id === id ? { ...idea, parked: true, y: 70 + (prev.length % 3) * 8 } : idea
        ));
      }, 600);

      setTimeout(() => {
        setIdeas(prev => prev.filter(idea => idea.id !== id));
      }, 2200);
    }, 2000);

    return () => clearInterval(sequence);
  }, []);

  return (
    <div className="relative w-full h-full px-6 py-8">
      <div
        className="absolute left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl border bg-gradient-to-br from-blue-500/30 to-purple-500/20 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300"
        style={{ top: `${captureY}%` }}
      >
        <div className="text-sm font-medium text-blue-200">💡</div>
      </div>

      <div className="absolute bottom-8 right-6 space-y-2">
        <div className="text-xs text-slate-500 mb-3">Parked ideas</div>
        {ideas.filter(idea => idea.parked).map((idea, index) => (
          <div
            key={idea.id}
            className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/40 transition-all duration-500 flex items-center gap-2"
            style={{
              opacity: idea.opacity,
              transform: `translateX(${idea.parked ? 0 : 100}px)`
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
            <div className="w-12 h-1 rounded-full bg-slate-500/40" />
          </div>
        ))}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {ideas.map((idea) => (
          <path
            key={`path-${idea.id}`}
            d={`M ${window.innerWidth / 2} ${captureY * 4} Q ${window.innerWidth * 0.7} ${captureY * 4 + 100} ${window.innerWidth * 0.85} ${idea.y * 6}`}
            stroke="rgba(147, 51, 234, 0.3)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
            style={{
              opacity: idea.parked ? 0.4 : 0,
              transition: 'opacity 0.5s ease-out'
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function FocusModeDemo() {
  const [focused, setFocused] = useState(false);
  const [breathe, setBreathe] = useState(0);
  const [distractions, setDistractions] = useState<Array<{ id: number; x: number; y: number; opacity: number }>>([]);

  useEffect(() => {
    const focusInterval = setInterval(() => {
      setFocused(prev => !prev);
    }, 2500);

    const breatheInterval = setInterval(() => {
      setBreathe(prev => (prev + 1) % 3);
    }, 800);

    const distractionInterval = setInterval(() => {
      if (!focused) {
        setDistractions(prev => [
          ...prev,
          {
            id: Math.random(),
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            opacity: 1
          }
        ]);
      }
    }, 1000);

    return () => {
      clearInterval(focusInterval);
      clearInterval(breatheInterval);
      clearInterval(distractionInterval);
    };
  }, [focused]);

  useEffect(() => {
    if (focused) {
      setDistractions([]);
    }
  }, [focused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center px-6 overflow-hidden">
      {distractions.map((distraction) => (
        <div
          key={distraction.id}
          className="absolute w-2 h-2 rounded-full bg-slate-400/30 animate-pulse"
          style={{
            left: `${distraction.x}%`,
            top: `${distraction.y}%`,
            opacity: distraction.opacity * (focused ? 0 : 1),
            transition: 'opacity 0.5s ease-out'
          }}
        />
      ))}

      <div className="relative w-full max-w-sm">
        <div
          className={`absolute inset-0 rounded-2xl border-2 transition-all duration-[1200ms] ease-in-out ${
            focused
              ? 'border-teal-400/60 scale-100 shadow-[0_0_40px_rgba(20,184,166,0.4),inset_0_0_30px_rgba(20,184,166,0.1)]'
              : 'border-slate-700/30 scale-110 shadow-none'
          }`}
          style={{
            transform: focused
              ? `scale(${1 + breathe * 0.01})`
              : 'scale(1.1)'
          }}
        />

        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-[1200ms] ease-in-out ${
            focused
              ? 'bg-gradient-to-br from-teal-500/10 to-cyan-500/5'
              : 'bg-transparent'
          }`}
        />

        <div
          className={`relative rounded-xl p-8 transition-all duration-1000 ${
            focused ? 'bg-slate-800/60 backdrop-blur-sm' : 'bg-slate-800/20'
          }`}
        >
          <div className="space-y-3">
            <div className={`h-2.5 rounded-full transition-all duration-700 ${
              focused ? 'w-28 bg-teal-400/50' : 'w-20 bg-slate-600/30'
            }`} />
            <div className={`h-2 rounded-full transition-all duration-700 delay-100 ${
              focused ? 'w-20 bg-teal-400/40' : 'w-16 bg-slate-600/20'
            }`} />
            <div className={`h-2 rounded-full transition-all duration-700 delay-200 ${
              focused ? 'w-24 bg-teal-400/30' : 'w-14 bg-slate-600/20'
            }`} />
          </div>

          {focused && (
            <div className="mt-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <div className="text-xs text-teal-300/80">Active</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
