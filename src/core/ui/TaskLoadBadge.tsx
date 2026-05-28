/**
 * TaskLoadBadge — the one visual language for a task's cognitive load
 * (Light / Medium / Deep). Load is the same signal as the DB's energy_level
 * (low / medium / high) and a CoreTask's `energy` field; this module is the
 * single source of truth for the label + colours so every surface — home
 * cards, the project board, the detail sheet, the add sheet — matches.
 */

export type TaskLoad = 'deep' | 'medium' | 'light';
export type EnergyLevel = 'high' | 'medium' | 'low';

export const TASK_LOAD_META: Record<TaskLoad, {
  label: string;
  hex: string;       // dot colour
  chip: string;      // bg + text for the pill
}> = {
  deep:   { label: 'Deep',   hex: '#8b5cf6', chip: 'bg-violet-100 text-violet-700' },
  medium: { label: 'Medium', hex: '#3b82f6', chip: 'bg-blue-100 text-blue-700' },
  light:  { label: 'Light',  hex: '#10b981', chip: 'bg-emerald-100 text-emerald-700' },
};

/** Light → Medium → Deep, for rendering pickers in a sensible order. */
export const TASK_LOAD_ORDER: TaskLoad[] = ['light', 'medium', 'deep'];

export function energyToLoad(energy: EnergyLevel | null | undefined): TaskLoad {
  return energy === 'high' ? 'deep' : energy === 'low' ? 'light' : 'medium';
}
export function loadToEnergy(load: TaskLoad): EnergyLevel {
  return load === 'deep' ? 'high' : load === 'light' ? 'low' : 'medium';
}

/** Compact read-only pill: coloured dot + label. */
export function TaskLoadBadge({ load, className = '' }: { load: TaskLoad; className?: string }) {
  const meta = TASK_LOAD_META[load];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.chip} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
      {meta.label}
    </span>
  );
}

/** Interactive Light/Medium/Deep segmented picker, used in the task sheets. */
export function TaskLoadPicker({
  value, onChange, size = 'md',
}: {
  value: TaskLoad;
  onChange: (load: TaskLoad) => void;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs';
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface-container-low p-0.5">
      {TASK_LOAD_ORDER.map((load) => {
        const active = value === load;
        const meta = TASK_LOAD_META[load];
        return (
          <button
            key={load}
            type="button"
            onClick={() => onChange(load)}
            title={`${meta.label} focus`}
            aria-label={`${meta.label} focus`}
            aria-pressed={active}
            className={`rounded-md font-bold transition-all ${pad} ${
              active ? 'text-white shadow-sm' : 'stitch-text-secondary hover:bg-surface-container'
            }`}
            style={active ? { backgroundColor: meta.hex } : undefined}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
