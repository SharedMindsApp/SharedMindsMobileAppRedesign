import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface NudgeBannerProps {
  type: 'soft' | 'hard' | 'regulation';
  message: string;
  onAcknowledge?: () => void;
}

export function NudgeBanner({ type, message, onAcknowledge }: NudgeBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === 'soft') {
      const timer = setTimeout(() => {
        setVisible(false);
        onAcknowledge?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [type, onAcknowledge]);

  if (!visible) return null;

  function handleAcknowledge() {
    setVisible(false);
    onAcknowledge?.();
  }

  const styles = {
    soft: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      Icon: Info,
    },
    hard: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      icon: 'text-red-600',
      Icon: AlertTriangle,
    },
    regulation: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      Icon: AlertCircle,
    },
  };

  const style = styles[type];
  const Icon = style.Icon;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-top duration-300">
      <div className={`${style.bg} border-2 rounded-lg shadow-lg p-4 flex items-center gap-4`}>
        <Icon size={24} className={style.icon} />
        <p className={`${style.text} flex-1 font-medium`}>{message}</p>

        {type === 'hard' && (
          <button
            onClick={handleAcknowledge}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Return to Focus
          </button>
        )}

        {type === 'soft' && (
          <button
            onClick={handleAcknowledge}
            className={`${style.icon} hover:opacity-70 transition-opacity`}
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
