import { FileText, CheckCircle, Users } from 'lucide-react';
import { WidgetWithLayout, AgreementContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface AgreementWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function AgreementWidget({ widget, sizeMode, highContrast }: AgreementWidgetProps) {
  const content = widget.content as AgreementContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <FileText size={24} className={highContrast ? 'text-white' : 'text-gray-700'} />
        <div className={`text-xs font-bold mt-1 ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {content.agreedBy?.length || 0}
        </div>
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          <h3 className={`font-semibold text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
        </div>
        <div className={`text-xs space-y-1 mb-2 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
          {content.rules?.slice(0, 2).map((rule, index) => (
            <div key={index} className="flex items-start gap-1.5">
              <span className="mt-0.5">•</span>
              <span className="line-clamp-1">{rule}</span>
            </div>
          ))}
          {content.rules && content.rules.length > 2 && (
            <div className={highContrast ? 'text-gray-400' : 'text-gray-600'}>
              +{content.rules.length - 2} more
            </div>
          )}
        </div>
        <div className={`mt-auto flex items-center gap-1 text-xs ${
          highContrast ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <Users size={12} />
          {content.agreedBy?.length || 0} agreed
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
          {widget.title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className={`space-y-2 mb-3 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
          {content.rules?.map((rule, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className={highContrast ? 'text-white' : 'text-green-600'} />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`mt-3 pt-3 border-t ${
        highContrast ? 'border-gray-800' : 'border-gray-300'
      }`}>
        <div className={`flex items-center gap-2 text-sm ${
          highContrast ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <Users size={16} />
          <span>{content.agreedBy?.length || 0} household members agreed</span>
        </div>
      </div>
    </div>
  );
}
