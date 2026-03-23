import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Grid3x3, Maximize2, AlertCircle, ArrowLeft } from 'lucide-react';
import { WidgetWithLayout, DragState, GridConfig, DEFAULT_GRID_CONFIG } from '../../lib/fridgeBoardTypes';
import { FridgeWidget } from './FridgeWidget';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface FridgeBoardProps {
  householdId: string;
  memberId: string;
  highContrast?: boolean;
}

export function FridgeBoard({ householdId, memberId, highContrast = false }: FridgeBoardProps) {
  const [widgets, setWidgets] = useState<WidgetWithLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    widgetId: null,
  });
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const gridConfig: GridConfig = DEFAULT_GRID_CONFIG;
  const navigate = useNavigate();

  const loadWidgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: widgetsData, error: widgetsError } = await supabase
        .from('fridge_widgets')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });

      if (widgetsError) throw widgetsError;

      const widgetsWithLayout: WidgetWithLayout[] = [];

      for (const widget of widgetsData || []) {
        let { data: layout, error: layoutError } = await supabase
          .from('fridge_widget_layouts')
          .select('*')
          .eq('widget_id', widget.id)
          .eq('member_id', memberId)
          .maybeSingle();

        if (layoutError) throw layoutError;

        if (!layout) {
          const { data: newLayout, error: createError } = await supabase
            .from('fridge_widget_layouts')
            .insert({
              widget_id: widget.id,
              member_id: memberId,
              position_x: Math.floor(Math.random() * 400) + 100,
              position_y: Math.floor(Math.random() * 400) + 100,
              size_mode: 'mini',
              z_index: 0,
              rotation: (Math.random() - 0.5) * 6,
              is_collapsed: false,
            })
            .select()
            .single();

          if (createError) throw createError;
          layout = newLayout;
        }

        widgetsWithLayout.push({
          ...widget,
          layout,
        });
      }

      setWidgets(widgetsWithLayout);
    } catch (err: any) {
      console.error('Error loading widgets:', err);
      setError(err.message || 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, [householdId, memberId]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const snapToGrid = useCallback(
    (value: number): number => {
      const { cellSize, snapThreshold } = gridConfig;
      const remainder = value % cellSize;
      if (remainder < snapThreshold) {
        return value - remainder;
      } else if (remainder > cellSize - snapThreshold) {
        return value + (cellSize - remainder);
      }
      return value;
    },
    [gridConfig]
  );

  const handleDragStart = useCallback((widgetId: string, clientX: number, clientY: number) => {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    setDragState({
      isDragging: true,
      startX: clientX - rect.left - widget.layout.position_x,
      startY: clientY - rect.top - widget.layout.position_y,
      currentX: widget.layout.position_x,
      currentY: widget.layout.position_y,
      widgetId,
    });
  }, [widgets]);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState.isDragging || !boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const newX = clientX - rect.left - dragState.startX;
      const newY = clientY - rect.top - dragState.startY;

      setDragState((prev) => ({
        ...prev,
        currentX: Math.max(0, newX),
        currentY: Math.max(0, newY),
      }));
    },
    [dragState.isDragging, dragState.startX, dragState.startY]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.widgetId) return;

    const snappedX = snapToGrid(dragState.currentX);
    const snappedY = snapToGrid(dragState.currentY);

    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === dragState.widgetId
          ? {
              ...widget,
              layout: {
                ...widget.layout,
                position_x: snappedX,
                position_y: snappedY,
              },
            }
          : widget
      )
    );

    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      widgetId: null,
    });
  }, [dragState, snapToGrid]);

  const handleSizeModeChange = useCallback((widgetId: string, newMode: 'icon' | 'mini' | 'full') => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId
          ? {
              ...widget,
              layout: {
                ...widget.layout,
                size_mode: newMode,
              },
            }
          : widget
      )
    );
  }, []);

  const handleBringToFront = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.layout.z_index), 0);
      return prev.map((widget) =>
        widget.id === widgetId
          ? {
              ...widget,
              layout: {
                ...widget.layout,
                z_index: maxZ + 1,
              },
            }
          : widget
      );
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragState.isDragging && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  if (error) {
    return (
      <div className={`min-h-screen ${highContrast ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'}`}>
        <div
          className={`sticky top-0 z-10 ${
            highContrast
              ? 'bg-black border-white border-b-2'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500'
          } px-4 py-3 shadow-lg flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/planner')}
              className={`p-2 rounded-lg transition-colors ${
                highContrast
                  ? 'bg-white text-black hover:bg-gray-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className={`text-lg font-bold ${highContrast ? 'text-white' : 'text-white'}`}>
              Fridge Board
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-8">
          <div
            className={`text-center p-8 rounded-2xl max-w-md ${
              highContrast ? 'bg-gray-900 border-2 border-white' : 'bg-white shadow-lg'
            }`}
          >
            <AlertCircle
              size={48}
              className={`mx-auto mb-4 ${highContrast ? 'text-white' : 'text-red-500'}`}
            />
            <h3 className={`text-xl font-bold mb-2 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
              Error Loading Fridge Board
            </h3>
            <p className={`text-sm mb-6 ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => loadWidgets()}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  highContrast
                    ? 'bg-white text-black hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/planner')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  highContrast
                    ? 'bg-gray-800 text-white border-2 border-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${highContrast ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'}`}>
        <div
          className={`sticky top-0 z-10 ${
            highContrast
              ? 'bg-black border-white border-b-2'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500'
          } px-4 py-3 shadow-lg flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/planner')}
              className={`p-2 rounded-lg transition-colors ${
                highContrast
                  ? 'bg-white text-black hover:bg-gray-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className={`text-lg font-bold ${highContrast ? 'text-white' : 'text-white'}`}>
              Fridge Board
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              highContrast ? 'border-white' : 'border-blue-500'
            }`}></div>
            <p className={`text-lg ${highContrast ? 'text-white' : 'text-gray-700'}`}>
              Loading your Fridge Board...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div
        className={`sticky top-0 z-10 ${
          highContrast
            ? 'bg-black border-white border-b-2'
            : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-500'
        } px-4 py-3 shadow-lg flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/household')}
            className={`p-2 rounded-lg transition-colors ${
              highContrast
                ? 'bg-white text-black hover:bg-gray-300'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className={`text-lg font-bold ${highContrast ? 'text-white' : 'text-white'}`}>
            Fridge Board
          </h2>
          <span
            className={`text-xs px-2 py-1 rounded-lg ${
              highContrast ? 'bg-white text-black' : 'bg-white/20 text-white'
            }`}
          >
            Your Layout
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              highContrast
                ? 'bg-white text-black hover:bg-gray-300'
                : showGrid
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label="Toggle grid"
          >
            <Grid3x3 size={18} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-lg transition-colors ${
              highContrast
                ? 'bg-white text-black hover:bg-gray-300'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label="Toggle fullscreen"
          >
            <Maximize2 size={18} />
          </button>

          <button
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
              highContrast
                ? 'bg-white text-black hover:bg-gray-300'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Widget</span>
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        className={`relative min-h-screen overflow-auto ${
          highContrast ? 'bg-black' : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'
        }`}
        style={{
          backgroundImage: showGrid
            ? `linear-gradient(${highContrast ? '#333' : '#cbd5e1'} 1px, transparent 1px),
               linear-gradient(90deg, ${highContrast ? '#333' : '#cbd5e1'} 1px, transparent 1px)`
            : undefined,
          backgroundSize: showGrid ? `${gridConfig.cellSize}px ${gridConfig.cellSize}px` : undefined,
        }}
      >
        <div
          className="relative"
          style={{
            minWidth: `${gridConfig.columns * gridConfig.cellSize}px`,
            minHeight: `${gridConfig.rows * gridConfig.cellSize}px`,
          }}
        >
          {widgets.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`text-center p-8 rounded-2xl ${
                  highContrast ? 'bg-gray-900 border-2 border-white' : 'bg-white/60 backdrop-blur-sm'
                } max-w-md`}
              >
                <p className={`text-lg font-semibold mb-2 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
                  Your Fridge Board is Empty
                </p>
                <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                  Add your first widget to get started! Widgets can be notes, tasks, photos, reminders, and more.
                </p>
              </div>
            </div>
          ) : (
            widgets.map((widget) => (
              <FridgeWidget
                key={widget.id}
                widget={widget}
                isDragging={dragState.widgetId === widget.id}
                dragPosition={
                  dragState.widgetId === widget.id
                    ? { x: dragState.currentX, y: dragState.currentY }
                    : undefined
                }
                onDragStart={handleDragStart}
                onSizeModeChange={handleSizeModeChange}
                onBringToFront={handleBringToFront}
                highContrast={highContrast}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
