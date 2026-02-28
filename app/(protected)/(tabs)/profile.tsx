// app/(tabs)/profile.tsx — Own profile with hosted/attending events
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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

export default function ProfilePage() {
  const router = useRouter();
  const { user, logOut } = useAuth();
  const { name, interests, bio, profileLoading } = useProfile();

  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [hostedEvents, setHostedEvents] = useState<ConnectEvent[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<ConnectEvent[]>([]);
  const [hostedError, setHostedError] = useState<string | null>(null);
  const [attendingError, setAttendingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#866FD8" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </ThemedText>
          </View>
          <ThemedText style={styles.displayName}>{name || 'UBC User'}</ThemedText>
          {bio ? <ThemedText style={styles.bio}>{bio}</ThemedText> : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <ThemedText style={styles.editBtnText}>Edit Profile</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#e65100" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => router.push('/(protected)/(tabs)/friends')}>
            <ThemedText style={styles.statNumber}>{friends.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Friends</ThemedText>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>{hostedEvents.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Hosting</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>{attendingEvents.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Attending</ThemedText>
          </View>
        </View>

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
              <ThemedText style={{ color: '#866FD8', fontSize: 14 }}>See All</ThemedText>
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
                  style={[styles.friendAvatar, { backgroundColor: '#eee' }]}
                  onPress={() => router.push('/(protected)/(tabs)/friends')}
                >
                  <ThemedText style={{ color: '#666', fontSize: 12 }}>
                    +{friends.length - 5}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#866FD8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  displayName: { fontSize: 22, fontWeight: '700', color: '#333' },
  bio: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  actionsRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#866FD8',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
  },
  editBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  logoutBtn: { padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e65100' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#866FD8' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#e8e0ff', borderRadius: 16, paddingHorizontal: 12,
    paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  chipText: { fontSize: 13, color: '#333' },
  eventCard: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, marginBottom: 8,
  },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  eventSub: { fontSize: 13, color: '#777', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  friendsList: { flexDirection: 'row', flexWrap: 'wrap' },
  friendItem: { marginRight: 8 },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#866FD8',
    alignItems: 'center', justifyContent: 'center',
  },
  friendAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
