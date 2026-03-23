/**
 * CalendarQuickViewContext
 * 
 * Shared context for controlling the Calendar Quick View drawer
 * from both PlannerShell and CalendarShell without tight coupling.
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface CalendarQuickViewContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CalendarQuickViewContext = createContext<CalendarQuickViewContextType | undefined>(undefined);

export function CalendarQuickViewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);

  return (
    <CalendarQuickViewContext.Provider value={{ isOpen, openDrawer, closeDrawer }}>
      {children}
    </CalendarQuickViewContext.Provider>
  );
}

export function useCalendarQuickView() {
  const context = useContext(CalendarQuickViewContext);
  if (!context) {
    // Return a no-op implementation if context is not available
    return {
      isOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
    };
  }
  return context;
}
