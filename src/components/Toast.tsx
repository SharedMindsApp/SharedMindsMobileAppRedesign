/**
 * Phase 5A: Simple Toast Notification
 * 
 * Non-blocking notification for errors and confirmations.
 * Replaces browser-native alerts and confirms.
 */

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getStyles = () => {
    switch (toast.type) {
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle size={16} />;
      case 'success':
        return <CheckCircle2 size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border rounded-lg shadow-lg px-4 py-3
        flex items-center gap-2
        text-sm font-medium
        animate-in slide-in-from-top duration-300
        min-w-[280px] max-w-md
      `}
    >
      {getIcon()}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Toast context for global access
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toastIdCounter = 0;
let currentToasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...currentToasts]));
}

export function showToast(type: ToastType, message: string, duration?: number) {
  const id = `toast-${toastIdCounter++}`;
  const toast: Toast = { id, type, message, duration };
  currentToasts.push(toast);
  notifyListeners();

  // Auto-remove after duration
  const autoDuration = duration ?? (type === 'error' ? 5000 : 3000);
  setTimeout(() => {
    dismissToast(id);
  }, autoDuration);
}

export function dismissToast(id: string) {
  currentToasts = currentToasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    setToasts([...currentToasts]);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, dismissToast };
}



