import { Lightbulb, Sparkles } from 'lucide-react';

export default function ThinkingWidget() {
  return (
    <div className="w-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl shadow-xl p-6 border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-purple-900 text-lg">Thinking</span>
      </div>

      <p className="text-sm text-purple-800 mb-4 leading-relaxed italic">
        Capture and process ideas
      </p>

      <div className="space-y-2">
        <div className="bg-white/60 rounded-xl p-3 border border-purple-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Notes</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-purple-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Insights</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-purple-100 flex items-center justify-between">
          <span className="text-xs text-purple-600 font-medium">+ Photos & Frames</span>
        </div>
      </div>
    </div>
  );
}
