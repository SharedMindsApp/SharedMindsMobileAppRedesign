import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'signal' | 'preset' | 'response';
  label: string;
  details?: string;
}

export function RegulationContextTimeline() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '14days'>('7days');
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (user) {
      loadTimelineData();
    }
  }, [user, timeframe]);

  async function loadTimelineData() {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      if (timeframe === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (timeframe === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      }

      const startDateStr = startDate.toISOString();

      const timelineEvents: TimelineEvent[] = [];

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatSignalType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Regulation Context</h3>
        </div>
        <div className="text-sm text-gray-500">Loading regulation timeline...</div>
      </div>
    );
  }

  const signalCount = events.filter(e => e.type === 'signal').length;
  const presetCount = events.filter(e => e.type === 'preset').length;
  const responseCount = events.filter(e => e.type === 'response').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Regulation Context</h3>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTimeframe('today')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            timeframe === 'today'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimeframe('7days')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            timeframe === '7days'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setTimeframe('14days')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            timeframe === '14days'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          14 Days
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{signalCount}</div>
              <div className="text-sm text-gray-600">Signals Detected</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{presetCount}</div>
              <div className="text-sm text-gray-600">Preset Changes</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{responseCount}</div>
              <div className="text-sm text-gray-600">Manual Responses</div>
            </div>
          </div>

          {events.length > 0 ? (
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-medium text-gray-900">Timeline</h4>
              <div className="space-y-2">
                {events.slice(0, 10).map(event => {
                  const eventDate = new Date(event.timestamp);
                  const isToday = new Date().toDateString() === eventDate.toDateString();

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                          event.type === 'signal'
                            ? 'bg-yellow-500'
                            : event.type === 'preset'
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{event.label}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {isToday ? 'Today' : eventDate.toLocaleDateString()} at{' '}
                          {eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        {event.details && (
                          <div className="text-xs text-gray-500 mt-1">{event.details}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {events.length > 10 && (
                <div className="text-sm text-gray-500 text-center mt-2">
                  Showing 10 of {events.length} events
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No regulation events in this timeframe</p>
              <p className="text-xs text-gray-400 mt-1">
                Timeline will populate as you use regulation features
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          This timeline shows regulation-related events in chronological order. It's a neutral record
          that helps you see patterns without judgment. The timeline is optional and informational only.
        </p>
      </div>
    </div>
  );
}
