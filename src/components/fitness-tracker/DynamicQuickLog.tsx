/**
 * Dynamic Quick Log Component
 * 
 * Renders quick log buttons based on UI configuration.
 * Allows users to quickly log movement sessions.
 */

import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import { getQuickLogEmoji } from '../../lib/fitnessTracker/quickLogEmojis';
import type { QuickLogButton, UserMovementProfile, MovementDomain } from '../../lib/fitnessTracker/types';
import { QuickLogModal } from './QuickLogModal';
import { QuickLogBottomSheet } from './QuickLogBottomSheet';
import { showToast } from '../Toast';

type DynamicQuickLogProps = {
  buttons: QuickLogButton[];
  profile: UserMovementProfile;
};

export function DynamicQuickLog({ buttons, profile }: DynamicQuickLogProps) {
  const [selectedButton, setSelectedButton] = useState<QuickLogButton | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sessionService = new MovementSessionService();

  // Handle button click - always opens bottom sheet with form
  const handleButtonClick = (button: QuickLogButton) => {
    setSelectedButton(button);
    setShowBottomSheet(true);
  };

  const handleSubmit = async (sessionData: {
    domain: MovementDomain;
    activity: string;
    sessionType?: string;
    [key: string]: any;
  }) => {
    if (!profile.userId) {
      showToast('User not authenticated', 'error');
      return;
    }

    // Optimistic UI update: dispatch event immediately
    const optimisticSession = {
      id: `temp-${Date.now()}`,
      userId: profile.userId,
      domain: sessionData.domain,
      activity: sessionData.activity || selectedButton?.label || 'Movement',
      sessionType: sessionData.sessionType || selectedButton?.subcategory,
      timestamp: new Date().toISOString(),
      ...sessionData,
    };

    // Close bottom sheet immediately (optimistic)
    setShowBottomSheet(false);
    setSelectedButton(null);
    
    // Dispatch event for immediate UI update
    window.dispatchEvent(new CustomEvent('fitness-session-created', { detail: { optimistic: true } }));

    try {
      setSubmitting(true);

      // Create session (will update with real ID)
      // timestamp is already included in sessionData from QuickLogBottomSheet
      const createdSession = await sessionService.createSession(profile.userId, {
        domain: sessionData.domain,
        activity: sessionData.activity || selectedButton?.label || 'Movement',
        sessionType: sessionData.sessionType || selectedButton?.subcategory,
        ...sessionData, // timestamp and other fields are already included
      });

      // Dispatch final update with real session
      window.dispatchEvent(new CustomEvent('fitness-session-created', { detail: { session: createdSession, optimistic: false } }));
      showToast('Session logged successfully!', 'success');
    } catch (error) {
      console.error('Failed to create session:', error);
      // Dispatch error event to rollback optimistic update
      window.dispatchEvent(new CustomEvent('fitness-session-created-error', { detail: { optimisticSession } }));
      showToast(
        error instanceof Error ? error.message : 'Failed to log session',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (buttons.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No quick log options available</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {buttons.map(button => {
          const emoji = getQuickLogEmoji(button.label);
          const buttonColor = button.color || '#3B82F6';

          return (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              className="p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm active:scale-95 group bg-white"
              style={{
                borderColor: selectedButton?.id === button.id ? buttonColor : undefined,
                backgroundColor: selectedButton?.id === button.id ? `${buttonColor}10` : undefined,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className="text-2xl mb-0.5 transition-transform flex-shrink-0"
                  role="img"
                  aria-label={button.label}
                >
                  {emoji}
                </div>
                <div className="text-xs font-medium text-gray-900 text-center leading-tight line-clamp-2">
                  {button.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showBottomSheet && selectedButton && (
        <QuickLogBottomSheet
          button={selectedButton}
          profile={profile}
          onClose={() => {
            setShowBottomSheet(false);
            setSelectedButton(null);
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </>
  );
}

