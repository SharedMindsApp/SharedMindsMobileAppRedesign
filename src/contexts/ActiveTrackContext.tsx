import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ActiveTrackContextType {
  activeTrackId: string | null;
  activeTrackPath: string[];
  activeTrackName: string;
  activeTrackColor: string | null;
  setActiveTrack: (trackId: string, trackName: string, trackPath: string[], trackColor?: string | null) => void;
  clearActiveTrack: () => void;
}

const ActiveTrackContext = createContext<ActiveTrackContextType | undefined>(undefined);

const STORAGE_KEY = 'guardrails_active_track';

interface StoredTrackData {
  trackId: string;
  trackName: string;
  trackPath: string[];
  trackColor?: string | null;
}

export function ActiveTrackProvider({ children }: { children: ReactNode }) {
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeTrackName, setActiveTrackName] = useState<string>('');
  const [activeTrackPath, setActiveTrackPath] = useState<string[]>([]);
  const [activeTrackColor, setActiveTrackColor] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredTrackData = JSON.parse(stored);
        setActiveTrackId(data.trackId);
        setActiveTrackName(data.trackName);
        setActiveTrackPath(data.trackPath);
        setActiveTrackColor(data.trackColor || null);
      } catch (error) {
        console.error('Failed to parse stored active track:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setActiveTrack = (
    trackId: string,
    trackName: string,
    trackPath: string[],
    trackColor?: string | null
  ) => {
    setActiveTrackId(trackId);
    setActiveTrackName(trackName);
    setActiveTrackPath(trackPath);
    setActiveTrackColor(trackColor || null);

    const data: StoredTrackData = {
      trackId,
      trackName,
      trackPath,
      trackColor: trackColor || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clearActiveTrack = () => {
    setActiveTrackId(null);
    setActiveTrackName('');
    setActiveTrackPath([]);
    setActiveTrackColor(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ActiveTrackContext.Provider
      value={{
        activeTrackId,
        activeTrackPath,
        activeTrackName,
        activeTrackColor,
        setActiveTrack,
        clearActiveTrack,
      }}
    >
      {children}
    </ActiveTrackContext.Provider>
  );
}

export function useActiveTrack() {
  const context = useContext(ActiveTrackContext);
  if (context === undefined) {
    throw new Error('useActiveTrack must be used within an ActiveTrackProvider');
  }
  return context;
}
