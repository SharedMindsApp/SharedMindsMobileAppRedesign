import { useEffect } from 'react';
import { X } from 'lucide-react';
import { FridgeGroup, WidgetWithLayout } from '../../lib/fridgeCanvasTypes';

interface FullscreenGroupViewProps {
  group: FridgeGroup;
  widgets: WidgetWithLayout[];
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenGroupView({
  group,
  widgets,
  onClose,
  children,
}: FullscreenGroupViewProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const colorClasses = {
    gray: 'bg-gray-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
    purple: 'bg-purple-100',
  };

  const bgColor = colorClasses[group.color as keyof typeof colorClasses] || colorClasses.gray;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Fullscreen Content */}
      <div className={`relative w-[95vw] h-[90vh] rounded-3xl shadow-2xl ${bgColor} border-4 border-gray-300 overflow-hidden`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-b-2 border-gray-300 flex items-center justify-between px-6 z-10">
          <h2 className="text-2xl font-bold text-gray-900">{group.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close (ESC)"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="absolute top-16 left-0 right-0 bottom-0 overflow-auto">
          <div className="relative min-h-full p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
