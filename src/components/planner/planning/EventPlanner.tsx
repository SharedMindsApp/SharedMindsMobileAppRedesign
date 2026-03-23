import { PlannerShell } from '../PlannerShell';
import { Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUpcomingEvents } from '../../../lib/planningService';
import type { PlanningEvent } from '../../../lib/planningService';
import { useAuth } from '../../../contexts/AuthContext';

export function EventPlanner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<PlanningEvent[]>([]);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    try {
      const data = await getUpcomingEvents(user.id, 30);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-rose-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Event Planner</h1>
          </div>
          <p className="text-slate-600">Forward planning for key dates</p>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No upcoming events</h3>
              <p className="text-slate-600">Events from your weekly and monthly planners appear here</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: event.color + '20', color: event.color }}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{event.title}</h3>
                    {event.date && (
                      <p className="text-sm text-slate-600">{formatDate(event.date)}</p>
                    )}
                    {event.description && (
                      <p className="text-sm text-slate-500 mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
