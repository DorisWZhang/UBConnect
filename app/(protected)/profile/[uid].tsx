// app/profile/[uid].tsx — View any user's profile
import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image,
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
    getMutualFriends, MutualFriend,
} from '@/src/services/social';
import { createNotification } from '@/src/services/notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAvatarSource } from '@/src/utils/avatarMap';
import InlineNotice from '@/components/InlineNotice';
import MutualFriendsModal from '@/components/MutualFriendsModal';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

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
    const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
    const [mutualModalVisible, setMutualModalVisible] = useState(false);

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

            try {
                if (user && !isSelf) {
                    const mutual = await getMutualFriends(user.uid, uid);
                    setMutualFriends(mutual);
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

    const mutualFriendsText = () => {
        if (mutualFriends.length === 0) return '';
        const names = mutualFriends.map((f) => f.displayName);
        if (names.length === 1) return `Friends with ${names[0]}`;
        if (names.length === 2) return `Friends with ${names[0]} and ${names[1]}`;
        return `Friends with ${names[0]}, ${names[1]}, and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`;
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText style={{ color: colors.textMuted }}>Profile not found</ThemedText>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ThemedText style={{ color: colors.text }}>Go Back</ThemedText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Profile</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        {getAvatarSource(profile.photoURL) ? (
                            <Image source={getAvatarSource(profile.photoURL)!} style={styles.avatarImage} />
                        ) : (
                            <ThemedText style={styles.avatarText}>
                                {profile.displayName.charAt(0).toUpperCase()}
                            </ThemedText>
                        )}
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
                    {!isSelf && mutualFriends.length > 0 && (
                        <TouchableOpacity
                            style={styles.mutualRow}
                            onPress={() => setMutualModalVisible(true)}
                        >
                            <Ionicons name="people-outline" size={14} color={colors.accent} />
                            <ThemedText style={styles.mutualText}>{mutualFriendsText()}</ThemedText>
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
            <MutualFriendsModal
                visible={mutualModalVisible}
                friends={mutualFriends}
                onClose={() => setMutualModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingTop: 60,
        paddingHorizontal: spacing.base, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        fontSize: fontSizes.lg, fontFamily: fonts.heading,
        color: colors.text, marginLeft: spacing.md,
    },
    scrollContent: { padding: spacing.base, paddingBottom: 40 },
    avatarContainer: { alignItems: 'center', marginBottom: spacing.lg },
    avatar: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    avatarText: { color: colors.text, fontSize: 36, fontFamily: fonts.display },
    avatarImage: { width: 90, height: 90, borderRadius: 45 },
    displayName: {
        fontSize: fontSizes.xl, fontFamily: fonts.heading, color: colors.text,
    },
    bio: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg,
        fontFamily: fonts.body,
    },
    editButton: {
        marginTop: spacing.md, backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    editButtonText: { color: colors.text, fontFamily: fonts.bodySemiBold },
    friendButton: {
        marginTop: spacing.md, backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    friendsBtn: { backgroundColor: colors.success },
    pendingBtn: { backgroundColor: colors.warning },
    friendButtonText: { color: colors.text, fontFamily: fonts.bodySemiBold },
    section: { marginBottom: spacing.lg },
    sectionTitle: {
        fontSize: fontSizes.lg, fontFamily: fonts.heading,
        color: colors.text, marginBottom: 10,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
        backgroundColor: colors.primaryGlow, borderRadius: radius.lg,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        marginRight: spacing.sm, marginBottom: spacing.sm,
    },
    chipText: { fontSize: fontSizes.sm, color: colors.primaryLight, fontFamily: fonts.bodyMedium },
    eventCard: {
        backgroundColor: colors.surface, borderRadius: radius.md,
        padding: 14, marginBottom: spacing.sm,
    },
    eventCardTitle: {
        fontSize: fontSizes.base, fontFamily: fonts.bodySemiBold, color: colors.text,
    },
    eventCardSub: {
        fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs,
        fontFamily: fonts.body,
    },
    emptyText: {
        fontSize: fontSizes.sm, color: colors.textMuted,
        fontStyle: 'italic', fontFamily: fonts.body,
    },
    backBtn: {
        marginTop: spacing.base, backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl, paddingVertical: 10,
        borderRadius: radius.full,
    },
    mutualRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6,
    },
    mutualText: { fontSize: fontSizes.sm, color: colors.accent, fontFamily: fonts.bodyMedium },
});
