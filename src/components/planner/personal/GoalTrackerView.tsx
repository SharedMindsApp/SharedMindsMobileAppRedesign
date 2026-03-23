import { GoalTrackerWidget } from '../widgets/GoalTrackerWidget';

export function GoalTrackerView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Goal Tracker</h2>
          <p className="text-slate-600 mt-1">Track personal growth goals across life domains</p>
        </div>
      </div>
      <GoalTrackerWidget layout="full" />
    </div>
  );
}
