/**
 * Habit Keyboard Shortcuts Component
 * 
 * Displays keyboard shortcuts overlay and handles keyboard navigation.
 * Phase 1: Quick Wins implementation.
 */

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface HabitKeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HabitKeyboardShortcuts({ isOpen, onClose }: HabitKeyboardShortcutsProps) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', description: 'Mark focused habit as done' },
    { key: 'S', description: 'Open schedule sheet for focused habit' },
    { key: 'E', description: 'Edit focused habit' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close any open sheet/modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{shortcut.description}</span>
              <kbd className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-mono font-medium text-gray-700 border border-gray-200">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
