// CoverPositioner
//
// Drag-to-pan + zoom-slider + fit/fill toggle + background-colour picker
// for project cover images. The preview is a 16:9 frame matching the
// hero aspect ratio (what you see during edit is what you get).
//
// Why object-fit + transform rather than background-image?
// `background-position` clamps to the natural image dimensions, which
// means once zoom > 1 you can't pan to certain regions without doing
// background-size math. The img+transform pattern treats position as a
// clean 0-100% focal point regardless of zoom.

import { useRef, useState, useEffect, useCallback } from 'react';
import { Move, ZoomIn, Maximize2, Crop, Type } from 'lucide-react';

interface Transform {
  x: number;
  y: number;
  zoom: number;
  fit: 'cover' | 'contain';
  bgColor: string | null;
  textColor: 'light' | 'dark';
}

interface Props extends Transform {
  url: string;
  onChange: (next: Transform) => void;
}

/** Quick-pick palette for the background colour. Tuned to look good
 *  behind illustrated covers on white. Custom hex is always available
 *  via the native colour input on the right. */
const BG_PRESETS: { label: string; value: string }[] = [
  { label: 'White',   value: '#ffffff' },
  { label: 'Cream',   value: '#faf6ee' },
  { label: 'Sage',    value: '#e8efe2' },
  { label: 'Sky',     value: '#e6f1fb' },
  { label: 'Slate',   value: '#1f2937' },
  { label: 'Black',   value: '#0a0a0a' },
];

