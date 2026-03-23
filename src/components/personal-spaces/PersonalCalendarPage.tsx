import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Edit2, Trash2, Link as LinkIcon, ArrowLeft, Loader2, MapPin, Check, X, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PersonalEventModal } from './PersonalEventModal';
import { EventDetailModal } from '../calendar/EventDetailModal';
import {
  getPersonalCalendarEvents,
  deletePersonalCalendarEvent,
  getPendingProjections,
  acceptProjection,
  declineProjection,
  type PersonalCalendarEvent,
  type PendingProjection,
} from '../../lib/personalSpaces/calendarService';

export function PersonalCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<PersonalCalendarEvent[]>([]);
  const [pendingProjections, setPendingProjections] = useState<PendingProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalCalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<PersonalCalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [processingProjectionId, setProcessingProjectionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEvents();
      loadPendingProjections();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getPersonalCalendarEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.error('[PersonalCalendarPage] Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingProjections = async () => {
    if (!user) return;

    try {
      const data = await getPendingProjections(user.id);
      setPendingProjections(data);
    } catch (error) {
      // Gracefully handle if context tables don't exist yet
      console.warn('[PersonalCalendarPage] Pending projections not available (feature may not be enabled):', error);
      setPendingProjections([]);
    }
  };

  const handleCreateEvent = (date?: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEditEvent = (event: PersonalCalendarEvent) => {
    // Prevent editing read-only (projected) events
    if (event.isReadOnly) {
      alert('This event is from a context (trip, project, etc.) and cannot be edited here.');
      return;
    }
    
    setEditingEvent(event);
    setSelectedDate(undefined);
    setShowModal(true);
  };

  const handleViewEvent = (event: PersonalCalendarEvent) => {
    setSelectedEventForDetail(event);
  };

  const handleDeleteEvent = async (eventId: string, event: PersonalCalendarEvent) => {
    if (!user) return;
    
    // Prevent deleting read-only (projected) events
    if (event.isReadOnly) {
      alert('This event is from a context (trip, project, etc.) and cannot be deleted here.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      setDeletingEventId(eventId);
      await deletePersonalCalendarEvent(user.id, eventId);
      await loadEvents();
    } catch (error) {
      console.error('[PersonalCalendarPage] Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleAcceptProjection = async (projectionId: string) => {
    if (!user) return;

    try {
      setProcessingProjectionId(projectionId);
      await acceptProjection(projectionId);
      await loadEvents();
      await loadPendingProjections();
    } catch (error) {
      console.error('[PersonalCalendarPage] Error accepting projection:', error);
      alert('Failed to accept event. Please try again.');
    } finally {
      setProcessingProjectionId(null);
    }
  };

  const handleDeclineProjection = async (projectionId: string) => {
    if (!user) return;

    try {
      setProcessingProjectionId(projectionId);
      await declineProjection(projectionId);
      await loadPendingProjections();
    } catch (error) {
      console.error('[PersonalCalendarPage] Error declining projection:', error);
      alert('Failed to decline event. Please try again.');
    } finally {
      setProcessingProjectionId(null);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingEvent(null);
    setSelectedDate(undefined);
  };

  const handleModalSaved = () => {
    setShowModal(false);
    setEditingEvent(null);
    setSelectedDate(undefined);
    loadEvents();
  };

  const getEventBadge = (event: PersonalCalendarEvent) => {
    if (event.sourceType === 'context') {
      // Context-sourced events (from trips, projects, etc.)
      const contextIcon = event.contextType === 'trip' ? MapPin : LinkIcon;
      const ContextIcon = contextIcon;
      
      return (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded flex items-center gap-1">
            <ContextIcon className="w-3 h-3" />
            {event.contextName || 'Context Event'}
          </span>
          {event.isReadOnly && (
            <span className="text-xs text-gray-500 italic">Read-only</span>
          )}
        </div>
      );
    }
    
    if (event.sourceType === 'guardrails') {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          Linked to Guardrails
        </span>
      );
    }
    
    return (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
        Personal
      </span>
    );
  };

  const formatEventDate = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);

    if (event.allDay) {
      if (event.endAt) {
        const end = new Date(event.endAt);
        if (start.toDateString() === end.toDateString()) {
          return start.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        }
        return `${start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      }
      return start.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (event.endAt) {
      const end = new Date(event.endAt);
      return `${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} ${start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })} - ${end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }

    return `${start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })} at ${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const upcomingEvents = events
    .filter((event) => new Date(event.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 10);

  const pastEvents = events
    .filter((event) => new Date(event.startAt) < new Date())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 10);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Please log in to view your calendar.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Personal Calendar</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Your unified time authority for all events
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCreateEvent()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Event
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Pending Projections */}
            {pendingProjections.length > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">
                    Pending Calendar Invitations ({pendingProjections.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {pendingProjections.map((projection) => (
                    <div
                      key={projection.id}
                      className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{projection.eventTitle}</h4>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            {projection.contextName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {new Date(projection.eventStartAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {projection.eventStartAt && (
                            <> at {new Date(projection.eventStartAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptProjection(projection.id)}
                          disabled={processingProjectionId === projection.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {processingProjectionId === projection.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineProjection(projection.id)}
                          disabled={processingProjectionId === projection.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          {processingProjectionId === projection.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Decline
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No upcoming events</p>
                  <button
                    onClick={() => handleCreateEvent()}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first event
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 border rounded-lg hover:border-gray-300 transition-colors ${
                        event.isReadOnly ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditEvent(event)}
                            disabled={event.isReadOnly}
                            className={`p-1 transition-colors ${
                              event.isReadOnly
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                            title={event.isReadOnly ? 'Read-only event' : 'Edit event'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id, event)}
                            disabled={deletingEventId === event.id || event.isReadOnly}
                            className={`p-1 transition-colors disabled:opacity-50 ${
                              event.isReadOnly
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                            title={event.isReadOnly ? 'Read-only event' : 'Delete event'}
                          >
                            {deletingEventId === event.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{formatEventDate(event)}</p>
                        {getEventBadge(event)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Events</h2>
              {pastEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No past events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 border rounded-lg hover:border-gray-300 transition-colors opacity-75 ${
                        event.isReadOnly ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewEvent(event)}
                            className="p-1 transition-colors text-gray-400 hover:text-blue-600"
                            title="View event details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id, event)}
                            disabled={deletingEventId === event.id || event.isReadOnly}
                            className={`p-1 transition-colors disabled:opacity-50 ${
                              event.isReadOnly
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                            title={event.isReadOnly ? 'Read-only event' : 'Delete event'}
                          >
                            {deletingEventId === event.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{formatEventDate(event)}</p>
                        {getEventBadge(event)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {showModal && (
        <PersonalEventModal
          userId={user.id}
          event={editingEvent}
          initialDate={selectedDate}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}

      {/* Shared Event Detail Modal */}
      {selectedEventForDetail && user && (
        <EventDetailModal
          isOpen={!!selectedEventForDetail}
          onClose={() => setSelectedEventForDetail(null)}
          event={selectedEventForDetail}
          mode="personalSpaces"
          userId={user.id}
          onUpdated={() => {
            loadEvents();
            setSelectedEventForDetail(null);
          }}
          onDeleted={() => {
            loadEvents();
            setSelectedEventForDetail(null);
          }}
        />
      )}
    </div>
  );
}
