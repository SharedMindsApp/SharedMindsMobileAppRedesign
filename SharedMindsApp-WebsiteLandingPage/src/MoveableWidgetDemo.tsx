import { useState } from 'react';
import StackCards from './StackCards';
import ThinkingWidget from './ThinkingWidget';
import PlanningWidget from './PlanningWidget';
import LivingWidget from './LivingWidget';

interface Widget {
  x: number;
  y: number;
  rotation: number;
}

interface WidgetPosition {
  quickIdeas: Widget;
  studyCards: Widget;
  thinking: Widget;
  planning: Widget;
  living: Widget;
}

export default function MoveableWidgetDemo() {
  const [widgets, setWidgets] = useState<WidgetPosition>({
    thinking: { x: 8, y: 40, rotation: -3 },
    planning: { x: 38, y: 180, rotation: 2 },
    living: { x: 68, y: 60, rotation: -2 },
    quickIdeas: { x: 15, y: 420, rotation: 2 },
    studyCards: { x: 55, y: 520, rotation: -3 }
  });

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [stackCardsCollapsed, setStackCardsCollapsed] = useState({
    quickIdeas: false,
    studyCards: false
  });

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();

    if (!containerRect) return;

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragging(widgetId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    const container = e.currentTarget.getBoundingClientRect();
    const newX = ((e.clientX - container.left - dragOffset.x) / container.width) * 100;
    const newY = e.clientY - container.top - dragOffset.y;

    const maxY = dragging === 'quickIdeas' || dragging === 'studyCards'
      ? container.height - 450
      : container.height - 350;

    setWidgets(prev => ({
      ...prev,
      [dragging]: {
        ...prev[dragging as keyof WidgetPosition],
        x: Math.max(0, Math.min(70, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      }
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <p className="text-xl text-slate-700 leading-relaxed max-w-3xl mx-auto">
          Spaces are built from editable widgets you can add at any time.
        </p>
        <p className="text-lg text-slate-700 mt-4">
          Here's how widgets work in practice:
        </p>
        <p className="text-sm text-slate-600 italic">
          Try dragging these widgets around
        </p>
      </div>

      <div
        className="relative h-[1000px] bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-3xl border-2 border-slate-200 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        ></div>

        <div
          className="widget-container absolute transform transition-transform duration-300 cursor-move hover:shadow-2xl z-10"
          style={{
            left: `${widgets.thinking.x}%`,
            top: `${widgets.thinking.y}px`,
            rotate: `${dragging === 'thinking' ? 0 : widgets.thinking.rotation}deg`,
            zIndex: dragging === 'thinking' ? 50 : 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'thinking')}
        >
          <ThinkingWidget />
        </div>

        <div
          className="widget-container absolute transform transition-transform duration-300 cursor-move hover:shadow-2xl z-10"
          style={{
            left: `${widgets.planning.x}%`,
            top: `${widgets.planning.y}px`,
            rotate: `${dragging === 'planning' ? 0 : widgets.planning.rotation}deg`,
            zIndex: dragging === 'planning' ? 50 : 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'planning')}
        >
          <PlanningWidget />
        </div>

        <div
          className="widget-container absolute transform transition-transform duration-300 cursor-move hover:shadow-2xl z-10"
          style={{
            left: `${widgets.living.x}%`,
            top: `${widgets.living.y}px`,
            rotate: `${dragging === 'living' ? 0 : widgets.living.rotation}deg`,
            zIndex: dragging === 'living' ? 50 : 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'living')}
        >
          <LivingWidget />
        </div>

        <div
          className="widget-container absolute transform transition-transform duration-300 cursor-move hover:shadow-2xl z-10"
          style={{
            left: `${widgets.quickIdeas.x}%`,
            top: `${widgets.quickIdeas.y}px`,
            rotate: `${dragging === 'quickIdeas' ? 0 : widgets.quickIdeas.rotation}deg`,
            zIndex: dragging === 'quickIdeas' ? 50 : 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'quickIdeas')}
        >
          <StackCards
            stackId="quick-ideas"
            title="Quick Ideas"
            colorScheme="blue"
            isCollapsed={stackCardsCollapsed.quickIdeas}
            onToggleCollapse={() =>
              setStackCardsCollapsed(prev => ({ ...prev, quickIdeas: !prev.quickIdeas }))
            }
          />
        </div>

        <div
          className="widget-container absolute transform transition-transform duration-300 cursor-move hover:shadow-2xl z-10"
          style={{
            left: `${widgets.studyCards.x}%`,
            top: `${widgets.studyCards.y}px`,
            rotate: `${dragging === 'studyCards' ? 0 : widgets.studyCards.rotation}deg`,
            zIndex: dragging === 'studyCards' ? 50 : 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'studyCards')}
        >
          <StackCards
            stackId="study-cards"
            title="Study Cards"
            colorScheme="emerald"
            isCollapsed={stackCardsCollapsed.studyCards}
            onToggleCollapse={() =>
              setStackCardsCollapsed(prev => ({ ...prev, studyCards: !prev.studyCards }))
            }
          />
        </div>
      </div>
    </div>
  );
}
