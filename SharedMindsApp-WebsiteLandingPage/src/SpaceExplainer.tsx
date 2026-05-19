import { useState, useEffect } from 'react';
import { StickyNote, Target, Calendar, Move } from 'lucide-react';

interface Widget {
  id: string;
  type: 'note' | 'goal' | 'calendar';
  title: string;
  content: string;
  positions: {
    place: { x: number; y: number; rotation: number };
    move: { x: number; y: number; rotation: number };
    connect: { x: number; y: number; rotation: number };
  };
}

const widgets: Widget[] = [
  {
    id: 'note',
    type: 'note',
    title: 'Quick Note',
    content: 'Call dentist tomorrow',
    positions: {
      place: { x: 15, y: 30, rotation: -3 },
      move: { x: 50, y: 35, rotation: 2 },
      connect: { x: 10, y: 25, rotation: -2 }
    }
  },
  {
    id: 'goal',
    type: 'goal',
    title: 'Q1 Goal',
    content: 'Launch beta version',
    positions: {
      place: { x: 55, y: 45, rotation: 4 },
      move: { x: 20, y: 50, rotation: -3 },
      connect: { x: 55, y: 40, rotation: 3 }
    }
  },
  {
    id: 'calendar',
    type: 'calendar',
    title: 'This Week',
    content: '3 meetings scheduled',
    positions: {
      place: { x: 35, y: 65, rotation: -2 },
      move: { x: 65, y: 20, rotation: 4 },
      connect: { x: 30, y: 60, rotation: -1 }
    }
  }
];

type Step = 'place' | 'move' | 'connect';

const steps: { id: Step; label: string; description: string }[] = [
  { id: 'place', label: 'Place things', description: 'Add widgets to your canvas' },
  { id: 'move', label: 'Move them', description: 'Arrange freely in space' },
  { id: 'connect', label: 'Connect context', description: 'See relationships emerge' }
];

export default function SpaceExplainer() {
  const [activeStep, setActiveStep] = useState<Step>('place');
  const [hasAnimated, setHasAnimated] = useState(false);
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setShowConnections(activeStep === 'connect');
  }, [activeStep]);

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <StickyNote className="w-4 h-4" />;
      case 'goal':
        return <Target className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getWidgetColor = (type: string) => {
    switch (type) {
      case 'note':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
          border: 'border-amber-200',
          icon: 'bg-amber-300 text-amber-700',
          text: 'text-amber-900'
        };
      case 'goal':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
          border: 'border-emerald-200',
          icon: 'bg-emerald-300 text-emerald-700',
          text: 'text-emerald-900'
        };
      case 'calendar':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
          border: 'border-blue-200',
          icon: 'bg-blue-300 text-blue-700',
          text: 'text-blue-900'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-slate-200',
          icon: 'bg-slate-300 text-slate-700',
          text: 'text-slate-900'
        };
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2 mb-6 sm:mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center w-full sm:w-auto">
            <button
              onClick={() => setActiveStep(step.id)}
              className={`group relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 flex-1 sm:flex-initial ${
                activeStep === step.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <span className="font-semibold text-sm sm:text-base">{step.label}</span>
              </div>
              {activeStep === step.id && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full hidden sm:block"></div>
              )}
            </button>
            {index < steps.length - 1 && (
              <div className="hidden sm:block w-8 h-0.5 bg-slate-200 mx-2"></div>
            )}
          </div>
        ))}
      </div>

      <div className="relative w-full h-80 sm:h-96 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl sm:rounded-2xl border-2 border-slate-200 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(203 213 225 / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(203 213 225 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        ></div>

        {showConnections && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <path
              d={`M ${widgets[0].positions.connect.x + 10}% ${widgets[0].positions.connect.y + 15}% Q ${50}% ${40}% ${widgets[2].positions.connect.x + 10}% ${widgets[2].positions.connect.y + 5}%`}
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
            <path
              d={`M ${widgets[1].positions.connect.x + 10}% ${widgets[1].positions.connect.y + 10}% Q ${45}% ${55}% ${widgets[2].positions.connect.x + 12}% ${widgets[2].positions.connect.y + 8}%`}
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              className="animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </svg>
        )}

        {widgets.map((widget, index) => {
          const position = widget.positions[activeStep];
          const colors = getWidgetColor(widget.type);
          const isHovered = hoveredWidget === widget.id;
          const isMoving = activeStep === 'move';

          return (
            <div
              key={widget.id}
              className={`absolute w-28 sm:w-40 ${colors.bg} rounded-xl sm:rounded-2xl border-2 ${colors.border} shadow-lg p-3 sm:p-4 transition-all duration-700 ease-out cursor-pointer ${
                isMoving ? 'cursor-move' : ''
              }`}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `
                  rotate(${position.rotation}deg)
                  translateY(${hasAnimated ? 0 : -50}px)
                  scale(${isHovered ? 1.05 : 1})
                  translateZ(${isHovered ? 10 : 0}px)
                `,
                opacity: hasAnimated ? 1 : 0,
                transitionDelay: `${index * 150}ms`,
                zIndex: isHovered ? 20 : 10 + index
              }}
              onMouseEnter={() => setHoveredWidget(widget.id)}
              onMouseLeave={() => setHoveredWidget(null)}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 ${colors.icon} rounded-md sm:rounded-lg flex items-center justify-center`}>
                  {getWidgetIcon(widget.type)}
                </div>
                {isMoving && (
                  <Move className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 ml-auto" />
                )}
              </div>
              <h4 className={`font-semibold text-xs sm:text-sm ${colors.text} mb-0.5 sm:mb-1`}>
                {widget.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-600">
                {widget.content}
              </p>
              {showConnections && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          );
        })}

        {activeStep === 'place' && (
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-slate-200">
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Click to add widgets</p>
          </div>
        )}

        {activeStep === 'move' && (
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-slate-200">
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Drag anywhere you like</p>
          </div>
        )}

        {activeStep === 'connect' && (
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-slate-200">
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Related items stay visible</p>
          </div>
        )}
      </div>
    </div>
  );
}
