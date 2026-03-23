/**
 * Notification Panel
 * 
 * Main notification inbox UI.
 * Renders as bottom sheet on mobile, popover on web.
 */

import { X, CheckCheck, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationCard } from './NotificationCard';
import { isStandaloneApp } from '../../lib/appContext';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
  /** If true, renders as full-screen modal on mobile (e.g., in Spaces) */
  fullScreenOnMobile?: boolean;
}

export function NotificationPanel({ isOpen, onClose, anchorRef, fullScreenOnMobile = false }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAllAsRead, handleNotificationClick } = useNotifications();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationCardClick = async (notification: any) => {
    await handleNotificationClick(notification);
    onClose();
  };

  // Helper function to render notification content
  const renderNotificationContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">You're all caught up</h3>
            <p className="text-sm text-gray-500">No new notifications</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClick={handleNotificationCardClick}
          />
        ))}
      </div>
    );
  };

  // Mobile: Full-screen modal for Spaces, bottom sheet elsewhere
  if (isMobile) {
    if (fullScreenOnMobile) {
      // Full-screen modal for Spaces mobile - use portal to ensure it's above everything
      const fullScreenModal = (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
            onClick={onClose}
            onTouchStart={onClose}
          />
          
          {/* Full-screen modal */}
          <div className="fixed inset-0 z-[70] bg-white flex flex-col safe-top safe-bottom animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 safe-top bg-white">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-2 text-blue-600 hover:text-blue-700 active:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Mark all as read"
                  >
                    <CheckCheck className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close notifications"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {renderNotificationContent()}
            </div>
          </div>
        </>
      );

      // Use portal to ensure it renders above all other content
      if (typeof document !== 'undefined') {
        return createPortal(fullScreenModal, document.body);
      }
      return fullScreenModal;
    }
    
    // Bottom Sheet for non-Spaces mobile - use portal
    const bottomSheet = (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-[60] transition-opacity"
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col safe-bottom animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close notifications"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {renderNotificationContent()}
          </div>
        </div>
      </>
    );

    // Use portal for bottom sheet too
    if (typeof document !== 'undefined') {
      return createPortal(bottomSheet, document.body);
    }
    return bottomSheet;
  }

  // Web: Popover - use portal and calculate position from anchorRef
  const getPopoverPosition = () => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      return {
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }
    // Fallback to top-right if no anchor
    return {
      top: '64px',
      right: '16px',
    };
  };

  const popoverPosition = getPopoverPosition();

  const popoverContent = (
    <>
      {/* Backdrop (for closing) */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
      />
      
      {/* Popover - use fixed positioning with calculated position */}
      <div
        className="fixed w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[70] max-h-[600px] flex flex-col"
        style={{
          top: popoverPosition.top,
          right: popoverPosition.right,
          transformOrigin: 'top right',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderNotificationContent()}
        </div>
      </div>
    </>
  );

  // Use portal for web popover to avoid z-index/overflow issues
  if (typeof document !== 'undefined') {
    return createPortal(popoverContent, document.body);
  }

  return null;
}
