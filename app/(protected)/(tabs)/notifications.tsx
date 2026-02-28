// app/(tabs)/notifications.tsx — Firestore-backed notifications
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { Notification } from '@/components/models/Notification';
import { fetchNotifications, markNotificationRead, deleteNotifications } from '@/src/services/notifications';
import { captureException } from '@/src/telemetry';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const result = await fetchNotifications(user.uid, { pageSize: 30 });
      setNotifications(result.notifications);
    } catch (err) {
      captureException(err, { flow: 'loadNotifications' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handlePress = async (n: Notification) => {
    // Mark read
    if (user && !n.readAt) {
      await markNotificationRead(user.uid, n.id);
      setNotifications((prev) =>
        prev.map((item) => item.id === n.id ? { ...item, readAt: new Date() } : item),
      );
    }
    // Navigate
    if (n.type === 'friend_request') {
      router.push(`/profile/${n.actorUid}`);
    } else if (n.eventId) {
      router.push(`/event/${n.eventId}`);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await deleteNotifications(user.uid, Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsEditing(false);
      load(); // Refresh feed
    } catch {
      // Silently fail or use existing error boundaries
    } finally {
      setDeleting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return 'person-add-outline';
      case 'event_live': return 'megaphone-outline';
      case 'comment': return 'chatbubble-outline';
      case 'reply': return 'chatbubbles-outline';
      default: return 'notifications-outline';
    }
  };

  const getMessage = (n: Notification) => {
    const name = n.actorName || 'Someone';
    switch (n.type) {
      case 'friend_request': return `${name} sent you a friend request`;
      case 'event_live': return 'Your event is now live!';
      case 'comment': return `${name} commented on your event`;
      case 'reply': return `${name} replied to your comment`;
      default: return 'New notification';
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#866FD8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setIsEditing(!isEditing);
              setSelectedIds(new Set());
            }}
          >
            <Text style={styles.headerAction}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifItem, !item.readAt && styles.unreadItem]}
              onPress={() => {
                if (isEditing) toggleSelection(item.id);
                else handlePress(item);
              }}
              activeOpacity={isEditing ? 0.7 : 0.2}
            >
              {isEditing && (
                <View style={styles.selectCircle}>
                  {selectedIds.has(item.id) ? (
                    <Ionicons name="checkmark-circle" size={24} color="#ef4444" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#ccc" />
                  )}
                </View>
              )}
              <View style={[styles.iconCircle, !item.readAt && styles.unreadCircle]}>
                <Ionicons
                  name={getIcon(item.type) as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={!item.readAt ? '#fff' : '#866FD8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifText, !item.readAt && styles.unreadText]}>
                  {getMessage(item)}
                </Text>
                <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
              </View>
              {!item.readAt && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}

      {isEditing && selectedIds.size > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>
                Delete Selected ({selectedIds.size})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  header: { fontSize: 24, fontWeight: '700' },
  headerAction: { fontSize: 16, color: '#866FD8', fontWeight: '600' },
  notifItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  unreadItem: { backgroundColor: '#f8f5ff' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0ebff',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  unreadCircle: { backgroundColor: '#866FD8' },
  notifText: { fontSize: 15, color: '#333', lineHeight: 20 },
  unreadText: { fontWeight: '600' },
  notifTime: { fontSize: 12, color: '#999', marginTop: 2 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#866FD8', marginLeft: 8,
  },
  selectCircle: { marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 },
  actionBar: {
    padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingBottom: 32, // Safe area padding
  },
  deleteButton: {
    backgroundColor: '#ef4444', borderRadius: 24, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
