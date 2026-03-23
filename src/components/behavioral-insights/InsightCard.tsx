/**
 * Insight Card - Display Individual Behavioral Signal
 *
 * Shows one insight with:
 * - Neutral title and description
 * - Confidence score
 * - "How was this computed?" expandable
 * - "What this is NOT" expandable
 * - "Not helpful" feedback button
 * - Provenance information
 *
 * NO judgmental language, NO recommendations, NO pressure
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
  Info,
  AlertCircle,
  Calendar,
  Hash,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ReflectionPanel } from './ReflectionPanel';
import type { DisplayableInsight } from '../../lib/behavioral-sandbox/stage2-types';
import {
  submitFeedback,
  logDisplay,
} from '../../lib/behavioral-sandbox/stage2-service';
import {
  getReflections,
  type ReflectionEntry,
} from '../../lib/behavioral-sandbox';

interface InsightCardProps {
  insight: DisplayableInsight;
  onDismiss?: () => void;
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const { user } = useAuth();
  const [showHowComputed, setShowHowComputed] = useState(false);
  const [showWhatNotSaid, setShowWhatNotSaid] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loadingReflections, setLoadingReflections] = useState(false);

  useEffect(() => {
    if (!user) return;

    logDisplay(user.id, {
      signalId: insight.signal_id,
      signalKey: insight.signal_key,
      displayContext: 'dashboard',
    });

    loadReflections();
  }, [user, insight.signal_id]);

  const loadReflections = async () => {
    if (!user) return;

    setLoadingReflections(true);
    try {
      const data = await getReflections(user.id, {
        linkedSignalId: insight.signal_id,
      });
      setReflections(data);
    } catch (error) {
      console.error('Failed to load reflections:', error);
    } finally {
      setLoadingReflections(false);
    }
  };

  const handleFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (!user || submittingFeedback || feedbackSubmitted) return;

    setSubmittingFeedback(true);
    try {
      await submitFeedback(user.id, {
        signalId: insight.signal_id,
        signalKey: insight.signal_key,
        feedbackType: type,
        displayedAt: new Date().toISOString(),
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderValue = () => {
    switch (insight.signal_key) {
      case 'session_boundaries':
        const sessions = insight.value_json.sessions || [];
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} observed
            </p>
            {sessions.length > 0 && (
              <div className="space-y-1">
                {sessions.slice(0, 3).map((session: any, i: number) => (
                  <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {formatDate(session.start)} - {formatDate(session.end)}
                    {session.source && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({session.source === 'explicit' ? 'marked' : 'inferred'})
                      </span>
                    )}
                  </div>
                ))}
                {sessions.length > 3 && (
                  <p className="text-xs text-gray-500">
                    ...and {sessions.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'time_bins_activity_count':
        const bins = insight.value_json.bins || [];
        const totalCount = insight.value_json.total_count || 0;
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {totalCount} event{totalCount !== 1 ? 's' : ''} recorded across time windows
            </p>
            {bins.length > 0 && (
              <div className="grid grid-cols-4 gap-1">
                {bins.map((bin: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs text-center p-1 bg-gray-100 rounded"
                    title={`${bin.count} events`}
                  >
                    <div className="font-medium text-gray-700">
                      {bin.bin_start_hour}:00
                    </div>
                    <div className="text-gray-600">{bin.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'activity_intervals':
        const intervals = insight.value_json.intervals || [];
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {intervals.length} activit{intervals.length !== 1 ? 'ies' : 'y'} with
              recorded duration
            </p>
            {intervals.length > 0 && (
              <div className="space-y-1">
                {intervals.slice(0, 3).map((interval: any, i: number) => (
                  <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {interval.activity_type}:{' '}
                    {Math.round(interval.duration_seconds / 60)} minutes
                  </div>
                ))}
                {intervals.length > 3 && (
                  <p className="text-xs text-gray-500">
                    ...and {intervals.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'capture_coverage':
        const coverage = insight.value_json;
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Events recorded on {coverage.days_with_any_events} of{' '}
              {coverage.days_in_range} days
            </p>
            <div className="text-xs text-gray-500">
              {coverage.first_event_date && (
                <p>First: {formatDate(coverage.first_event_date)}</p>
              )}
              {coverage.last_event_date && (
                <p>Last: {formatDate(coverage.last_event_date)}</p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(insight.value_json, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {insight.display_metadata.signal_title}
          </h3>
          <p className="text-sm text-gray-600">
            {insight.display_metadata.signal_description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="px-2 py-1 bg-blue-100 text-blue-900 text-xs font-medium rounded">
            Confidence: {Math.round(insight.confidence * 100)}%
          </div>
          <div className="text-xs text-gray-500">
            v{insight.signal_version}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">{renderValue()}</div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Calendar className="w-3 h-3" />
        <span>
          {formatDate(insight.time_range_start)} to{' '}
          {formatDate(insight.time_range_end)}
        </span>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowHowComputed(!showHowComputed)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showHowComputed ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          How was this computed?
        </button>

        {showHowComputed && (
          <div className="pl-6 text-sm text-gray-700 space-y-2">
            <p>{insight.display_metadata.how_computed}</p>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Hash className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                Based on {insight.provenance_event_ids.length} event
                {insight.provenance_event_ids.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowWhatNotSaid(!showWhatNotSaid)}
          className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-800 font-medium"
        >
          {showWhatNotSaid ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          What this does NOT say
        </button>

        {showWhatNotSaid && (
          <div className="pl-6 text-sm text-gray-700">
            <p>{insight.display_metadata.what_it_is_not}</p>
          </div>
        )}

        <button
          onClick={() => setShowProvenance(!showProvenance)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          {showProvenance ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Technical details
        </button>

        {showProvenance && (
          <div className="pl-6 text-xs text-gray-600 space-y-1 font-mono">
            <p>Signal ID: {insight.signal_id}</p>
            <p>Provenance Hash: {insight.provenance_hash.substring(0, 16)}...</p>
            <p>Computed: {formatDate(insight.computed_at)}</p>
            <p>Source Events: {insight.provenance_event_ids.length}</p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-xs text-gray-500">Was this helpful?</div>

        {feedbackSubmitted ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Thank you for the feedback
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleFeedback('helpful')}
              disabled={submittingFeedback}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="w-3 h-3" />
              Yes
            </button>
            <button
              onClick={() => handleFeedback('not_helpful')}
              disabled={submittingFeedback}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              <ThumbsDown className="w-3 h-3" />
              Not helpful
            </button>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-200 space-y-2">
        <button
          onClick={() => setShowReflection(!showReflection)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          <FileText className="w-4 h-4" />
          {showReflection ? 'Hide reflection' : 'Add reflection (optional)'}
          {reflections.length > 0 && !showReflection && (
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
              {reflections.length}
            </span>
          )}
        </button>

        {showReflection && (
          <div className="pl-6">
            <ReflectionPanel
              linkedSignalId={insight.signal_id}
              onSaved={() => {
                loadReflections();
                setShowReflection(false);
              }}
              onCancel={() => setShowReflection(false)}
            />
          </div>
        )}

        {reflections.length > 0 && !showReflection && (
          <div className="pl-6 space-y-2">
            {reflections.map((reflection) => (
              <div
                key={reflection.id}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {reflection.content}
                </p>
                {reflection.user_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reflection.user_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(reflection.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
