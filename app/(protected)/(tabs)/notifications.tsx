// app/(tabs)/notifications.tsx — Firestore-backed notifications
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { Notification } from '@/components/models/Notification';
import { fetchNotifications, markNotificationRead, deleteNotifications } from '@/src/services/notifications';
import { captureException } from '@/src/telemetry';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
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
                    <Ionicons name="checkmark-circle" size={24} color={colors.danger} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color={colors.textMuted} />
                  )}
                </View>
              )}
              <View style={[styles.iconCircle, !item.readAt && styles.unreadCircle]}>
                <Ionicons
                  name={getIcon(item.type) as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={!item.readAt ? colors.text : colors.primaryLight}
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
              <ActivityIndicator color={colors.danger} size="small" />
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  header: {
    fontSize: fontSizes.xxl,
    fontFamily: fonts.display,
    color: colors.text,
  },
  headerAction: {
    fontSize: fontSizes.base,
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryLight,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadItem: {
    backgroundColor: colors.primaryGlow,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  unreadCircle: {
    backgroundColor: colors.primary,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  notifText: {
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unreadText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  notifTime: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
  },
  selectCircle: {
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.base,
    fontFamily: fonts.bodyMedium,
    marginTop: spacing.md,
  },
  actionBar: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xxl, // Safe area padding
  },
  deleteButton: {
    backgroundColor: colors.dangerGlow,
    borderRadius: radius.xxl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: fontSizes.base,
    fontFamily: fonts.bodySemiBold,
  },
});
