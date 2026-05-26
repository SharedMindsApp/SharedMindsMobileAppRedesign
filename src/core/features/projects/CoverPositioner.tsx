// CoverPositioner
//
// Drag-to-pan + zoom-slider editor for project cover images. The preview
// is a 16:9 frame matching the hero aspect ratio (so what the user sees
// during edit is what they get on the detail page). Position and zoom
// translate cleanly to `object-position` + `transform: scale()` at render
// time — see CoverImage.tsx for the matching renderer.
//
// Why object-fit + transform rather than background-image?
// `background-position` clamps to the natural image dimensions, which
// means once zoom > 1 you can't pan to certain regions without doing
// background-size math. The img+transform pattern lets us treat position
// as a clean 0-100% focal point on the original image regardless of zoom.

import { useRef, useState, useEffect, useCallback } from 'react';
import { Move, ZoomIn } from 'lucide-react';

interface Props {
  url: string;
  /** Focal point 0-100 (percentage of the original image). */
  x: number;
  y: number;
  /** Zoom × 100 (100 = cover-fit baseline). */
  zoom: number;
  onChange: (next: { x: number; y: number; zoom: number }) => void;
}

export function CoverPositioner({ url, x, y, zoom, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  // Drag state. We capture the pointer down position + the initial focal
  // point, then derive the delta on move and translate it into focal-point
  // % space based on the frame width/height.
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, startX: x, startY: y };
    setDragging(true);
  }, [x, y]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    // Convert pixel delta to focal-point % delta. We invert because dragging
    // RIGHT should move the image right, which is equivalent to the focal
    // point moving LEFT. (You're pulling the image; the focal point you're
    // looking at slides in the opposite direction.)
    const dxPct = -(dx / rect.width) * 100;
    const dyPct = -(dy / rect.height) * 100;
    // Scale the delta down by zoom — at higher zoom, the same drag should
    // produce a smaller focal-point change (because more pixels = more
    // detail per percent).
    const zoomFactor = zoom / 100;
    const nextX = clamp(dragStartRef.current.startX + dxPct / zoomFactor, 0, 100);
    const nextY = clamp(dragStartRef.current.startY + dyPct / zoomFactor, 0, 100);
    onChange({ x: Math.round(nextX), y: Math.round(nextY), zoom });
  }, [dragging, zoom, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  // Wheel-to-zoom for trackpad users — feels natural on a positioner.
  // Mouse-wheel users can use the slider; we intentionally don't trap wheel
  // scrolling unless the cursor is over the frame to avoid hijacking page scroll.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return; // require modifier so it doesn't fight scrolling
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      onChange({ x, y, zoom: clamp(zoom + delta, 100, 300) });
    }
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [x, y, zoom, onChange]);

  return (
    <div className="space-y-2">
      {/* The actual preview — matches the hero aspect ratio. */}
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-surface-container bg-surface-container-low select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: 'cover',
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: `${x}% ${y}%`,
            transition: dragging ? 'none' : 'transform 200ms ease',
          }}
        />
        {/* Centre crosshair hint — only visible while dragging */}
        {dragging && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Move size={18} className="text-white/70 drop-shadow-md" />
          </div>
        )}
        {/* Idle hint */}
        {!dragging && (
          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <Move size={9} /> Drag to reposition
          </div>
        )}
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-2 px-1">
        <ZoomIn size={12} className="stitch-text-secondary flex-shrink-0" />
        <input
          type="range"
          min={100}
          max={300}
          step={5}
          value={zoom}
          onChange={(e) => onChange({ x, y, zoom: parseInt(e.target.value, 10) })}
          className="flex-1 h-1 accent-primary"
          aria-label="Cover zoom"
        />
        <span className="text-[10px] font-bold tabular-nums stitch-text-secondary w-10 text-right">
          {(zoom / 100).toFixed(1)}×
        </span>
      </div>

      {(x !== 50 || y !== 50 || zoom !== 100) && (
        <button
          type="button"
          onClick={() => onChange({ x: 50, y: 50, zoom: 100 })}
          className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary hover:stitch-text-primary transition-colors"
        >
          ↺ Reset position
        </button>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
