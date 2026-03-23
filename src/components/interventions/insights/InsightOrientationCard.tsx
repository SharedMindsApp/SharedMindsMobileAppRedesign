export function InsightOrientationCard() {
  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">How things have been unfolding</h3>

      <p className="text-sm text-gray-700 leading-relaxed mb-4">
        These insights compare what you intended to do with what actually happened. They are descriptive, not
        evaluative. Nothing here means you're doing anything wrong.
      </p>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-xs font-medium text-gray-900 mb-3">Visual Legend</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-sm text-gray-700">Intent (plans, alignment)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm text-gray-700">Observation (what happened)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <span className="text-sm text-gray-700">Context (signals, regulation state)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
