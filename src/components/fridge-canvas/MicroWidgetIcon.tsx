import { Calendar, CheckSquare, Target, Repeat, Camera, Lightbulb, Bell, StickyNote, FileText, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { WidgetWithLayout } from '../../lib/fridgeCanvasTypes';

interface MicroWidgetIconProps {
  widget: WidgetWithLayout;
  onClick: () => void;
  index: number;
}

export function MicroWidgetIcon({ widget, onClick, index }: MicroWidgetIconProps) {
  const getWidgetIcon = () => {
    switch (widget.widget_type) {
      case 'note':
        return <StickyNote size={20} />;
      case 'task':
        return <CheckSquare size={20} />;
      case 'calendar':
        return <Calendar size={20} />;
      case 'goal':
        return <Target size={20} />;
      case 'habit':
        return <Repeat size={20} />;
      case 'photo':
        return <Camera size={20} />;
      case 'insight':
        return <Lightbulb size={20} />;
      case 'reminder':
        return <Bell size={20} />;
      case 'meal_planner':
        return <UtensilsCrossed size={20} />;
      case 'grocery_list':
        return <ShoppingCart size={20} />;
      case 'todos':
        return <CheckSquare size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const colorClasses = {
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    blue: 'bg-blue-100 border-blue-300 text-blue-700',
    green: 'bg-green-100 border-green-300 text-green-700',
    red: 'bg-red-100 border-red-300 text-red-700',
    purple: 'bg-purple-100 border-purple-300 text-purple-700',
    orange: 'bg-orange-100 border-orange-300 text-orange-700',
    pink: 'bg-pink-100 border-pink-300 text-pink-700',
    gray: 'bg-gray-100 border-gray-300 text-gray-700',
  };

  const colorClass = colorClasses[widget.color as keyof typeof colorClasses] || colorClasses.yellow;

  const gridPosition = {
    left: `${(index % 4) * 90 + 20}px`,
    top: `${Math.floor(index / 4) * 90 + 60}px`,
  };

  return (
    <div
      className={`absolute w-16 h-16 rounded-xl border-2 shadow-md cursor-pointer
        hover:scale-110 hover:shadow-lg transition-all duration-200
        flex items-center justify-center ${colorClass}`}
      style={gridPosition}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={widget.title || 'Widget'}
    >
      {getWidgetIcon()}
    </div>
  );
}
