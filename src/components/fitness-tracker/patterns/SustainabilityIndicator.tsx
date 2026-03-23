/**
 * Sustainability Indicator
 * 
 * Displays sustainability score with visual indicator.
 */

type SustainabilityIndicatorProps = {
  score: number; // 0-1
};

export function SustainabilityIndicator({ score }: SustainabilityIndicatorProps) {
  const percentage = score * 100;
  const getColor = () => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getBgColor = () => {
    if (percentage >= 70) return 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-600';
    return 'bg-orange-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-bold ${getColor()}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBgColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1">
        {percentage >= 70 ? 'High sustainability' :
         percentage >= 50 ? 'Moderate sustainability' :
         'Low sustainability'}
      </p>
    </div>
  );
}
