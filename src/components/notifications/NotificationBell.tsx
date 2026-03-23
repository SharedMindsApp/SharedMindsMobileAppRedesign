/**
 * Notification Bell
 * 
 * Bell icon with unread indicator for the app header.
 * Opens notification panel on click.
 */

import { Bell } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  /** Force the bell to always be visible, even if notifications are disabled */
  alwaysVisible?: boolean;
  /** If true, renders notification panel as full-screen modal on mobile (e.g., in Spaces) */
  fullScreenOnMobile?: boolean;
}

export function NotificationBell({ alwaysVisible = false, fullScreenOnMobile = false }: NotificationBellProps = {}) {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // If alwaysVisible is true, always show the bell (e.g., in Spaces)
  // Otherwise, always show (preferences check removed as NotificationContext doesn't provide preferences)
  // This ensures the bell is always visible unless explicitly hidden

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white" />
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={handleClose}
        anchorRef={buttonRef}
        fullScreenOnMobile={fullScreenOnMobile}
      />
    </div>
  );
}
