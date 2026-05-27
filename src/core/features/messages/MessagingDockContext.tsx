/**
 * MessagingDockContext — global state for the floating chat dock.
 *
 * Exposes a single API consumers can call from anywhere: `openConversation(id)`
 * to pop open a chat without leaving the current page. The dock itself
 * mounts once at the Layout level and reads this state.
 *
 * Mobile devices (<640px) skip the dock and fall back to /messages routes —
 * a floating panel doesn't make sense on a phone-sized screen.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface MessagingDockContextValue {
  /** True when the conversation-list panel is expanded. */
  dockOpen: boolean;
  /** Currently-open chat popover, or null if none. */
  activeConversationId: string | null;
  /** Mobile breakpoint flag — consumers use this to decide between dock vs route. */
  isMobile: boolean;
  setDockOpen: (open: boolean) => void;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  toggleDock: () => void;
}

const MessagingDockContext = createContext<MessagingDockContextValue | null>(null);

export function MessagingDockProvider({ children }: { children: ReactNode }) {
  const [dockOpen, setDockOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  // Hide the floating dock whenever the mobile bottom-tab nav is
  // visible — otherwise the two overlap in the bottom-right corner.
  // Tab nav uses Tailwind's `lg:hidden` (< 1024px), so this threshold
  // matches. The bottom-nav already includes a Chat tab, so users at
  // these widths still have a one-tap path to messages.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setDockOpen(true);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const toggleDock = useCallback(() => {
    setDockOpen((v) => !v);
  }, []);

  return (
    <MessagingDockContext.Provider
      value={{
        dockOpen,
        activeConversationId,
        isMobile,
        setDockOpen,
        openConversation,
        closeConversation,
        toggleDock,
      }}
    >
      {children}
    </MessagingDockContext.Provider>
  );
}

export function useMessagingDock() {
  const ctx = useContext(MessagingDockContext);
  if (!ctx) throw new Error('useMessagingDock must be used inside MessagingDockProvider');
  return ctx;
}
