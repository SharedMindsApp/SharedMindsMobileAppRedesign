/**
 * ColorPicker Component
 * 
 * Color picker with preset colors and custom color code input.
 * Used for tag creation and editing.
 */

import { useState } from 'react';
import { Check, Palette } from 'lucide-react';

export interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  defaultColor?: string; // Default color based on category
  compact?: boolean;
}

// Preset colors (common Tailwind colors)
const PRESET_COLORS = [
  { name: 'Blue', value: 'blue', hex: '#3B82F6' },
  { name: 'Green', value: 'green', hex: '#10B981' },
  { name: 'Purple', value: 'purple', hex: '#8B5CF6' },
  { name: 'Orange', value: 'orange', hex: '#F97316' },
  { name: 'Red', value: 'red', hex: '#EF4444' },
  { name: 'Yellow', value: 'yellow', hex: '#FBBF24' },
  { name: 'Pink', value: 'pink', hex: '#EC4899' },
  { name: 'Indigo', value: 'indigo', hex: '#6366F1' },
  { name: 'Cyan', value: 'cyan', hex: '#06B6D4' },
  { name: 'Teal', value: 'teal', hex: '#14B8A6' },
  { name: 'Gray', value: 'gray', hex: '#6B7280' },
  { name: 'Slate', value: 'slate', hex: '#64748B' },
];

export function ColorPicker({
  value,
  onChange,
  defaultColor,
  compact = false,
}: ColorPickerProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Determine current color value
  const currentColor = value || defaultColor || 'gray';
  const currentPreset = PRESET_COLORS.find(c => c.value === currentColor);

  const handlePresetSelect = (colorValue: string) => {
    onChange(colorValue);
    setShowPresets(false);
    setShowCustomInput(false);
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex);
    // Convert hex to color name if it matches a preset, otherwise use hex
    const matchingPreset = PRESET_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    if (matchingPreset) {
      onChange(matchingPreset.value);
    } else {
      onChange(hex); // Store hex code directly
    }
  };

  const handleCustomSubmit = () => {
    if (customColor) {
      handleCustomColorChange(customColor);
      setShowCustomInput(false);
      setShowPresets(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setShowPresets(!showPresets);
          setShowCustomInput(false);
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${
          compact ? 'px-2 py-1 text-xs' : ''
        }`}
      >
        <div
          className="w-4 h-4 rounded border border-gray-300"
          style={{
            backgroundColor: currentPreset?.hex || currentColor || '#6B7280',
          }}
        />
        <Palette size={compact ? 14 : 16} />
        <span className={compact ? 'text-xs' : ''}>
          {currentPreset?.name || 'Custom'}
        </span>
      </button>

      {showPresets && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          {/* Preset Colors Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESET_COLORS.map(preset => {
              const isSelected = currentColor === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`relative w-8 h-8 rounded border-2 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  {isSelected && (
                    <Check
                      size={16}
                      className="absolute inset-0 m-auto text-white drop-shadow"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Color Input */}
          <div className="border-t border-gray-200 pt-3">
            {showCustomInput ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor || currentColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomColor('');
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded border border-gray-300"
              >
                Custom Color
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}






