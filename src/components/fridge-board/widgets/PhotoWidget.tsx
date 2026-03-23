import { Image } from 'lucide-react';
import { WidgetWithLayout, PhotoContent, SizeMode } from '../../../lib/fridgeBoardTypes';

interface PhotoWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function PhotoWidget({ widget, sizeMode, highContrast }: PhotoWidgetProps) {
  const content = widget.content as PhotoContent;

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {content.imageUrl ? (
          <img
            src={content.imageUrl}
            alt={widget.title}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Image size={28} className={highContrast ? 'text-white' : 'text-gray-700'} />
        )}
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        {content.imageUrl ? (
          <>
            <div className="flex-1 mb-2 rounded-lg overflow-hidden">
              <img
                src={content.imageUrl}
                alt={widget.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className={`text-xs truncate ${highContrast ? 'text-white' : 'text-gray-900'} font-semibold`}>
              {widget.title}
            </p>
          </>
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${
            highContrast ? 'bg-gray-900' : 'bg-gray-100'
          } rounded-lg`}>
            <Image size={32} className={highContrast ? 'text-white' : 'text-gray-400'} />
            <p className={`text-xs mt-2 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
              No image
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {content.imageUrl ? (
        <>
          <div className="flex-1 mb-3 rounded-lg overflow-hidden">
            <img
              src={content.imageUrl}
              alt={widget.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className={`font-bold text-sm ${highContrast ? 'text-white' : 'text-gray-900'}`}>
            {widget.title}
          </h3>
          {content.caption && (
            <p className={`text-sm mt-2 ${highContrast ? 'text-gray-300' : 'text-gray-700'}`}>
              {content.caption}
            </p>
          )}
        </>
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center ${
          highContrast ? 'bg-gray-900' : 'bg-gray-100'
        } rounded-lg`}>
          <Image size={48} className={highContrast ? 'text-white' : 'text-gray-400'} />
          <p className={`text-sm mt-3 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
            No image uploaded
          </p>
        </div>
      )}
    </div>
  );
}
