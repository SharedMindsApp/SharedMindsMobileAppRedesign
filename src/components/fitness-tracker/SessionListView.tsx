/**
 * Session List View
 * 
 * Displays a list of recent movement sessions.
 */

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Activity, Loader2 } from 'lucide-react';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import type { UserMovementProfile, MovementSession } from '../../lib/fitnessTracker/types';

type SessionListViewProps = {
  profile: UserMovementProfile;
  selectedCategory?: string | null;
};

export function SessionListView({ profile, selectedCategory }: SessionListViewProps) {
  const [sessions, setSessions] = useState<MovementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerDomain, setItemsPerDomain] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [containerHeight, setContainerHeight] = useState(520);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optimisticSessionsRef = useRef<Map<string, MovementSession>>(new Map());

  const sessionService = new MovementSessionService();

  useEffect(() => {
    loadSessions();
    
    // Listen for new session events (optimistic updates)
    const handleSessionCreated = (event: CustomEvent) => {
      const detail = event.detail || {};
      if (detail.optimistic) {
        // Optimistic update: add immediately
        if (detail.session) {
          setSessions(prev => {
            const filtered = prev.filter(s => !optimisticSessionsRef.current.has(s.id || ''));
            optimisticSessionsRef.current.set(detail.session.id || '', detail.session);
            return [detail.session, ...filtered].slice(0, itemsPerDomain * 2);
          });
        }
      } else if (detail.session) {
        // Final update: replace optimistic with real
        setSessions(prev => {
          const filtered = prev.filter(s => s.id !== detail.session.id && !optimisticSessionsRef.current.has(s.id || ''));
          optimisticSessionsRef.current.delete(detail.session.id || '');
          return [detail.session, ...filtered].slice(0, itemsPerDomain * 2);
        });
      } else {
        // Fallback: reload
        loadSessions();
      }
    };
    
    const handleSessionCreatedError = (event: CustomEvent) => {
      // Rollback optimistic update
      if (event.detail?.optimisticSession) {
        setSessions(prev => prev.filter(s => s.id !== event.detail.optimisticSession.id));
      }
      loadSessions();
    };
    
    window.addEventListener('fitness-session-created', handleSessionCreated as EventListener);
    window.addEventListener('fitness-session-created-error', handleSessionCreatedError as EventListener);
    
    const handleProfileReconfigured = () => {
      loadSessions();
    };
    
    window.addEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
    
    return () => {
      window.removeEventListener('fitness-session-created', handleSessionCreated as EventListener);
      window.removeEventListener('fitness-session-created-error', handleSessionCreatedError as EventListener);
      window.removeEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
    };
  }, [profile, itemsPerDomain, selectedCategory]);

  useEffect(() => {
    const updateHeight = () => {
      const height = containerRef.current?.clientHeight;
      if (height) {
        setContainerHeight(height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [sessions.length]);

  const loadSessions = async () => {
    if (!profile.userId || !profile.primaryDomains?.length) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load sessions from all domains
      const allSessions: MovementSession[] = [];
      let foundMore = false;
      
      for (const domain of profile.primaryDomains) {
        try {
          const domainSessions = await sessionService.listSessions(profile.userId, domain, {
            limit: itemsPerDomain,
          });
          allSessions.push(...domainSessions);
          if (domainSessions.length >= itemsPerDomain) {
            foundMore = true;
          }
        } catch (err) {
          console.error(`Failed to load sessions for domain ${domain}:`, err);
        }
      }

      // Filter by selected category if specified
      let filteredSessions = allSessions;
      if (selectedCategory && selectedCategory !== 'all') {
        const category = profile.trackerStructure?.categories.find(c => c.id === selectedCategory);
        if (category) {
          filteredSessions = allSessions.filter(s => s.domain === category.domain);
        }
      }

      // Sort by timestamp (newest first)
      filteredSessions.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      // Limit to 20 most recent
      setSessions(filteredSessions.slice(0, itemsPerDomain * 2));
      setHasMore(foundMore || filteredSessions.length > itemsPerDomain * 2);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No sessions logged yet</p>
        <p className="text-xs mt-1">Use Quick Log to record your first session</p>
      </div>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const itemHeight = 150;
  const overscan = 4;
  const totalHeight = sessions.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(sessions.length, startIndex + visibleCount);
  const visibleSessions = sessions.slice(startIndex, endIndex);
  const topSpacer = startIndex * itemHeight;
  const bottomSpacer = Math.max(
    0,
    totalHeight - (startIndex + visibleSessions.length) * itemHeight
  );

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="max-h-[520px] overflow-auto pr-2 custom-scrollbar"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
        }}
      >
        <div style={{ height: topSpacer }} />
        {visibleSessions.map((session, idx) => (
          <div
            key={session.id}
            className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-4 hover:bg-white/80 hover:shadow-lg hover:border-gray-300 transition-all duration-300 mb-3 group"
            style={{
              animationDelay: `${idx * 30}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-blue-100/80 group-hover:bg-blue-100 transition-colors">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{session.activity}</h3>
                  {session.sessionType && (
                    <span className="text-xs text-gray-500 flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">
                      {session.sessionType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap ml-7">
                  <span className="font-medium">{formatDate(session.timestamp)}</span>
                  <span className="text-gray-400">•</span>
                  <span>{formatTime(session.timestamp)}</span>
                  {session.durationMinutes && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="font-semibold">{session.durationMinutes}m</span>
                    </>
                  )}
                  {session.perceivedIntensity && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-bold">Intensity: {session.perceivedIntensity}/5</span>
                    </>
                  )}
                </div>
                {session.bodyState && (
                  <div className="mt-2 ml-7 text-xs">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700 font-medium capitalize">
                      {session.bodyState}
                    </span>
                  </div>
                )}
                {session.notes && (
                  <p className="text-xs text-gray-600 mt-2 ml-7 line-clamp-2 italic">{session.notes}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: bottomSpacer }} />
      </div>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setItemsPerDomain(prev => prev + 10)}
            className="px-6 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
