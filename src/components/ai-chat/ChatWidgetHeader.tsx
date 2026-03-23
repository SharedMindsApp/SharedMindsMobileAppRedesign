import { X, Minimize2, Maximize2, Lock, Unlock, ArrowLeft, Plus } from 'lucide-react';
import type { CurrentSurface } from '../../lib/aiChatWidgetTypes';
import { getSurfaceIcon } from '../../lib/aiChatWidgetTypes';

interface ChatWidgetHeaderProps {
  currentSurface: CurrentSurface;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isDocked: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  onNewChat?: () => void;
}

export function ChatWidgetHeader({
  currentSurface,
  onClose,
  onMinimize,
  onMaximize,
  isDocked,
  onMouseDown,
  onBack,
  showBackButton = false,
  onNewChat,
}: ChatWidgetHeaderProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-between ${
        !isDocked ? 'cursor-move' : ''
      }`}
      onMouseDown={onMouseDown}
      role="banner"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBackButton && onBack && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="p-1 hover:bg-blue-200 rounded transition-colors"
            aria-label="Back to conversations"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label={`${currentSurface.surfaceType} surface`}>
              {getSurfaceIcon(currentSurface.surfaceType)}
            </span>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                AI Chat - {currentSurface.label}
              </h3>
              <p className="text-xs text-gray-600 truncate" title={currentSurface.description}>
                {currentSurface.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="p-1.5 hover:bg-blue-200 rounded transition-colors"
            aria-label="Start new chat"
            title="Start new chat"
          >
            <Plus className="w-4 h-4 text-gray-700" />
          </button>
        )}

        <button
          onClick={onMinimize}
          className="p-1.5 hover:bg-blue-200 rounded transition-colors"
          aria-label="Minimize widget"
          title="Minimize"
        >
          <Minimize2 className="w-4 h-4 text-gray-700" />
        </button>

        <button
          onClick={onMaximize}
          className="p-1.5 hover:bg-blue-200 rounded transition-colors"
          aria-label={isDocked ? 'Undock widget' : 'Dock widget to right'}
          title={isDocked ? 'Float' : 'Dock Right'}
        >
          {isDocked ? (
            <Unlock className="w-4 h-4 text-gray-700" />
          ) : (
            <Lock className="w-4 h-4 text-gray-700" />
          )}
        </button>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-red-200 rounded transition-colors"
          aria-label="Close widget"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
