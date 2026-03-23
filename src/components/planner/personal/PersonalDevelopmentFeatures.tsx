import { Anchor, Lightbulb, Palette, Repeat } from 'lucide-react';
import { HabitTrackerView } from './HabitTrackerView';

export function HobbiesView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Palette className="w-8 h-8 text-purple-500" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hobbies & Interests</h2>
          <p className="text-slate-600 mt-1">Track interests without productivity pressure</p>
        </div>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <Palette className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Coming Soon</h3>
        <p className="text-slate-500">Track your hobbies and time spent on personal activities</p>
      </div>
    </div>
  );
}

export function ValuesView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Anchor className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Values & Principles</h2>
          <p className="text-slate-600 mt-1">Anchor decisions to identity</p>
        </div>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <Anchor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Coming Soon</h3>
        <p className="text-slate-500">Define and align actions with your core values</p>
      </div>
    </div>
  );
}

export function IdeasView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="w-8 h-8 text-yellow-500" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ideas & Inspiration</h2>
          <p className="text-slate-600 mt-1">Capture sparks without obligation</p>
        </div>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Coming Soon</h3>
        <p className="text-slate-500">Capture creative ideas and inspirations</p>
      </div>
    </div>
  );
}

export function HabitsView() {
  return <HabitTrackerView />;
}
