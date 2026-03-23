import { X, AlertTriangle, Info, TrendingUp, TrendingDown, PartyPopper } from 'lucide-react';
import { useRegulation } from '../../../contexts/RegulationContext';

export function RegulationNotificationBanner() {
  const { notification, dismissNotification } = useRegulation();

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'warning':
        return <AlertTriangle size={24} />;
      case 'celebration':
        return <PartyPopper size={24} />;
      case 'escalation':
        return <TrendingUp size={24} />;
      case 'deescalation':
        return <TrendingDown size={24} />;
      default:
        return <Info size={24} />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'warning':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'celebration':
        return 'bg-green-100 border-green-500 text-green-900';
      case 'escalation':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'deescalation':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900';
    }
  };

  const getEmoji = () => {
    const emojis = ['😎', '🙂', '😐', '😬', '🛡️'];
    return emojis[notification.level - 1];
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full border-l-4 rounded-lg shadow-2xl p-4 ${getColors()} animate-in slide-in-from-right duration-300`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getEmoji()}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getIcon()}
            <p className="font-bold text-lg">
              {notification.type === 'escalation' && 'Level Change'}
              {notification.type === 'deescalation' && 'Progress Made!'}
              {notification.type === 'warning' && 'Heads Up'}
              {notification.type === 'celebration' && 'Awesome!'}
              {notification.type === 'info' && 'Info'}
            </p>
          </div>
          <p className="text-sm leading-relaxed">{notification.message}</p>
          {notification.action && (
            <button className="mt-3 px-4 py-2 bg-white/50 hover:bg-white/70 rounded-lg text-sm font-medium transition-colors">
              {notification.action}
            </button>
          )}
        </div>
        {notification.dismissible && (
          <button
            onClick={dismissNotification}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
