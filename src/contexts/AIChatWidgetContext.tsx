import { createContext, useContext, useState, ReactNode } from 'react';
import type { WidgetState } from '../lib/aiChatWidgetTypes';

interface AIChatWidgetContextType {
  widgetState: WidgetState;
  setWidgetState: (state: WidgetState) => void;
  isDocked: boolean;
}

const AIChatWidgetContext = createContext<AIChatWidgetContextType | undefined>(undefined);

export function AIChatWidgetProvider({ children }: { children: ReactNode }) {
  const [widgetState, setWidgetState] = useState<WidgetState>('hidden');

  return (
    <AIChatWidgetContext.Provider
      value={{
        widgetState,
        setWidgetState,
        isDocked: widgetState === 'docked',
      }}
    >
      {children}
    </AIChatWidgetContext.Provider>
  );
}

export function useAIChatWidget() {
  const context = useContext(AIChatWidgetContext);
  if (!context) {
    throw new Error('useAIChatWidget must be used within AIChatWidgetProvider');
  }
  return context;
}
