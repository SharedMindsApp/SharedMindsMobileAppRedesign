import { useRef, useState } from 'react';
import { MoreVertical, Maximize2, Minimize2, Square } from 'lucide-react';
import { WidgetWithLayout, WIDGET_COLORS, WIDGET_DIMENSIONS, SizeMode } from '../../lib/fridgeBoardTypes';
import { NoteWidget } from './widgets/NoteWidget';
import { TaskWidget } from './widgets/TaskWidget';
import { CalendarWidget } from './widgets/CalendarWidget';
import { GoalWidget } from './widgets/GoalWidget';
import { HabitWidget } from './widgets/HabitWidget';
import { PhotoWidget } from './widgets/PhotoWidget';
import { InsightWidget } from './widgets/InsightWidget';
import { ReminderWidget } from './widgets/ReminderWidget';
import { AgreementWidget } from './widgets/AgreementWidget';
import { CustomWidget } from './widgets/CustomWidget';

interface FridgeWidgetProps {
  widget: WidgetWithLayout;
  isDragging: boolean;
  dragPosition?: { x: number; y: number };
  onDragStart: (widgetId: string, clientX: number, clientY: number) => void;
  onSizeModeChange: (widgetId: string, mode: SizeMode) => void;
  onBringToFront: (widgetId: string) => void;
  highContrast?: boolean;
}

export function FridgeWidget({
  widget,
  isDragging,
  dragPosition,
  onDragStart,
  onSizeModeChange,
  onBringToFront,
  highContrast = false,
}: FridgeWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onBringToFront(widget.id);
    onDragStart(widget.id, e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    onBringToFront(widget.id);
    const touch = e.touches[0];
    onDragStart(widget.id, touch.clientX, touch.clientY);
  };

  const handleSizeToggle = () => {
    const modes: SizeMode[] = ['icon', 'mini', 'full'];
    const currentIndex = modes.indexOf(widget.layout.size_mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onSizeModeChange(widget.id, nextMode);
    setShowMenu(false);
  };

  const dimensions = WIDGET_DIMENSIONS[widget.layout.size_mode];
  const position = dragPosition || {
    x: widget.layout.position_x,
    y: widget.layout.position_y,
  };

  const colorScheme = WIDGET_COLORS[widget.color as keyof typeof WIDGET_COLORS] || WIDGET_COLORS.yellow;

  const rotation = isDragging ? widget.layout.rotation + 2 : widget.layout.rotation;

  const renderWidgetContent = () => {
    const sizeMode = widget.layout.size_mode;

    switch (widget.widget_type) {
      case 'note':
        return <NoteWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'task':
        return <TaskWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'calendar':
        return <CalendarWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'goal':
        return <GoalWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'habit':
        return <HabitWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'photo':
        return <PhotoWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'insight':
        return <InsightWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'reminder':
        return <ReminderWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'agreement':
        return <AgreementWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      case 'custom':
        return <CustomWidget widget={widget} sizeMode={sizeMode} highContrast={highContrast} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={widgetRef}
      className={`absolute select-none ${
        isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
      } transition-all duration-200`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        zIndex: widget.layout.z_index,
        transform: `rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`w-full h-full rounded-2xl shadow-lg border-2 ${
          highContrast
            ? 'bg-black border-white'
            : `${colorScheme.bg} ${colorScheme.border}`
        } overflow-hidden relative ${
          isDragging ? 'shadow-2xl' : 'hover:shadow-xl'
        } transition-shadow`}
      >
        {widget.layout.size_mode !== 'icon' && (
          <div className="absolute top-2 right-2 z-10">
            <button
              className={`p-1.5 rounded-lg transition-colors ${
                highContrast
                  ? 'bg-white text-black hover:bg-gray-300'
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label="Widget menu"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <div
                className={`absolute right-0 mt-1 rounded-xl shadow-xl border overflow-hidden ${
                  highContrast
                    ? 'bg-black border-white'
                    : 'bg-white border-gray-200'
                }`}
                style={{ minWidth: '160px' }}
              >
                <button
                  onClick={handleSizeToggle}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    highContrast
                      ? 'text-white hover:bg-gray-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {widget.layout.size_mode === 'icon' && <Square size={14} />}
                  {widget.layout.size_mode === 'mini' && <Minimize2 size={14} />}
                  {widget.layout.size_mode === 'full' && <Maximize2 size={14} />}
                  <span>
                    {widget.layout.size_mode === 'icon' && 'Switch to Mini'}
                    {widget.layout.size_mode === 'mini' && 'Switch to Full'}
                    {widget.layout.size_mode === 'full' && 'Switch to Icon'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className="w-full h-full p-3"
          onClick={(e) => {
            if (widget.layout.size_mode === 'icon') {
              e.stopPropagation();
              onSizeModeChange(widget.id, 'mini');
            }
          }}
        >
          {renderWidgetContent()}
        </div>

        <div
          className={`absolute bottom-1 right-1 w-3 h-3 rounded-full shadow-sm ${
            highContrast ? 'bg-white' : colorScheme.border.replace('border-', 'bg-')
          }`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
