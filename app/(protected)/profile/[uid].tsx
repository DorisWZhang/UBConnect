// app/profile/[uid].tsx — View any user's profile
import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/src/auth/AuthContext';
import { UserProfile } from '@/components/models/UserProfile';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import {
    fetchUserProfile, fetchEventsByCreator, fetchUserAttendingEventIds,
    fetchEventsByIds, getFriendStatus, sendFriendRequest,
    cancelFriendRequest, acceptFriendRequest, removeFriend,
    isPermissionDenied, isFailedPrecondition, getFirestoreErrorMessage,
} from '@/src/services/social';
import { createNotification } from '@/src/services/notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import InlineNotice from '@/components/InlineNotice';

export default function ProfileViewScreen() {
    const { uid } = useLocalSearchParams<{ uid: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const isSelf = user?.uid === uid;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [hostedEvents, setHostedEvents] = useState<ConnectEvent[]>([]);
    const [attendingEvents, setAttendingEvents] = useState<ConnectEvent[]>([]);
    const [friendStatus, setFriendStatus] = useState<'friends' | 'pending_sent' | 'pending_received' | 'none'>('none');
    const [actionLoading, setActionLoading] = useState(false);
    const [hostedError, setHostedError] = useState<string | null>(null);
    const [attendingError, setAttendingError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!uid) return;
            try {
                const p = await fetchUserProfile(uid);
                setProfile(p);
            } catch (err) {
                if (isPermissionDenied(err)) {
                    Alert.alert('Access Denied', 'Verify your email to view profiles.');
                }
            }

            try {
                const hosted = await fetchEventsByCreator(uid, { viewerUid: user?.uid });
                setHostedEvents(hosted);
            } catch (err) {
                if (isFailedPrecondition(err)) {
                    setHostedError(getFirestoreErrorMessage(err));
                }
            }

            try {
                // Attending events
                const attendingResult = await fetchUserAttendingEventIds(uid, user?.uid);
                if (attendingResult.error) {
                    setAttendingError(attendingResult.error);
                } else if (attendingResult.ids.length > 0) {
                    const events = await fetchEventsByIds(attendingResult.ids);
                    setAttendingEvents(events);
                }
            } catch (err) { }

            try {
                // Friend status
                if (user && !isSelf) {
                    const status = await getFriendStatus(user.uid, uid);
                    setFriendStatus(status);
                }
            } catch (err) { }

            setLoading(false);
        };
        load();
    }, [uid, user]);

    const handleFriendAction = async () => {
        if (!user || !uid) return;
        setActionLoading(true);
        try {
            switch (friendStatus) {
                case 'none':
                    await sendFriendRequest(user.uid, uid, user.displayName || undefined);
                    setFriendStatus('pending_sent');
                    // Create notification
                    await createNotification({
                        type: 'friend_request',
                        actorUid: user.uid,
                        actorName: user.displayName || undefined,
                        targetUid: uid,
                    });
                    break;
                case 'pending_sent':
                    await cancelFriendRequest(user.uid, uid);
                    setFriendStatus('none');
                    break;
                case 'pending_received':
                    await acceptFriendRequest(uid, user.uid);
                    setFriendStatus('friends');
                    break;
                case 'friends':
                    Alert.alert('Remove Friend', 'Are you sure?', [
                        { text: 'Cancel' },
                        {
                            text: 'Remove', style: 'destructive', onPress: async () => {
                                await removeFriend(user.uid, uid);
                                setFriendStatus('none');
                            },
                        },
                    ]);
                    break;
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to perform action.');
        } finally {
            setActionLoading(false);
        }
    };

    const friendButtonLabel = () => {
        switch (friendStatus) {
            case 'friends': return '✓ Friends';
            case 'pending_sent': return 'Cancel Request';
            case 'pending_received': return 'Accept Request';
            default: return '+ Add Friend';
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#866FD8" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText>Profile not found</ThemedText>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ThemedText style={{ color: '#fff' }}>Go Back</ThemedText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Profile</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <ThemedText style={styles.avatarText}>
                            {profile.displayName.charAt(0).toUpperCase()}
                        </ThemedText>
                    </View>
                    <ThemedText style={styles.displayName}>{profile.displayName}</ThemedText>
                    {profile.bio ? <ThemedText style={styles.bio}>{profile.bio}</ThemedText> : null}

                    {/* Friend action or Edit */}
                    {isSelf ? (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.friendButton,
                                friendStatus === 'friends' && styles.friendsBtn,
                                friendStatus === 'pending_sent' && styles.pendingBtn,
                            ]}
                            onPress={handleFriendAction}
                            disabled={actionLoading}
                        >
                            <ThemedText style={styles.friendButtonText}>{friendButtonLabel()}</ThemedText>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Interests */}
                {profile.interests && profile.interests.length > 0 && (
                    <View style={styles.section}>
                        <ThemedText style={styles.sectionTitle}>Interests</ThemedText>
                        <View style={styles.chipsRow}>
                            {profile.interests.map((interest, i) => (
                                <View key={i} style={styles.chip}>
                                    <ThemedText style={styles.chipText}>{interest}</ThemedText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Hosted Events */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>
                        Hosting ({hostedEvents.length})
                    </ThemedText>
                    {hostedError ? (
                        <InlineNotice message={hostedError} type="error" />
                    ) : hostedEvents.length === 0 ? (
                        <ThemedText style={styles.emptyText}>No events hosted yet</ThemedText>
                    ) : (
                        hostedEvents.map((e) => (
                            <TouchableOpacity
                                key={e.id}
                                style={styles.eventCard}
                                onPress={() => router.push(`/event/${e.id}`)}
                            >
                                <ThemedText style={styles.eventCardTitle}>{e.title}</ThemedText>
                                <ThemedText style={styles.eventCardSub}>{e.locationName || 'No location'}</ThemedText>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Attending Events */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>
                        Attending ({attendingEvents.length})
                    </ThemedText>
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
                                <ThemedText style={styles.eventCardTitle}>{e.title}</ThemedText>
                                <ThemedText style={styles.eventCardSub}>{e.locationName || 'No location'}</ThemedText>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingTop: 60,
        paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginLeft: 12 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    avatarContainer: { alignItems: 'center', marginBottom: 20 },
    avatar: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: '#866FD8',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
    displayName: { fontSize: 22, fontWeight: '700', color: '#333' },
    bio: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
    editButton: {
        marginTop: 12, backgroundColor: '#866FD8', paddingHorizontal: 24,
        paddingVertical: 8, borderRadius: 20,
    },
    editButtonText: { color: '#fff', fontWeight: '600' },
    friendButton: {
        marginTop: 12, backgroundColor: '#866FD8', paddingHorizontal: 24,
        paddingVertical: 8, borderRadius: 20,
    },
    friendsBtn: { backgroundColor: '#4CAF50' },
    pendingBtn: { backgroundColor: '#FF9800' },
    friendButtonText: { color: '#fff', fontWeight: '600' },
    section: { marginBottom: 20 },
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
    eventCardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    eventCardSub: { fontSize: 13, color: '#777', marginTop: 4 },
    emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
    backBtn: {
        marginTop: 16, backgroundColor: '#866FD8', paddingHorizontal: 24,
        paddingVertical: 10, borderRadius: 20,
    },
});
