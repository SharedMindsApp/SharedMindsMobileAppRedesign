/**
 * Visual Meter Component
 * 
 * Premium animated progress meter for displaying metrics
 * (e.g., intensity, progress, achievements)
 */

type VisualMeterProps = {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
};

export function VisualMeter({
  value,
  max,
  label,
  color = '#3B82F6',
  showValue = true,
  size = 'md',
  animated = true,
}: VisualMeterProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className={`font-semibold text-gray-700 ${textSizes[size]}`}>{label}</span>
          {showValue && (
            <span className={`font-bold ${textSizes[size]}`} style={{ color }}>
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${sizeClasses[size]} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${animated ? 'ease-out' : ''}`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            transition: animated ? 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
