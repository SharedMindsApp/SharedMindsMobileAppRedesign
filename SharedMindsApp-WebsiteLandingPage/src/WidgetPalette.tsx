import { CheckCircle } from 'lucide-react';
import MoveableWidgetDemo from './MoveableWidgetDemo';
import UseCaseCarousel from './UseCaseCarousel';

export default function WidgetPalette() {
  return (
    <div className="space-y-8 sm:space-y-12">
      <MoveableWidgetDemo />

      <div className="pt-6 sm:pt-8 border-t border-slate-200">
        <p className="text-center text-base sm:text-lg text-slate-700 font-medium px-4">
          You don't choose a template — you assemble what you need.
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
        <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-3 sm:mb-4">
          Widgets can:
        </p>
        <ul className="space-y-2 sm:space-y-3">
          <li className="flex items-start gap-2 sm:gap-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm sm:text-base text-slate-700">stand alone</span>
          </li>
          <li className="flex items-start gap-2 sm:gap-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm sm:text-base text-slate-700">interact with each other</span>
          </li>
          <li className="flex items-start gap-2 sm:gap-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm sm:text-base text-slate-700">sync with GuardRails features</span>
          </li>
        </ul>
        <p className="text-slate-800 font-medium mt-4 sm:mt-6 italic text-sm sm:text-base">
          You're never locked into a single layout or workflow.
        </p>
      </div>

      <UseCaseCarousel />
    </div>
  );
}
