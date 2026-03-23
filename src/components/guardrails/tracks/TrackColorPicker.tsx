import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { TRACK_COLORS, type TrackColorKey } from '../../../lib/guardrails/tracksTypes';

interface TrackColorPickerProps {
  currentColor: string | null;
  onColorChange: (color: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function TrackColorPicker({
  currentColor,
  onColorChange,
  isOpen,
  onClose,
  position,
}: TrackColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleColorSelect = (colorKey: TrackColorKey) => {
    onColorChange(TRACK_COLORS[colorKey]);
    onClose();
  };

  const style = position
    ? { position: 'absolute' as const, top: position.y, left: position.x }
    : {};

  return (
    <div
      ref={pickerRef}
      className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50"
      style={style}
    >
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Track Color
      </p>
      <div className="grid grid-cols-5 gap-2 mb-2">
        {(Object.entries(TRACK_COLORS) as [TrackColorKey, string][]).map(([key, color]) => (
          <button
            key={key}
            onClick={() => handleColorSelect(key)}
            className="w-8 h-8 rounded-md transition-transform hover:scale-110 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
            style={{ backgroundColor: color }}
            title={key}
          >
            {currentColor === color && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check size={16} className="text-white drop-shadow-lg" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
      {currentColor && (
        <button
          onClick={() => {
            onColorChange(null);
            onClose();
          }}
          className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-1"
        >
          <X size={14} />
          Remove Color
        </button>
      )}
    </div>
  );
}
