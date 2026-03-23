/**
 * Energy Mode Selector
 * 
 * Manual signal for energy level (low/medium/high).
 * Ephemeral preference - not logged or tracked.
 */

import { useState, useEffect } from 'react';
import { Battery, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react';
import { EnergyMode, getDefaultEnergyMode, saveEnergyMode } from '../../../lib/planner/adaptivePlanEngine';

interface PlannerEnergyModeSelectorProps {
  onEnergyModeChange?: (mode: EnergyMode) => void;
}

export function PlannerEnergyModeSelector({ onEnergyModeChange }: PlannerEnergyModeSelectorProps) {
  const [energyMode, setEnergyMode] = useState<EnergyMode>(getDefaultEnergyMode());

  useEffect(() => {
    const mode = getDefaultEnergyMode();
    setEnergyMode(mode);
    onEnergyModeChange?.(mode);
  }, []);

  const handleModeChange = (mode: EnergyMode) => {
    setEnergyMode(mode);
    saveEnergyMode(mode);
    onEnergyModeChange?.(mode);
  };

  const modes: Array<{ mode: EnergyMode; label: string; icon: typeof Battery; color: string }> = [
    {
      mode: 'low',
      label: 'Low',
      icon: BatteryLow,
      color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
    },
    {
      mode: 'medium',
      label: 'Medium',
      icon: BatteryMedium,
      color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
      mode: 'high',
      label: 'High',
      icon: BatteryFull,
      color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
    },
  ];

  return (
    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-gray-700">How's your energy right now?</div>
          <div className="text-xs text-gray-500 mt-0.5">You can change this anytime.</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        {modes.map(({ mode, label, icon: Icon, color }) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-all ${
              energyMode === mode
                ? `${color} border-current shadow-sm`
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Icon size={16} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
