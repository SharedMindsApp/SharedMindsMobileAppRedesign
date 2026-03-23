import {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode
} from 'react';
import { Plus, Minus } from 'lucide-react';
import { CanvasState } from '../../lib/fridgeCanvasTypes';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface InfiniteCanvasProps {
  children: ReactNode;
  onCanvasChange?: (state: CanvasState) => void;
  reducedMotion?: boolean;
  disableInteraction?: boolean;
}

export function InfiniteCanvas({
  children,
  onCanvasChange,
  reducedMotion = false,
  disableInteraction = false
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { appTheme } = useUIPreferences();

  const [canvasState, setCanvasState] = useState<CanvasState>({
    pan: { x: 0, y: 0 },
    zoom: 1
  });

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(0);

  const updateCanvas = useCallback(
    (newState: CanvasState) => {
      setCanvasState(newState);
      onCanvasChange?.(newState);
    },
    [onCanvasChange]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (disableInteraction) return;

      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.2, Math.min(3.0, canvasState.zoom + delta));

      const zoomRatio = newZoom / canvasState.zoom;

      const newPanX = mouseX - (mouseX - canvasState.pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - canvasState.pan.y) * zoomRatio;

      updateCanvas({
        zoom: newZoom,
        pan: { x: newPanX, y: newPanY }
      });
    },
    [canvasState, updateCanvas, disableInteraction]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disableInteraction) return;

      const target = e.target as HTMLElement;

      const isWidget = target.closest('.widget-content') ||
                      target.closest('.group-frame') ||
                      target.closest('[data-widget]') ||
                      target.closest('[data-group]');

      if (isWidget) return;

      setIsPanning(true);
      setDragStart({
        x: e.clientX - canvasState.pan.x,
        y: e.clientY - canvasState.pan.y
      });
      e.preventDefault();
    },
    [canvasState.pan, disableInteraction]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        updateCanvas({
          ...canvasState,
          pan: {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          }
        });
      }
    },
    [isPanning, dragStart, canvasState, updateCanvas]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const getTouchDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        setTouchDistance(getTouchDistance(e.touches));
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        const isWidget = target.closest('.widget-content') ||
                        target.closest('.group-frame') ||
                        target.closest('[data-widget]') ||
                        target.closest('[data-group]');

        if (!isWidget) {
          setIsPanning(true);
          setDragStart({
            x: e.touches[0].clientX - canvasState.pan.x,
            y: e.touches[0].clientY - canvasState.pan.y
          });
        }
      }
    },
    [canvasState.pan]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && touchDistance > 0) {
        const newDist = getTouchDistance(e.touches);
        const delta = (newDist - touchDistance) * 0.01;
        const newZoom = Math.max(0.2, Math.min(3.0, canvasState.zoom + delta));

        setTouchDistance(newDist);
        updateCanvas({ ...canvasState, zoom: newZoom });
        e.preventDefault();
      } else if (e.touches.length === 1 && isPanning) {
        updateCanvas({
          ...canvasState,
          pan: {
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
          }
        });
      }
    },
    [isPanning, touchDistance, dragStart, canvasState, updateCanvas]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setTouchDistance(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const getGridStyle = () => {
    const zoom = canvasState.zoom;

    let gridSize = 40;
    if (zoom >= 1.5) {
      gridSize = 30;
    } else if (zoom < 0.75) {
      gridSize = 60;
    }

    const scaled = gridSize * zoom;
    const opacity = appTheme === 'neon-dark' ? 0.12 : appTheme === 'dark' ? 0.15 : 0.15;

    let lineColor: string;
    if (appTheme === 'neon-dark') {
      lineColor = `rgba(6, 182, 212, ${opacity})`;
    } else if (appTheme === 'dark') {
      lineColor = `rgba(75, 85, 99, ${opacity})`;
    } else {
      lineColor = `rgba(251, 146, 60, ${opacity})`;
    }

    const verticalLines = `linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`;
    const horizontalLines = `linear-gradient(0deg, ${lineColor} 1px, transparent 1px)`;

    return {
      backgroundImage: `${verticalLines}, ${horizontalLines}`,
      backgroundSize: `${scaled}px ${scaled}px`,
      backgroundPosition: `${canvasState.pan.x}px ${canvasState.pan.y}px`
    };
  };

  const handleZoomIn = useCallback(() => {
    if (disableInteraction) return;
    const newZoom = Math.min(3.0, canvasState.zoom + 0.1);
    updateCanvas({ ...canvasState, zoom: newZoom });
  }, [canvasState, updateCanvas, disableInteraction]);

  const handleZoomOut = useCallback(() => {
    if (disableInteraction) return;
    const newZoom = Math.max(0.2, canvasState.zoom - 0.1);
    updateCanvas({ ...canvasState, zoom: newZoom });
  }, [canvasState, updateCanvas, disableInteraction]);

  const handleResetZoom = useCallback(() => {
    if (disableInteraction) return;
    updateCanvas({ ...canvasState, zoom: 1.0 });
  }, [canvasState, updateCanvas, disableInteraction]);

  const getBackgroundClass = () => {
    if (appTheme === 'neon-dark') {
      return 'fixed inset-0 overflow-hidden bg-[#0a0e23]';
    } else if (appTheme === 'dark') {
      return 'fixed inset-0 overflow-hidden bg-gray-900';
    } else {
      return 'fixed inset-0 overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50';
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`${getBackgroundClass()} ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={getGridStyle()}
    >
      <div
        ref={contentRef}
        className={reducedMotion ? '' : 'transition-transform duration-100'}
        style={{
          transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
          transformOrigin: '0 0',
          position: 'relative',
          width: '4000px',
          height: '4000px'
        }}
      >
        {children}
      </div>

      {!disableInteraction && (
        <div className="fixed top-20 left-4 z-30 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2">
          <button
            onClick={handleZoomIn}
            disabled={canvasState.zoom >= 3.0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom in (+10%)"
          >
            <Plus size={20} className="text-gray-700" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset zoom to 100%"
          >
            {Math.round(canvasState.zoom * 100)}%
          </button>

          <button
            onClick={handleZoomOut}
            disabled={canvasState.zoom <= 0.2}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom out (-10%)"
          >
            <Minus size={20} className="text-gray-700" />
          </button>
        </div>
      )}
    </div>
  );
}
