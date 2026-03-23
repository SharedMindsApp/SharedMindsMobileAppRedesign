/**
 * Notification Context
 * 
 * Global state management for notifications.
 * Provides notification data, unread count, and actions across the app.
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../lib/notifications';
import type { Notification } from '../lib/notificationTypes';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleNotificationClick: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [notifs, count] = await Promise.all([
        getNotifications(50),
        getUnreadCount(),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('[NotificationContext] Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      if (!newNotification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [user?.id]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Error marking as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await markAllNotificationsRead(user.id);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Error marking all as read:', err);
    }
  }, [user?.id]);

  // Handle notification click (navigate + mark as read)
  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read if not already
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Navigate if action URL provided
      if (notification.action_url) {
        window.location.href = notification.action_url;
      }
    },
    [markAsRead]
  );

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
