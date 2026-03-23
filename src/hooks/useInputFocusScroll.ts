// Phase 2A: Mobile Safety - Input focus scroll handler
// Ensures inputs scroll into view when focused on mobile to prevent keyboard covering

import { useEffect, useRef } from 'react';

export function useInputFocusScroll() {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.type !== 'hidden'
      ) {
        // Small delay to allow keyboard animation on mobile
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return inputRef;
}



