/**
 * Notification Card
 * 
 * Individual notification item displayed in the notification panel.
 */

import { Calendar, Shield, LayoutGrid, AlertCircle, Users } from 'lucide-react';
import type { Notification } from '../../lib/notificationTypes';

interface NotificationCardProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

/**
 * Format a date as relative time (e.g., "2 minutes ago", "3 hours ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'calendar':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'guardrails':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'planner':
        return <LayoutGrid className="w-5 h-5 text-green-600" />;
      case 'social':
        return <Users className="w-5 h-5 text-pink-600" />;
      case 'system':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getIconBgColor = () => {
    switch (notification.type) {
      case 'calendar':
        return 'bg-purple-100';
      case 'guardrails':
        return 'bg-blue-100';
      case 'planner':
        return 'bg-green-100';
      case 'social':
        return 'bg-pink-100';
      case 'system':
      default:
        return 'bg-gray-100';
    }
  };

  const timeAgo = formatTimeAgo(new Date(notification.created_at));

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${getIconBgColor()}`}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold text-gray-900 ${!notification.is_read ? 'font-bold' : ''}`}>
              {notification.title}
            </h4>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.body}
          </p>
          
          <p className="text-xs text-gray-500">
            {timeAgo}
          </p>
        </div>
      </div>
    </button>
  );
}