export function CoverPositioner({ url, x, y, zoom, fit, bgColor, textColor, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
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
    // Drag right → image moves right → focal point slides LEFT.
    const dxPct = -(dx / rect.width) * 100;
    const dyPct = -(dy / rect.height) * 100;
    // Higher zoom = less focal-point shift per pixel of drag.
    const zoomFactor = zoom / 100;
    const nextX = clamp(dragStartRef.current.startX + dxPct / zoomFactor, 0, 100);
    const nextY = clamp(dragStartRef.current.startY + dyPct / zoomFactor, 0, 100);
    onChange({ x: Math.round(nextX), y: Math.round(nextY), zoom, fit, bgColor, textColor });
  }, [dragging, zoom, fit, bgColor, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  // Cmd/Ctrl + wheel = zoom. Bare wheel keeps page scrolling normal.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      onChange({ x, y, zoom: clamp(zoom + delta, 50, 300), fit, bgColor, textColor });
    }
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [x, y, zoom, fit, bgColor, onChange]);

  // Background bands are visible whenever fit is 'contain' OR zoom < 100.
  // We always allow setting bgColor (it composes), but the UI emphasises
  // it more when bands are actually likely to show.
  const bandsLikely = fit === 'contain' || zoom < 100;

  return (
    <div className="space-y-2.5">
      {/* The preview — exact match for the hero aspect ratio (16:9). */}
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-surface-container select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ backgroundColor: bgColor ?? 'rgb(245 245 245)' }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: fit,
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: `${x}% ${y}%`,
            transition: dragging ? 'none' : 'transform 200ms ease',
          }}
        />
        {dragging && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Move size={18} className="text-white/70 drop-shadow-md" />
          </div>
        )}
        {/* Legibility overlay — matches what the hero applies. Lighter
            in contain mode (less needed; chosen bg shows through). */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            textColor === 'light'
              ? fit === 'contain'
                ? 'bg-gradient-to-br from-black/10 via-black/15 to-black/30'
                : 'bg-gradient-to-br from-black/30 via-black/40 to-black/60'
              : fit === 'contain'
                ? 'bg-gradient-to-br from-white/10 via-white/15 to-white/30'
                : 'bg-gradient-to-br from-white/40 via-white/50 to-white/70'
          }`}
        />
        {/* Sample title — gives a live read of how text will look on
            top of the chosen background + overlay combination. */}
        <div className="absolute left-3 bottom-3 pointer-events-none">
          <p className={`text-base font-extrabold leading-tight ${
            textColor === 'light' ? 'text-white' : 'text-stitch-text-primary'
          }`}>
            Your project title
          </p>
          <p className={`text-[10px] font-semibold ${
            textColor === 'light' ? 'text-white/75' : 'text-stitch-text-secondary'
          }`}>
            Description preview
          </p>
        </div>
        {!dragging && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/85 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <Move size={9} /> Drag
          </div>
        )}
      </div>

      {/* Light / Dark text toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-container-low">
        <button
          type="button"
          onClick={() => onChange({ x, y, zoom, fit, bgColor, textColor: 'light' })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            textColor === 'light'
              ? 'bg-white stitch-text-primary shadow-sm'
              : 'stitch-text-secondary hover:stitch-text-primary'
          }`}
        >
          <Type size={11} /> Light text
        </button>
        <button
          type="button"
          onClick={() => onChange({ x, y, zoom, fit, bgColor, textColor: 'dark' })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            textColor === 'dark'
              ? 'bg-white stitch-text-primary shadow-sm'
              : 'stitch-text-secondary hover:stitch-text-primary'
          }`}
        >
          <Type size={11} /> Dark text
        </button>
      </div>

      {/* Fit mode toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-container-low">
        <button
          type="button"
          onClick={() => onChange({ x, y, zoom, fit: 'cover', bgColor, textColor })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            fit === 'cover'
              ? 'bg-white stitch-text-primary shadow-sm'
              : 'stitch-text-secondary hover:stitch-text-primary'
          }`}
        >
          <Crop size={11} /> Fill frame
        </button>
        <button
          type="button"
          onClick={() => onChange({ x, y, zoom, fit: 'contain', bgColor, textColor })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
            fit === 'contain'
              ? 'bg-white stitch-text-primary shadow-sm'
              : 'stitch-text-secondary hover:stitch-text-primary'
          }`}
        >
          <Maximize2 size={11} /> Fit whole
        </button>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-2 px-1">
        <ZoomIn size={12} className="stitch-text-secondary flex-shrink-0" />
        <input
          type="range"
          min={50}
          max={300}
          step={5}
          value={zoom}
          onChange={(e) => onChange({ x, y, zoom: parseInt(e.target.value, 10), fit, bgColor, textColor })}
          className="flex-1 h-1 accent-primary"
          aria-label="Cover zoom"
        />
        <span className="text-[10px] font-bold tabular-nums stitch-text-secondary w-10 text-right">
          {(zoom / 100).toFixed(1)}×
        </span>
      </div>

      {/* Background colour — preset swatches + custom picker. The label
          gets slightly muted when bands aren't visible to stay quiet but
          available. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            bandsLikely ? 'stitch-text-secondary' : 'stitch-text-secondary/50'
          }`}>
            Background
            {!bandsLikely && <span className="ml-1 normal-case font-normal tracking-normal">(visible when bands show)</span>}
          </span>
          {bgColor && (
            <button
              type="button"
              onClick={() => onChange({ x, y, zoom, fit, bgColor: null, textColor })}
              className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary hover:stitch-text-primary"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange({ x, y, zoom, fit, bgColor: preset.value, textColor })}
              className={`w-7 h-7 rounded-md ring-2 transition-all hover:scale-110 ${
                bgColor?.toLowerCase() === preset.value.toLowerCase()
                  ? 'ring-primary'
                  : 'ring-surface-container hover:ring-surface-container-low'
              }`}
              style={{ backgroundColor: preset.value }}
              aria-label={preset.label}
              title={preset.label}
            />
          ))}
          <label
            className="w-7 h-7 rounded-md ring-2 ring-surface-container hover:ring-primary cursor-pointer flex items-center justify-center bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400"
            title="Custom colour"
          >
            <input
              type="color"
              value={bgColor ?? '#ffffff'}
              onChange={(e) => onChange({ x, y, zoom, fit, bgColor: e.target.value, textColor })}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      </div>

      {(x !== 50 || y !== 50 || zoom !== 100 || fit !== 'cover' || bgColor || textColor !== 'light') && (
        <button
          type="button"
          onClick={() => onChange({ x: 50, y: 50, zoom: 100, fit: 'cover', bgColor: null, textColor: 'light' })}
          className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary hover:stitch-text-primary transition-colors"
        >
          ↺ Reset everything
        </button>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
