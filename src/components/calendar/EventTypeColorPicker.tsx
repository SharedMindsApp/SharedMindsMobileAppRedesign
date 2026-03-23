/**
 * EventTypeColorPicker
 * 
 * Color picker component for event type colors.
 * Shows a palette of predefined colors and allows hex input.
 */

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { CalendarEventType } from '../../lib/personalSpaces/calendarService';

interface EventTypeColorPickerProps {
  eventType: CalendarEventType;
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#10B981', // green
  '#6B7280', // gray
  '#F59E0B', // amber
  '#22C55E', // emerald
  '#F97316', // orange
  '#8B5CF6', // violet
  '#EF4444', // red
  '#0EA5E9', // sky
  '#EC4899', // pink
  '#14B8A6', // teal
  '#A855F7', // purple
  '#F43F5E', // rose
  '#84CC16', // lime
];

export function EventTypeColorPicker({
  eventType,
  currentColor,
  onColorChange,
  onClose,
}: EventTypeColorPickerProps) {
  const [hexInput, setHexInput] = useState(currentColor);

  const handlePaletteClick = (color: string) => {
    setHexInput(color);
    onColorChange(color);
  };

  const handleHexInputChange = (value: string) => {
    // Allow hex input with or without #
    const normalized = value.startsWith('#') ? value : `#${value}`;
    setHexInput(normalized);
    
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      onColorChange(normalized);
    }
  };

  const handleApply = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      onColorChange(hexInput);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Choose Color for {eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Palette
          </label>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => handlePaletteClick(color)}
                className={`
                  w-12 h-12 rounded-lg border-2 transition-all hover:scale-110
                  ${currentColor.toUpperCase() === color.toUpperCase()
                    ? 'border-gray-900 ring-2 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              >
                {currentColor.toUpperCase() === color.toUpperCase() && (
                  <Check className="w-6 h-6 text-white mx-auto" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Hex Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Color (Hex)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInputChange(e.target.value)}
                placeholder="#3B82F6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={7}
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: hexInput }}
              />
            </div>
          </div>
          {!(/^#[0-9A-Fa-f]{6}$/.test(hexInput)) && hexInput.length > 0 && (
            <p className="text-xs text-red-600 mt-1">Invalid hex color</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!(/^#[0-9A-Fa-f]{6}$/.test(hexInput))}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all min-h-[44px]
              ${!(/^#[0-9A-Fa-f]{6}$/.test(hexInput)) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
