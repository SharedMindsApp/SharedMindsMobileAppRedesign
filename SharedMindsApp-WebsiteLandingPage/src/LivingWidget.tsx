import { Heart, UtensilsCrossed, ShoppingCart, Smile } from 'lucide-react';

export default function LivingWidget() {
  return (
    <div className="w-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-xl p-6 border-2 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-green-900 text-lg">Living</span>
      </div>

      <p className="text-sm text-green-800 mb-4 leading-relaxed italic">
        Daily life and wellness
      </p>

      <div className="space-y-2">
        <div className="bg-white/60 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-3 h-3 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Meal Planners</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-green-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-xs font-medium text-slate-700">Grocery Lists</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 border border-green-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-3 h-3 text-rose-600" />
            <Smile className="w-3 h-3 text-amber-600" />
          </div>
          <span className="text-xs text-green-600 font-medium">Wellness</span>
        </div>
      </div>
    </div>
  );
}
