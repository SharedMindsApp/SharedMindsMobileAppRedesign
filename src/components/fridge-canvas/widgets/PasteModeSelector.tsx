/**
 * Paste Mode Selector Component
 * 
 * Non-modal selector that appears after paste to let users choose
 * how to handle the pasted content.
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, FileText, AlignLeft, RotateCcw } from 'lucide-react';

export type PasteMode = 'structured' | 'formatted' | 'plain';

interface PasteModeSelectorProps {
  onSelect: (mode: PasteMode) => void;
  onRevert: () => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function PasteModeSelector({
  onSelect,
  onRevert,
  position,
  onClose,
}: PasteModeSelectorProps) {
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={selectorRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 animate-fade-in"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            onSelect('structured');
            onClose();
          }}
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
          title="Structured - Auto-organize into sections"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Structured</span>
        </button>
        <button
          onClick={() => {
            onSelect('formatted');
            onClose();
          }}
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
          title="Preserve formatting"
        >
          <AlignLeft size={14} />
          <span className="hidden sm:inline">Formatted</span>
        </button>
        <button
          onClick={() => {
            onSelect('plain');
            onClose();
          }}
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
          title="Plain text"
        >
          <FileText size={14} />
          <span className="hidden sm:inline">Plain</span>
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={() => {
            onRevert();
            onClose();
          }}
          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2"
          title="Revert paste"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">Undo</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Get user's preferred paste mode from localStorage
 */
export function getPreferredPasteMode(): PasteMode {
  if (typeof window === 'undefined') return 'structured';
  const saved = localStorage.getItem('workspace-paste-mode');
  return (saved as PasteMode) || 'structured';
}

/**
 * Save user's preferred paste mode to localStorage
 */
export function savePreferredPasteMode(mode: PasteMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('workspace-paste-mode', mode);
}
