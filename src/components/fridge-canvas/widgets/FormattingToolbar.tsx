/**
 * Formatting Toolbar Component
 * 
 * Floating toolbar that appears when text is selected, providing
 * inline formatting options (bold, italic, underline, code, etc.)
 * Enhanced with Copy, Cut, Paste, Select All for mobile-first editing
 */

import { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Code, Strikethrough, Type, X, Copy, Scissors, Clipboard, AlignLeft } from 'lucide-react';

interface FormattingToolbarProps {
  selection: {
    text: string;
    start: number;
    end: number;
  } | null;
  onFormat: (format: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough' | 'clear') => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onClose: () => void;
  isMobile?: boolean;
}

export function FormattingToolbar({ 
  selection, 
  onFormat, 
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onClose,
  isMobile = false
}: FormattingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection) return;

    const updatePosition = () => {
      // For textarea-based selection, use the textarea element's position
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        const textarea = activeElement as HTMLTextAreaElement;
        const rect = textarea.getBoundingClientRect();
        
        if (toolbarRef.current) {
          const toolbarHeight = toolbarRef.current.offsetHeight;
          const toolbarWidth = toolbarRef.current.offsetWidth;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate selection position within textarea
          const textareaStyle = window.getComputedStyle(textarea);
          const lineHeight = parseInt(textareaStyle.lineHeight) || 20;
          const paddingTop = parseInt(textareaStyle.paddingTop) || 0;
          const paddingLeft = parseInt(textareaStyle.paddingLeft) || 0;
          
          // Estimate selection position (approximate)
          const textBeforeSelection = textarea.value.substring(0, selection.start);
          const linesBefore = textBeforeSelection.split('\n').length - 1;
          const currentLineChars = textBeforeSelection.split('\n').pop()?.length || 0;
          
          // Approximate position
          let top = rect.top + paddingTop + (linesBefore * lineHeight);
          let left = rect.left + paddingLeft + (currentLineChars * 8); // Approximate char width
          
          // Position above selection, but ensure it's visible
          top = Math.max(8, top - toolbarHeight - 8);
          if (top + toolbarHeight > viewportHeight - 8) {
            // Position below if above would be off-screen
            top = Math.min(viewportHeight - toolbarHeight - 8, rect.bottom + 8);
          }
          
          // Center horizontally, but keep within viewport
          left = Math.max(8, Math.min(left - (toolbarWidth / 2), viewportWidth - toolbarWidth - 8));
          
          setPosition({ top, left });
        }
      } else {
        // Fallback: use window selection
        const selectionObj = window.getSelection();
        if (selectionObj && selectionObj.rangeCount > 0) {
          const range = selectionObj.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          if (toolbarRef.current) {
            const toolbarHeight = toolbarRef.current.offsetHeight;
            const toolbarWidth = toolbarRef.current.offsetWidth;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let top = rect.top - toolbarHeight - 8;
            let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
            
            // Ensure toolbar is visible
            if (top < 8) {
              top = rect.bottom + 8;
            }
            if (top + toolbarHeight > viewportHeight - 8) {
              top = viewportHeight - toolbarHeight - 8;
            }
            left = Math.max(8, Math.min(left, viewportWidth - toolbarWidth - 8));
            
            setPosition({ top, left });
          }
        }
      }
    };

    updatePosition();
    const scrollHandler = () => updatePosition();
    const resizeHandler = () => updatePosition();
    
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', resizeHandler);
    
    // Update position on selection change
    const interval = setInterval(updatePosition, 100);

    return () => {
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', resizeHandler);
      clearInterval(interval);
    };
  }, [selection, onClose]);

  // Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Don't close if clicking on the textarea (selection might still be active)
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
          onClose();
        }
      }
    };

    if (selection) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selection, onClose]);

  if (!selection) return null;

  const actionButtons = [
    ...(onCopy ? [{ action: 'copy' as const, icon: Copy, label: 'Copy', handler: onCopy }] : []),
    ...(onCut ? [{ action: 'cut' as const, icon: Scissors, label: 'Cut', handler: onCut }] : []),
    ...(onPaste ? [{ action: 'paste' as const, icon: Clipboard, label: 'Paste', handler: onPaste }] : []),
    ...(onSelectAll ? [{ action: 'selectAll' as const, icon: AlignLeft, label: 'Select All', handler: onSelectAll }] : []),
  ];

  const formatButtons = [
    { format: 'bold' as const, icon: Bold, label: 'Bold' },
    { format: 'italic' as const, icon: Italic, label: 'Italic' },
    { format: 'underline' as const, icon: Underline, label: 'Underline' },
    { format: 'code' as const, icon: Code, label: 'Code' },
    { format: 'strikethrough' as const, icon: Strikethrough, label: 'Strikethrough' },
  ];

  const buttonSize = isMobile ? 'p-3' : 'p-2';
  const iconSize = isMobile ? 20 : 16;

  return (
    <div
      ref={toolbarRef}
      className={`fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-xl ${isMobile ? 'p-2' : 'p-1'} flex items-center gap-1 flex-wrap max-w-[90vw]`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Action buttons (Copy, Cut, Paste, Select All) */}
      {actionButtons.length > 0 && (
        <>
          {actionButtons.map(({ action, icon: Icon, label, handler }) => (
            <button
              key={action}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handler();
              }}
              className={`${buttonSize} hover:bg-gray-100 active:bg-gray-200 rounded transition-colors touch-manipulation`}
              title={label}
              aria-label={label}
              style={{ minWidth: isMobile ? '44px' : 'auto', minHeight: isMobile ? '44px' : 'auto' }}
            >
              <Icon size={iconSize} className="text-gray-700" />
            </button>
          ))}
          {formatButtons.length > 0 && <div className="w-px h-6 bg-gray-200 mx-1" />}
        </>
      )}
      
      {/* Formatting buttons */}
      {formatButtons.map(({ format, icon: Icon, label }) => (
        <button
          key={format}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFormat(format);
          }}
          className={`${buttonSize} hover:bg-gray-100 active:bg-gray-200 rounded transition-colors touch-manipulation`}
          title={label}
          aria-label={label}
          style={{ minWidth: isMobile ? '44px' : 'auto', minHeight: isMobile ? '44px' : 'auto' }}
        >
          <Icon size={iconSize} className="text-gray-700" />
        </button>
      ))}
      
      {/* Clear formatting */}
      <div className="w-px h-6 bg-gray-200 mx-1" />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFormat('clear');
        }}
        className={`${buttonSize} hover:bg-gray-100 active:bg-gray-200 rounded transition-colors touch-manipulation`}
        title="Clear formatting"
        aria-label="Clear formatting"
        style={{ minWidth: isMobile ? '44px' : 'auto', minHeight: isMobile ? '44px' : 'auto' }}
      >
        <X size={iconSize} className="text-gray-700" />
      </button>
    </div>
  );
}
