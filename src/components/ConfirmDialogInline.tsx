/**
 * Phase 5A: Inline Confirmation Dialog
 * 
 * Replaces browser-native confirm() with inline UI.
 * Phase 1: Mobile uses Bottom Sheet, desktop uses centered modal.
 */

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { BottomSheet } from './shared/BottomSheet';

interface ConfirmDialogInlineProps {
  isOpen: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialogInline({
  isOpen,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogInlineProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const getStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-900',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: 'bg-red-100',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
          iconBg: 'bg-amber-100',
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconBg: 'bg-blue-100',
        };
    }
  };

  const styles = getStyles();

  // Mobile: Bottom Sheet (Peek sheet 30vh per audit)
  if (isMobile) {
    const header = (
      <div className="flex items-center gap-3">
        <div className={`${styles.iconBg} p-2 rounded-full`}>
          <AlertTriangle size={20} className={styles.text} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Confirm Delete</h2>
      </div>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-gray-700 font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[44px]"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 ${styles.button} px-4 py-3 font-medium rounded-lg transition-all active:scale-[0.98] min-h-[44px]`}
        >
          {confirmText}
        </button>
      </div>
    );

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onCancel}
        header={header}
        footer={footer}
        maxHeight="30vh"
        closeOnBackdrop={true}
      >
        <div className={`px-4 py-2 ${styles.text}`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered modal (unchanged)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${styles.bg} border rounded-lg shadow-xl max-w-md w-full p-6 ${styles.text}`}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
          <p className="flex-1 font-medium">{message}</p>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.button} px-4 py-2 font-medium rounded-lg transition-colors min-h-[44px]`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


