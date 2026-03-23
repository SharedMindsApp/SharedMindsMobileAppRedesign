import { useRef, useState, useCallback, ReactNode, useEffect } from 'react';
import { Maximize2, Minimize2, Trash2, GripVertical, Minimize, Square, Maximize } from 'lucide-react';
import { WidgetLayout, SizeMode } from '../../lib/fridgeCanvasTypes';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import type { WidgetTypeId } from '../../lib/uiPreferencesTypes';

interface CanvasWidgetProps {
  layout: WidgetLayout;
  onLayoutChange: (updates: Partial<WidgetLayout>) => void;
  onDelete?: () => void;
  onDragStart?: (widgetId: string) => void;
  onDragMove?: (widgetId: string, x: number, y: number, width: number, height: number) => void;
  onDragEnd?: (widgetId: string, x: number, y: number) => void;
  children: ReactNode;
  reducedMotion?: boolean;
  gridSize?: number;
  isBeingDragged?: boolean;
  widgetType?: string;
}

export function CanvasWidget({
  layout,
  onLayoutChange,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
  reducedMotion = false,
  gridSize = 20,
  isBeingDragged = false,
  widgetType,
}: CanvasWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const { appTheme, config, getWidgetColor } = useUIPreferences();

  const getWidgetColorToken = () => {
    const supportedTypes: WidgetTypeId[] = [
      'note', 'reminder', 'calendar', 'goal', 'habit', 'habit_tracker',
      'achievements', 'photo', 'insight', 'meal_planner', 'grocery_list',
      'stack_card', 'files', 'collections', 'tables', 'todos'
    ];

    if (widgetType && supportedTypes.includes(widgetType as WidgetTypeId)) {
      return getWidgetColor(widgetType as WidgetTypeId);
    }
    return 'neutral';
  };

  const widgetColor = getWidgetColorToken();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Phase 6A: Mobile controls visibility - tap-to-toggle on mobile
  const [showControlsMobile, setShowControlsMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Phase 6A: Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ---- WIDGET DIMENSIONS (controlled by size_mode or custom dimensions) ----
  const getDefaultWidgetSize = useCallback(() => {
    switch (layout.size_mode) {
      case 'icon':
        return { width: 80, height: 80, maxWidth: 160, maxHeight: 160 };
      case 'mini':
        return { width: 180, height: 180, maxWidth: 360, maxHeight: 360 };
      case 'large':
        return { width: 340, height: 340, maxWidth: 680, maxHeight: 680 };
      case 'xlarge':
        return { width: 600, height: 600, maxWidth: 1200, maxHeight: 1200 };
      default:
        return { width: 340, height: 340, maxWidth: 680, maxHeight: 680 };
    }
  }, [layout.size_mode]);

  const defaultSize = getDefaultWidgetSize();
  const size = {
    width: layout.custom_width || defaultSize.width,
    height: layout.custom_height || defaultSize.height,
  };

  // ---- GRID SNAPPING ----
  const snapToGrid = useCallback(
    (value: number) => Math.round(value / gridSize) * gridSize,
    [gridSize]
  );

  // Phase 6A: Handle mobile tap for controls visibility
  const handleWidgetTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isMobile) return;
      
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('.resize-handle') ||
        target.closest('.widget-controls');

      if (!isInteractive && target.closest('.widget-content')) {
        // Toggle controls on mobile tap
        setShowControlsMobile((prev) => !prev);
        e.stopPropagation();
      }
    },
    [isMobile]
  );

  // ---- DRAG START ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Phase 6A: Disable drag on mobile
      if (isMobile) {
        // Show toast that drag is desktop-only
        import('../Toast').then(({ showToast }) => {
          showToast('info', 'This action works best on desktop');
        });
        return;
      }

      const target = e.target as HTMLElement;

      const isInteractive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('.resize-handle');

      if (!isInteractive && target.closest('.widget-content')) {
        setIsDragging(true);
        setHasMoved(false);
        setMouseDownPos({ x: e.clientX, y: e.clientY });
        setDragStart({
          x: e.clientX - layout.position_x,
          y: e.clientY - layout.position_y,
        });

        if (onDragStart) {
          onDragStart(layout.widget_id);
        }

        e.stopPropagation();
      }
    },
    [layout.position_x, layout.position_y, layout.widget_id, onDragStart, isMobile]
  );

  // ---- DRAG & RESIZE LISTENERS ----
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = Math.abs(e.clientX - mouseDownPos.x);
        const deltaY = Math.abs(e.clientY - mouseDownPos.y);

        // Mark as moved if mouse moved more than 5 pixels
        if (deltaX > 5 || deltaY > 5) {
          setHasMoved(true);
        }

        const newX = snapToGrid(e.clientX - dragStart.x);
        const newY = snapToGrid(e.clientY - dragStart.y);

        onLayoutChange({
          position_x: newX,
          position_y: newY,
        });

        if (onDragMove) {
          onDragMove(layout.widget_id, newX, newY, size.width, size.height);
        }
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const currentWidth = layout.custom_width || defaultSize.width;
        const currentHeight = layout.custom_height || defaultSize.height;

        const newWidth = Math.max(
          defaultSize.width,
          Math.min(defaultSize.maxWidth, currentWidth + deltaX)
        );
        const newHeight = Math.max(
          defaultSize.height,
          Math.min(defaultSize.maxHeight, currentHeight + deltaY)
        );

        onLayoutChange({
          custom_width: newWidth,
          custom_height: newHeight,
        });

        setResizeStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, isResizing, dragStart, resizeStart, mouseDownPos, layout.custom_width, layout.custom_height, layout.widget_id, defaultSize, snapToGrid, onLayoutChange, onDragMove, size.width, size.height]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && !hasMoved) {
      if (layout.size_mode === 'icon') {
        onLayoutChange({ size_mode: 'mini' });
      } else if (layout.size_mode === 'mini') {
        onLayoutChange({ size_mode: 'large' });
      } else if (layout.size_mode === 'large' && widgetType === 'meal_planner') {
        onLayoutChange({ size_mode: 'xlarge' });
      }
    }

    if (isDragging && hasMoved && onDragEnd) {
      onDragEnd(layout.widget_id, layout.position_x, layout.position_y);
    }

    setIsDragging(false);
    setIsResizing(false);
    setHasMoved(false);
  }, [isDragging, hasMoved, layout.size_mode, layout.widget_id, layout.position_x, layout.position_y, onLayoutChange, onDragEnd, widgetType]);

  // Attach global listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ---- RESIZE START ----
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      // Phase 6A: Disable resize on mobile
      if (isMobile) {
        import('../Toast').then(({ showToast }) => {
          showToast('info', 'This action works best on desktop');
        });
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
      });
      e.stopPropagation();
      e.preventDefault();
    },
    [isMobile]
  );

  // ---- VIEW MODE TOGGLE ----
  const cycleViewMode = useCallback(() => {
    const modes: SizeMode[] = widgetType === 'meal_planner'
      ? ['icon', 'mini', 'large', 'xlarge']
      : ['icon', 'mini', 'large'];
    const currentIndex = modes.indexOf(layout.size_mode);
    const next = modes[(currentIndex + 1) % modes.length];
    onLayoutChange({ size_mode: next });
  }, [layout.size_mode, onLayoutChange, widgetType]);

  // ---- ROTATION ----
  const rotationStyle = reducedMotion || config.reducedMotion ? 0 : layout.rotation;
  const hoverRotation = reducedMotion || config.reducedMotion || !isHovered ? 0 : -layout.rotation * 0.5;

  // ---- FROSTED GLASS NEON MODE ----
  const isNeonMode = appTheme === 'neon-dark';
  const getWidgetClasses = () => {
    if (isNeonMode) {
      // Frosted glass effect for neon mode
      return `widget-content w-full h-full rounded-2xl overflow-hidden transition-all duration-200 ${
        isHovered
          ? 'bg-[rgba(20,24,38,0.65)] backdrop-blur-[16px] border-2 border-[rgba(6,182,212,0.25)] shadow-[0_0_40px_rgba(6,182,212,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'bg-[rgba(20,24,38,0.55)] backdrop-blur-[14px] border-2 border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
      }`;
    }
    // Standard light mode
    return 'widget-content w-full h-full bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden';
  };

  const getControlsClasses = () => {
    if (isNeonMode) {
      return 'absolute top-2 right-2 flex items-center gap-1 bg-[rgba(20,24,38,0.75)] backdrop-blur-sm rounded-lg shadow-lg p-1 border border-[rgba(255,255,255,0.1)]';
    }
    return 'absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-gray-200';
  };

  const getButtonClasses = (isActive: boolean) => {
    if (isNeonMode) {
      return `p-1.5 rounded transition-all duration-150 text-cyan-100 ${
        isActive
          ? 'bg-[rgba(6,182,212,0.2)] shadow-[0_0_8px_rgba(6,182,212,0.4)]'
          : 'hover:bg-[rgba(6,182,212,0.1)] hover:shadow-[0_0_6px_rgba(6,182,212,0.2)]'
      }`;
    }
    return `p-1.5 hover:bg-gray-100 rounded transition-colors ${isActive ? 'bg-gray-100' : ''} text-gray-700`;
  };

  const getDeleteButtonClasses = () => {
    if (isNeonMode) {
      return 'p-1.5 rounded transition-all duration-150 text-red-400 hover:bg-[rgba(239,68,68,0.15)] hover:shadow-[0_0_8px_rgba(239,68,68,0.3)]';
    }
    return 'p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors';
  };

  // Don't render widget on canvas if it's meal planner in xlarge mode (renders as popup instead)
  if (widgetType === 'meal_planner' && layout.size_mode === 'xlarge') {
    return <>{children}</>;
  }

  return (
    <div
      ref={widgetRef}
      className={`absolute select-none ${
        isDragging || isBeingDragged ? 'cursor-grabbing z-50' : isResizing ? 'cursor-nwse-resize z-50' : 'cursor-grab'
      } ${reducedMotion ? '' : 'transition-all duration-300 ease-out'}`}
      style={{
        left: layout.position_x,
        top: layout.position_y,
        width: size.width,
        height: size.height,
        zIndex: isDragging || isBeingDragged ? 100 : layout.z_index,
        transform: `rotate(${rotationStyle + hoverRotation}deg) ${isDragging || isBeingDragged ? 'scale(1.05)' : 'scale(1)'}`,
        filter: isDragging || isBeingDragged || isResizing
          ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
          : 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
        opacity: isBeingDragged ? 0.9 : 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleWidgetTap}
      onTouchStart={handleWidgetTap}
    >
      <div
        className="relative w-full h-full"
        data-widget-color={widgetColor}
        data-widget-type={widgetType}
      >
        {/* Widget content */}
        <div className={getWidgetClasses()}>
          {children}
        </div>

        {/* Controls */}
        {/* Phase 6A: Show controls on hover (desktop) OR when tapped (mobile) */}
        {((isMobile && showControlsMobile) || (!isMobile && isHovered)) && layout.size_mode !== 'icon' && (
          <div className={`${getControlsClasses()} widget-controls`}>
            <button
              onClick={() => {
                onLayoutChange({ size_mode: 'icon' });
                if (isMobile) setShowControlsMobile(false);
              }}
              className={getButtonClasses(layout.size_mode === 'icon')}
              title="Icon"
            >
              <Minimize size={14} />
            </button>
            <button
              onClick={() => {
                onLayoutChange({ size_mode: 'mini' });
                if (isMobile) setShowControlsMobile(false);
              }}
              className={getButtonClasses(layout.size_mode === 'mini')}
              title="Mini"
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => {
                onLayoutChange({ size_mode: 'large' });
                if (isMobile) setShowControlsMobile(false);
              }}
              className={getButtonClasses(layout.size_mode === 'large')}
              title="Large"
            >
              <Maximize size={14} />
            </button>
            {widgetType === 'meal_planner' && (
              <button
                onClick={() => {
                  onLayoutChange({ size_mode: 'xlarge' });
                  if (isMobile) setShowControlsMobile(false);
                }}
                className={getButtonClasses(layout.size_mode === 'xlarge')}
                title="Full View"
              >
                <Maximize2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (onDelete) onDelete();
                  if (isMobile) setShowControlsMobile(false);
                }}
                className={getDeleteButtonClasses()}
                title="Delete widget"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* Resize handle (only for mini/full, desktop only) */}
        {/* Phase 6A: Hide resize handle on mobile */}
        {layout.size_mode !== 'icon' && !isDragging && !isMobile && (
          <div
            className="resize-handle absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize group"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          >
            <div className={`absolute bottom-1 right-1 w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity rounded-tl-lg flex items-center justify-center shadow-sm ${
              isNeonMode
                ? 'bg-[rgba(20,24,38,0.7)] border border-[rgba(6,182,212,0.3)] group-hover:shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-white/80 border border-gray-300'
            }`}>
              <GripVertical size={14} className={isNeonMode ? 'text-cyan-300' : 'text-gray-600'} style={{ transform: 'rotate(45deg)' }} />
            </div>
          </div>
        )}

        {/* Overlay for icon mode - click to enlarge, drag to move */}
        {/* Phase 6A: Make expand button always visible on mobile */}
        {layout.size_mode === 'icon' && (
          <div
            className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none"
            onClick={handleWidgetTap}
            onTouchStart={handleWidgetTap}
          >
            {((isMobile && showControlsMobile) || (!isMobile && isHovered)) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cycleViewMode();
                  if (isMobile) setShowControlsMobile(false);
                }}
                className={`backdrop-blur-sm p-2 rounded-lg shadow-lg pointer-events-auto transition-all duration-150 ${
                  isNeonMode
                    ? 'bg-[rgba(20,24,38,0.75)] border border-[rgba(6,182,212,0.3)] text-cyan-100 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-white/95 border border-gray-200 text-gray-700'
                }`}
                title="Enlarge widget"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
