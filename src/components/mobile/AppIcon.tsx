import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { AppIconConfig } from '../../lib/mobileTypes';

interface AppIconProps {
  app: AppIconConfig;
  onTap: () => void;
  onLongPress: () => void;
  isDragging?: boolean;
  isEditMode?: boolean;
}

export function AppIcon({ app, onTap, onLongPress, isDragging = false, isEditMode = false }: AppIconProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const IconComponent = Icons[app.icon as keyof typeof Icons] as any;

  const handleMouseDown = () => {
    setIsPressed(true);
    const timer = setTimeout(() => {
      onLongPress();
    }, 500);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleClick = () => {
    if (!isEditMode && !isDragging) {
      onTap();
    }
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      className={`relative flex flex-col items-center gap-1 group ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <div
        className={`relative w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center shadow-lg transition-all duration-200 ${
          isPressed ? 'scale-90' : 'scale-100'
        } ${
          isEditMode ? 'animate-wiggle' : ''
        }`}
      >
        {IconComponent && (
          <IconComponent size={32} className="text-white" />
        )}

        {/* Phase 9A: Only show badge if there's real data (no 0 badges) */}
        {app.badge && app.badge > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5 shadow-md">
            <span className="text-white text-xs font-bold">
              {app.badge > 99 ? '99+' : app.badge}
            </span>
          </div>
        )}

        {isEditMode && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Icons.X size={14} className="text-white" />
          </button>
        )}
      </div>

      <span className="text-xs text-gray-900 font-medium truncate max-w-[72px] text-center">
        {app.name}
      </span>
    </button>
  );
}
