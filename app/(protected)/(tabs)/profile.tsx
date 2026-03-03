// app/(tabs)/profile.tsx — Own profile with hosted/attending events
import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import {
  listFriends, FriendEdge, fetchEventsByCreator,
  fetchUserAttendingEventIds, fetchEventsByIds,
  isFailedPrecondition, getFirestoreErrorMessage
} from '@/src/services/social';
import InlineNotice from '@/components/InlineNotice';
import { captureException } from '@/src/telemetry';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { getAvatarSource } from '@/src/utils/avatarMap';
import GlassCard from '@/components/ui/GlassCard';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const { name, interests, bio, photoURL, saveProfile, profileLoading } = useProfile();
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [hostedEvents, setHostedEvents] = useState<ConnectEvent[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<ConnectEvent[]>([]);
  const [hostedError, setHostedError] = useState<string | null>(null);
  const [attendingError, setAttendingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleAvatarSelect = async (key: string) => {
    try {
      await saveProfile({ photoURL: key });
      setPickerVisible(false);
    } catch (err) {
      captureException(err, { flow: 'saveAvatar' });
      Alert.alert('Error', 'Failed to save avatar.');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }

      try {
        const friendsList = await listFriends(user.uid);
        setFriends(friendsList);
      } catch (err) {
        captureException(err, { flow: 'loadProfileFriends' });
      }

      try {
        const hosted = await fetchEventsByCreator(user.uid);
        setHostedEvents(hosted);
      } catch (err) {
        if (isFailedPrecondition(err)) {
          setHostedError(getFirestoreErrorMessage(err));
        } else {
          captureException(err, { flow: 'loadProfileHosted' });
        }
      }

      try {
        const attendingResult = await fetchUserAttendingEventIds(user.uid, user.uid);
        if (attendingResult.error) {
          setAttendingError(attendingResult.error);
        } else if (attendingResult.ids.length > 0) {
          const events = await fetchEventsByIds(attendingResult.ids);
          setAttendingEvents(events);
        }
      } catch (err) {
        captureException(err, { flow: 'loadProfileAttending' });
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logOut();
      router.replace('/landing');
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  if (profileLoading || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {getAvatarSource(photoURL) ? (
                  <Image source={getAvatarSource(photoURL)!} style={styles.avatarImage} />
                ) : (
                  <ThemedText style={styles.avatarText}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </ThemedText>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.avatarEditBtn}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.displayName}>{name || 'UBC User'}</ThemedText>
          {bio ? <ThemedText style={styles.bio}>{bio}</ThemedText> : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <GradientButton
              variant="outline"
              size="sm"
              title="Edit Profile"
              icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
              onPress={() => router.push('/edit-profile')}
            />
            <GradientButton
              variant="ghost"
              size="sm"
              title="Change Password"
              icon={<Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />}
              onPress={() => router.push('/(protected)/change-password')}
            />
            <GradientButton
              variant="danger"
              size="sm"
              title="Logout"
              icon={<Ionicons name="log-out-outline" size={16} color="#fff" />}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Stats */}
        <GlassCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/(protected)/(tabs)/friends')}>
              <ThemedText style={styles.statNumber}>{friends.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Friends</ThemedText>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={styles.statNumber}>{hostedEvents.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Hosting</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={styles.statNumber}>{attendingEvents.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Attending</ThemedText>
            </View>
          </View>
        </GlassCard>

        {/* Interests */}
        {interests && interests.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Interests</ThemedText>
            <View style={styles.chipsRow}>
              {interests.map((interest, i) => (
                <View key={i} style={styles.chip}>
                  <ThemedText style={styles.chipText}>{interest}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Hosted Events */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your Events</ThemedText>
          {hostedError ? (
            <InlineNotice message={hostedError} type="error" />
          ) : hostedEvents.length === 0 ? (
            <ThemedText style={styles.emptyText}>No events created yet</ThemedText>
          ) : (
            hostedEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${e.id}`)}
              >
                <ThemedText style={styles.eventTitle}>{e.title}</ThemedText>
                <ThemedText style={styles.eventSub}>
                  {e.locationName || 'No location'} · {e.categoryId || ''}
                </ThemedText>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Attending */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Attending</ThemedText>
          {attendingError ? (
            <InlineNotice message={attendingError} type="error" />
          ) : attendingEvents.length === 0 ? (
            <ThemedText style={styles.emptyText}>Not attending any events</ThemedText>
          ) : (
            attendingEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${e.id}`)}
              >
                <ThemedText style={styles.eventTitle}>{e.title}</ThemedText>
                <ThemedText style={styles.eventSub}>{e.locationName || 'No location'}</ThemedText>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Friends Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Friends</ThemedText>
            <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/friends')}>
              <ThemedText style={styles.seeAllText}>See All</ThemedText>
            </TouchableOpacity>
          </View>
          {friends.length === 0 ? (
            <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
          ) : (
            <View style={styles.friendsList}>
              {friends.slice(0, 5).map((f) => (
                <TouchableOpacity
                  key={f.friendUid}
                  style={styles.friendItem}
                  onPress={() => router.push(`/profile/${f.friendUid}`)}
                >
                  <View style={styles.friendAvatar}>
                    <ThemedText style={styles.friendAvatarText}>
                      {f.friendUid.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
              {friends.length > 5 && (
                <TouchableOpacity
                  style={[styles.friendAvatar, { backgroundColor: colors.surfaceLight }]}
                  onPress={() => router.push('/(protected)/(tabs)/friends')}
                >
                  <ThemedText style={styles.friendOverflowText}>
                    +{friends.length - 5}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      <AvatarPickerModal
        visible={pickerVisible}
        currentAvatar={photoURL}
        onSelect={handleAvatarSelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.base,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontFamily: fonts.display,
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: fontSizes.xl,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
  },
  bio: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statNumber: {
    fontSize: fontSizes.xl,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  seeAllText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.primaryLight,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  eventTitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.bodySemiBold,
    fontWeight: '600',
    color: colors.text,
  },
  eventSub: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  friendItem: {
    marginRight: spacing.sm,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontFamily: fonts.bodySemiBold,
    fontWeight: 'bold',
  },
  friendOverflowText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: fonts.bodyMedium,
  },
});
