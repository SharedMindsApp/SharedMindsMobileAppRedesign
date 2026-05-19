import { Calendar, CheckCircle, Target, Activity } from 'lucide-react';

export default function PlanningWidget() {
  return (
    <div className="w-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl shadow-xl p-6 border-2 border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-blue-900 text-lg">Planning</span>
      </div>

      <p className="text-sm text-blue-800 mb-4 leading-relaxed italic">
        Structure and track progress
      </p>

      <div className="space-y-2">
        <div className="bg-white/60 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Tasks</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-3 h-3 text-cyan-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Calendars</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3 text-emerald-600" />
            <Activity className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-xs text-blue-600 font-medium">Goals & Habits</span>
        </div>
      </div>
    </div>
  );
}
