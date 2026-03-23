import { useState } from 'react';
import { Brain, Target, Zap, Eye, TrendingUp, RefreshCw } from 'lucide-react';

interface LoopNode {
  id: string;
  label: string;
  icon: typeof Brain;
  description: string;
  color: string;
}

const loopNodes: LoopNode[] = [
  {
    id: 'understand',
    label: 'Understand',
    icon: Brain,
    description: 'Each person shares their unique perspective through gentle, accessible questions.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'align',
    label: 'Align',
    icon: Target,
    description: 'See where your perspectives match and where they differ—without judgment.',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'act',
    label: 'Act',
    icon: Zap,
    description: 'Follow practical, neurotype-specific strategies that work for your home.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'reflect',
    label: 'Reflect',
    icon: Eye,
    description: 'Notice what works, what helps, and how your household is evolving.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: TrendingUp,
    description: 'Grow together with adaptive recommendations and deeper understanding.',
    color: 'from-violet-500 to-purple-500',
  },
];

export function FeedbackLoop() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="relative py-12 overflow-visible">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <RefreshCw size={32} className="text-teal-600" />
          <h3 className="text-3xl font-bold text-gray-900">
            A Continuous Journey of Growth
          </h3>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          SharedMinds isn't a one-time assessment. It's an ongoing process that evolves with your household.
        </p>
      </div>

      <div
        className="relative max-w-4xl mx-auto px-4 sm:px-8"
        style={{ minHeight: '700px' }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setActiveNode(null);
        }}
      >
        <svg
          viewBox="0 0 600 600"
          className="w-full h-auto"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="300"
            cy="300"
            r="180"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="8 6"
            className="opacity-40"
          />

          <circle
            cx="300"
            cy="300"
            r="180"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeDasharray="1130"
            strokeDashoffset="1130"
            className={isHovering ? 'animate-draw-circle' : ''}
            style={{
              transition: 'stroke-dashoffset 2s ease-out',
            }}
          />

          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        <style>{`
          @keyframes draw-circle {
            to {
              stroke-dashoffset: 0;
            }
          }
          .animate-draw-circle {
            animation: draw-circle 2s ease-out forwards;
          }
        `}</style>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <RefreshCw size={48} className="mx-auto text-teal-600 opacity-30 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        {loopNodes.map((node, index) => {
          const angle = (index * (360 / loopNodes.length) - 90) * (Math.PI / 180);
          const x = 300 + 180 * Math.cos(angle);
          const y = 300 + 180 * Math.sin(angle);
          const Icon = node.icon;

          const isActive = activeNode === node.id;

          const isTopHalf = y < 300;
          const isLeftSide = x < 300;
          const isRightSide = x > 300;

          let tooltipClasses = 'absolute w-72 sm:w-64 z-50 animate-fadeInUp';
          if (isTopHalf) {
            tooltipClasses += ' top-full mt-20';
          } else {
            tooltipClasses += ' bottom-full mb-20';
          }

          if (isLeftSide) {
            tooltipClasses += ' left-0 sm:left-0';
          } else if (isRightSide) {
            tooltipClasses += ' right-0 sm:right-0';
          } else {
            tooltipClasses += ' left-1/2 -translate-x-1/2';
          }

          return (
            <div
              key={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${(x / 600) * 100}%`,
                top: `${(y / 600) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setActiveNode(node.id)}
            >
              <div
                className={`
                  relative group cursor-pointer transition-all duration-300
                  ${isActive ? 'scale-110 z-30' : 'scale-100 hover:scale-105 z-10'}
                `}
              >
                <div
                  className={`
                    w-24 h-24 rounded-full bg-gradient-to-br ${node.color}
                    flex items-center justify-center shadow-xl
                    transition-all duration-300
                    ${isActive ? 'shadow-2xl ring-4 ring-white' : 'hover:shadow-2xl'}
                  `}
                  style={{
                    filter: isActive ? 'brightness(1.1)' : undefined,
                  }}
                >
                  <Icon size={32} className="text-white" />
                </div>

                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center">
                  <div className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg shadow-md border border-gray-100">
                    <p className={`font-bold text-gray-900 transition-all whitespace-nowrap ${isActive ? 'text-lg' : 'text-base'}`}>
                      {node.label}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className={tooltipClasses}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-gray-200">
                      {isTopHalf ? (
                        <div className={`absolute -top-2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-200 rotate-45 ${isLeftSide ? 'left-6' : isRightSide ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
                      ) : (
                        <div className={`absolute -bottom-2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 rotate-45 ${isLeftSide ? 'left-6' : isRightSide ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
                      )}
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {node.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-24 text-center">
        <p className="text-lg text-gray-600 italic max-w-2xl mx-auto">
          This cycle continues as your household grows and changes. SharedMinds adapts with you, offering deeper insights and evolving support over time.
        </p>
      </div>
    </div>
  );
}
