/**
 * Premium Activity Card Component
 * 
 * High-end, interactive activity card with micro-animations,
 * gesture support, and premium visual treatment
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, MoreVertical } from 'lucide-react';
import type { MovementDomain, UserMovementProfile, MovementSession, ActivityStateMetadata } from '../../lib/fitnessTracker/types';
import { getActivityMetadata } from '../../lib/fitnessTracker/activityMetadata';
import { getSportEmoji } from '../../lib/fitnessTracker/sportEmojis';
import { triggerHaptic } from '../../lib/fitnessTracker/motionUtils';

type PremiumActivityCardProps = {
  domain: MovementDomain;
  profile: UserMovementProfile;
  lastSession: MovementSession | null;
  stats: {
    thisWeekCount: number;
    totalDuration: number;
  };
  isPaused?: boolean;
  state?: ActivityStateMetadata;
  onPauseClick?: () => void;
  customMetadata?: {
    displayName: string;
    description: string;
    icon?: string; // Deprecated - kept for backwards compatibility
    emoji?: string;
    color: string;
    gradient?: string;
    lightGradient?: string;
  };
  activityId?: string; // Category ID for navigation (for sport-specific activities)
};

export function PremiumActivityCard({
  domain,
  profile,
  lastSession,
  stats,
  isPaused = false,
  state,
  onPauseClick,
  customMetadata,
  activityId,
}: PremiumActivityCardProps) {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);

  const martialArtsDisciplines = domain === 'martial_arts' && profile?.domainDetails?.martial_arts?.disciplines
    ? profile.domainDetails.martial_arts.disciplines
    : undefined;
  const baseMetadata = getActivityMetadata(domain, martialArtsDisciplines);
  const metadata = customMetadata || baseMetadata;
  
  // Get emoji - use custom emoji if provided, otherwise check if it's a sport and use sport emoji, otherwise use base metadata emoji
  let emoji = metadata.emoji;
  if (!emoji && customMetadata?.displayName) {
    // For sport activities, try to get sport-specific emoji
    emoji = getSportEmoji(customMetadata.displayName);
    if (emoji === '⚪') {
      // Fallback to base metadata emoji if sport emoji not found
      emoji = baseMetadata.emoji;
    }
  } else if (!emoji) {
    emoji = baseMetadata.emoji;
  }

  const formatLastSessionTime = (session: MovementSession): string => {
    if (!session.timestamp) return '';
    const sessionDate = new Date(session.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const handlePress = () => {
    triggerHaptic('light');
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
  };

  const handleClick = () => {
    triggerHaptic('medium');
    // Use activityId (category ID) if provided, otherwise use domain
    const navigateId = activityId || domain;
    navigate(`/fitness-tracker/activity/${navigateId}`);
  };

  const isSeasonal = state?.isSeasonal && state?.state === 'seasonal';
  const opacity = isPaused ? 0.65 : 1;
  const scale = isPressed ? 0.98 : 1;

  return (
    <div
      onClick={handleClick}
      onMouseDown={handlePress}
      onTouchStart={handlePress}
      style={{
        transform: `scale(${scale})`,
        transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        opacity,
      }}
      className={`
        group relative
        bg-white/80 backdrop-blur-xl
        rounded-2xl
        border border-gray-200/60
        p-4
        cursor-pointer
        overflow-hidden
        shadow-sm hover:shadow-lg
        transition-all duration-300
        ${isPaused ? 'hover:bg-gray-50/80' : 'hover:bg-white/90'}
      `}
    >
      {/* Gradient overlay - subtle, activity-specific */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${metadata.lightGradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-3xl`}
        style={{ opacity: isPaused ? 0 : undefined }}
      />

      {/* Subtle border glow on hover */}
      <div
        className="absolute inset-0 rounded-3xl border-2 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{ borderColor: metadata.color }}
      />

      <div className="relative z-10">
        {/* Header: Icon + Stats + Menu */}
        <div className="flex items-start justify-between mb-3.5">
          <div
            className="p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300 flex items-center justify-center"
            style={{
              backgroundColor: `${metadata.color}12`,
              opacity: isPaused ? 0.7 : 1,
            }}
          >
            <span 
              className="text-xl transition-transform duration-300 group-hover:scale-110"
              role="img"
              aria-label={metadata.displayName}
            >
              {emoji}
            </span>
          </div>

          <div className="flex items-center gap-2">
                    {stats.thisWeekCount > 0 && !isPaused && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100/80 backdrop-blur-sm rounded-full border border-gray-200/60">
                        <TrendingUp size={11} className="text-gray-600" />
                        <span className="text-[10px] font-semibold text-gray-700">{stats.thisWeekCount}</span>
                      </div>
                    )}
            {isSeasonal && (
              <div className="px-2.5 py-1 bg-gray-200/60 rounded-full">
                <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Seasonal</span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3
          className={`text-base font-bold mb-1 transition-colors duration-300 ${isPaused ? 'text-gray-600' : 'text-gray-900'}`}
        >
          {metadata.displayName}
        </h3>
        {metadata.description && (
          <p className={`text-xs mb-3.5 ${isPaused ? 'text-gray-400' : 'text-gray-500'} line-clamp-1`}>
            {metadata.description}
          </p>
        )}

        {/* Stats Section */}
        <div className="pt-3 border-t border-gray-100/80 space-y-2.5">
          {stats.thisWeekCount > 0 && !isPaused && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">This week</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.thisWeekCount} session{stats.thisWeekCount !== 1 ? 's' : ''}
                {stats.totalDuration > 0 && (
                  <span className="text-gray-500 font-normal ml-1.5">
                    • {stats.totalDuration}m
                  </span>
                )}
              </span>
            </div>
          )}

                  {lastSession ? (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-1 font-medium">
                        Last Session
                      </p>
                      <p className={`text-xs font-semibold mb-0.5 ${isPaused ? 'text-gray-500' : 'text-gray-900'}`}>
                        {lastSession.activity || lastSession.sessionType || 'Session'}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatLastSessionTime(lastSession)}</p>
                    </div>
                  ) : !isPaused && (
                    <div className="pt-1">
                      <p className="text-[10px] text-gray-400">Ready to log your first session</p>
                    </div>
                  )}
        </div>
      </div>
    </div>
  );
}
