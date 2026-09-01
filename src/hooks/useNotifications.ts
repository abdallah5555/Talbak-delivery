import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Notification, User } from '../types';
import { fetchNotificationsFromDb, markNotificationAsReadInDb, markAllNotificationsAsReadInDb, deleteNotificationFromDb, subscribeToNotificationsRealtime } from '../lib/supabaseService';
import { playNotificationSound } from '../lib/soundService';
import { loadNotificationPreferences } from '../lib/pushNotificationService';

const PUSH_DB = 'talabak-push-center';
const PUSH_STORE = 'received';
const PUSH_DB_VERSION = 2;
const LOCAL_PUSH_PREFIX = 'push-';

function openPushDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unsupported'));
    const request = indexedDB.open(PUSH_DB, PUSH_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PUSH_STORE)) db.createObjectStore(PUSH_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readPersistedPushNotifications(userId: string): Promise<Notification[]> {
  try {
    const db = await openPushDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PUSH_STORE, 'readonly');
      const request = tx.objectStore(PUSH_STORE).getAll();
      request.onsuccess = () => {
        db.close();
        const rows = (request.result || [])
          .filter((row: any) => row.userId === userId)
          .map((row: any) => ({
            id: row.id, userId, title: row.title || 'طلبك دليفري', message: row.message || '', type: row.type || 'system', isRead: Boolean(row.isRead), createdAt: row.createdAt || new Date().toISOString()
          }));
        resolve(rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  } catch { return []; }
}

async function updatePersistedPush(id: string, changes: Partial<{ isRead: boolean }>) {
  try {
    const db = await openPushDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PUSH_STORE, 'readwrite');
      const store = tx.objectStore(PUSH_STORE);
      const get = store.get(id);
      get.onsuccess = () => { if (get.result) store.put({ ...get.result, ...changes }); };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function deletePersistedPush(id: string) {
  try {
    const db = await openPushDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PUSH_STORE, 'readwrite');
      tx.objectStore(PUSH_STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export function useNotifications(currentUser: User | null, authStatus?: string, onNewNotification?: (notif: Notification) => void) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const isInitialLoadRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(currentUser?.id || null);
  const onNewNotifRef = useRef(onNewNotification);

  useEffect(() => { onNewNotifRef.current = onNewNotification; }, [onNewNotification]);
  useEffect(() => { currentUserIdRef.current = currentUser?.id || null; }, [currentUser?.id]);

  const loadNotifications = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [dbNotifications, persistedPush] = await Promise.all([fetchNotificationsFromDb(userId), readPersistedPushNotifications(userId)]);
      const merged = [...dbNotifications, ...persistedPush].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const unique = merged.filter((item, index, all) => all.findIndex((x) => x.id === item.id) === index);
      setNotifications(unique);
    } catch (e) {
      console.error('Error loading notifications:', e);
      setNotifications(await readPersistedPushNotifications(userId));
    } finally { setLoading(false); isInitialLoadRef.current = false; }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_NOTIFICATION_RECEIVED') return;
      const payload = event.data.payload;
      if (!payload || !currentUserIdRef.current) return;
      if (payload.userId && payload.userId !== currentUserIdRef.current) return;
      const newNotif: Notification = {
        id: payload.id || `push-${Date.now()}`,
        userId: currentUserIdRef.current,
        title: payload.title || 'طلبك دليفري', message: payload.message || payload.body || '', type: payload.type || 'system', isRead: false, createdAt: payload.receivedAt || new Date().toISOString()
      };
      setNotifications((prev) => prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev]);
      const prefs = loadNotificationPreferences();
      if (prefs.soundEnabled) playNotificationSound();
      onNewNotifRef.current?.(newNotif);
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  useEffect(() => {
    if (!currentUser?.id || authStatus === 'unauthenticated') { setNotifications([]); setLoading(false); isInitialLoadRef.current = true; return; }
    const userId = currentUser.id;
    isInitialLoadRef.current = true;
    loadNotifications(userId);
    const unsubscribe = subscribeToNotificationsRealtime(userId, (payload) => {
      try {
        if (!payload) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const raw = payload.new;
          if (raw.user_id && raw.user_id !== currentUserIdRef.current) return;
          const newNotif: Notification = { id: raw.id, userId: raw.user_id, title: raw.title || '', message: raw.message || '', type: raw.type || 'system', isRead: Boolean(raw.is_read), createdAt: raw.created_at || new Date().toISOString() };
          setNotifications((prev) => prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev]);
          if (!isInitialLoadRef.current) { const prefs = loadNotificationPreferences(); if (prefs.soundEnabled) playNotificationSound(); onNewNotifRef.current?.(newNotif); }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const raw = payload.new;
          setNotifications((prev) => prev.map((n) => n.id === raw.id ? { ...n, title: raw.title ?? n.title, message: raw.message ?? n.message, type: raw.type ?? n.type, isRead: Boolean(raw.is_read) } : n));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      } catch (e) { console.error('Error handling realtime notification event:', e); }
    });
    return () => unsubscribe?.();
  }, [currentUser?.id, authStatus, loadNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, isRead: true } : n));
    if (notificationId.startsWith(LOCAL_PUSH_PREFIX)) await updatePersistedPush(notificationId, { isRead: true });
    else await markNotificationAsReadInDb(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all([markAllNotificationsAsReadInDb(currentUser.id), ...notifications.filter((n) => n.id.startsWith(LOCAL_PUSH_PREFIX)).map((n) => updatePersistedPush(n.id, { isRead: true }))]);
  }, [currentUser?.id, notifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notificationId.startsWith(LOCAL_PUSH_PREFIX)) await deletePersistedPush(notificationId);
    else await deleteNotificationFromDb(notificationId);
  }, []);

  const refreshNotifications = useCallback(async () => { if (currentUser?.id) await loadNotifications(currentUser.id); }, [currentUser?.id, loadNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refreshNotifications };
}