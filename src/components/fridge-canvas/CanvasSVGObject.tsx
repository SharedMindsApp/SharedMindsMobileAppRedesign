import { useState, useRef, useEffect } from 'react';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { CanvasSVGWithFile } from '../../lib/canvasSVGTypes';

interface CanvasSVGObjectProps {
  svg: CanvasSVGWithFile;
  onUpdate: (id: string, updates: { x_position?: number; y_position?: number; scale?: number }) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}

export function CanvasSVGObject({
  svg,
  onUpdate,
  onDelete,
  onBringForward,
  onSendBackward,
}: CanvasSVGObjectProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ scale: 1, mouseX: 0, mouseY: 0 });
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 250, height: 250 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch and parse SVG content
  useEffect(() => {
    const fetchSVG = async () => {
      try {
        const response = await fetch(svg.file_url);
        const text = await response.text();
        setSvgContent(text);

        // Parse dimensions from SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        if (svgEl) {
          const viewBox = svgEl.getAttribute('viewBox');
          if (viewBox) {
            const [, , w, h] = viewBox.split(/\s+/).map(Number);
            if (w && h) {
              setSvgDimensions({ width: w, height: h });
              return;
            }
          }

          const width = svgEl.getAttribute('width');
          const height = svgEl.getAttribute('height');
          if (width && height) {
            setSvgDimensions({
              width: parseFloat(width),
              height: parseFloat(height)
            });
          }
        }
      } catch (err) {
        console.error('Failed to load SVG:', err);
      }
    };

    fetchSVG();
  }, [svg.file_url]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onUpdate(svg.id, {
          x_position: svg.x_position + dx,
          y_position: svg.y_position + dy,
        });
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.mouseX;
        const scaleDelta = dx * 0.01;
        const newScale = Math.max(0.3, Math.min(5, resizeStart.scale + scaleDelta));
        onUpdate(svg.id, { scale: newScale });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, svg, onUpdate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      scale: svg.scale,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = 160;
      const menuHeight = 150;

      let x = rect.right + 8;
      let y = rect.top;

      if (x + menuWidth > window.innerWidth) {
        x = rect.left - menuWidth - 8;
      }

      if (x < 0) {
        x = rect.right + 8;
      }

      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 8;
      }

      if (y < 0) {
        y = 8;
      }

      setContextMenuPos({ x, y });
    } else {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    }

    setShowContextMenu(true);
  };

  useEffect(() => {
    if (showContextMenu) {
      const handleClickOutside = () => setShowContextMenu(false);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const effectiveWidth = svgContent ? svgDimensions.width : 250;
  const effectiveHeight = svgContent ? svgDimensions.height : 250;
  const scaledWidth = effectiveWidth * svg.scale;
  const scaledHeight = effectiveHeight * svg.scale;

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isDragging && !isResizing && setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        style={{
          position: 'absolute',
          left: svg.x_position,
          top: svg.y_position,
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: svg.z_index,
          pointerEvents: 'auto',
        }}
        className={`transition-all ${isHovered ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
      >
        {svgContent ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="select-none [&>svg]:pointer-events-none [&>svg]:w-full [&>svg]:h-full"
            style={{
              width: `${effectiveWidth}px`,
              height: `${effectiveHeight}px`,
              maxWidth: '800px',
              maxHeight: '800px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${svg.scale}) rotate(${svg.rotation}deg)`,
              transformOrigin: 'top left',
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}

        {isHovered && !isDragging && !isResizing && (
          <>
            <div
              className="absolute flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
              style={{
                top: '-32px',
                left: '0',
                pointerEvents: 'auto',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(svg.id);
                }}
                className="p-1 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={14} className="text-red-600" />
              </button>
            </div>

            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute w-8 h-8 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
              style={{
                bottom: '-12px',
                right: '-12px',
                pointerEvents: 'auto',
                zIndex: 9999,
                touchAction: 'none'
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </>
        )}
      </div>

      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            zIndex: 10000,
          }}
          className="bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
        >
          <button
            onClick={() => {
              onBringForward(svg.id);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowUp size={14} />
            Bring Forward
          </button>
          <button
            onClick={() => {
              onSendBackward(svg.id);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowDown size={14} />
            Send Backward
          </button>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => {
              onDelete(svg.id);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
