import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Notification, User } from '../types';
import {
  fetchNotificationsFromDb,
  markNotificationAsReadInDb,
  markAllNotificationsAsReadInDb,
  deleteNotificationFromDb,
  subscribeToNotificationsRealtime
} from '../lib/supabaseService';
import { playNotificationSound } from '../lib/soundService';

/**
 * Core Notifications Hook
 * Manages user notifications, unread count, Web Audio chime alerts,
 * and Supabase Realtime synchronization.
 */
export function useNotifications(
  currentUser: User | null,
  authStatus?: string,
  onNewNotification?: (notif: Notification) => void
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isInitialLoadRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(currentUser?.id || null);
  const onNewNotifRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotifRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
  }, [currentUser?.id]);

  const loadNotifications = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await fetchNotificationsFromDb(userId);
      setNotifications(data);
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, []);

  // Main lifecycle: Load initial notifications and attach Realtime listener
  useEffect(() => {
    // If not authenticated or no user, clear state and return
    if (!currentUser?.id || (authStatus && authStatus !== 'unauthenticated' && authStatus !== 'authenticated' && !currentUser)) {
      setNotifications([]);
      setLoading(false);
      isInitialLoadRef.current = true;
      return;
    }

    if (authStatus === 'unauthenticated' || !currentUser?.id) {
      setNotifications([]);
      setLoading(false);
      isInitialLoadRef.current = true;
      return;
    }

    const userId = currentUser.id;
    isInitialLoadRef.current = true;
    loadNotifications(userId);

    // Subscribe to Realtime notifications
    const unsubscribe = subscribeToNotificationsRealtime(userId, (payload) => {
      try {
        if (!payload) return;

        // INSERT: New notification received
        if (payload.eventType === 'INSERT' && payload.new) {
          const raw = payload.new;
          // Security check: ensure notification belongs to current user
          if (raw.user_id && raw.user_id !== currentUserIdRef.current) {
            return;
          }

          const newNotif: Notification = {
            id: raw.id,
            userId: raw.user_id,
            title: raw.title || '',
            message: raw.message || '',
            type: raw.type || 'system',
            isRead: Boolean(raw.is_read),
            createdAt: raw.created_at || new Date().toISOString()
          };

          setNotifications((prev) => {
            // Deduplicate to avoid duplicate items if Realtime sends multiple events
            if (prev.some((n) => n.id === newNotif.id)) {
              return prev;
            }
            return [newNotif, ...prev];
          });

          // Play notification sound only for new incoming realtime events (not initial load)
          if (!isInitialLoadRef.current) {
            playNotificationSound();
            if (onNewNotifRef.current) {
              onNewNotifRef.current(newNotif);
            }
          }
        }

        // UPDATE: Notification modified (e.g. read status changed)
        else if (payload.eventType === 'UPDATE' && payload.new) {
          const raw = payload.new;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === raw.id
                ? {
                    ...n,
                    title: raw.title ?? n.title,
                    message: raw.message ?? n.message,
                    type: raw.type ?? n.type,
                    isRead: Boolean(raw.is_read)
                  }
                : n
            )
          );
        }

        // DELETE: Notification removed
        else if (payload.eventType === 'DELETE' && payload.old) {
          const raw = payload.old;
          setNotifications((prev) => prev.filter((n) => n.id !== raw.id));
        }
      } catch (e) {
        console.error('Error handling realtime notification event:', e);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.id, authStatus, loadNotifications]);

  // Derived unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    await markNotificationAsReadInDb(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsReadInDb(currentUser.id);
  }, [currentUser?.id]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    await deleteNotificationFromDb(notificationId);
  }, []);

  // Manual refresh
  const refreshNotifications = useCallback(async () => {
    if (currentUser?.id) {
      await loadNotifications(currentUser.id);
    }
  }, [currentUser?.id, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  };
}
