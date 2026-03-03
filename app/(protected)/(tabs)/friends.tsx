// app/(tabs)/friends.tsx — Friends list, requests, and user search
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, Image, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, Alert,
} from 'react-native';
import { getAvatarSource } from '@/src/utils/avatarMap';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { UserProfile } from '@/components/models/UserProfile';
import { FriendRequest } from '@/components/models/FriendRequest';
import {
    listFriends, FriendEdge, fetchIncomingRequests, fetchOutgoingRequests,
    acceptFriendRequest, rejectFriendRequest, cancelFriendRequest,
    searchUsers, sendFriendRequest, removeFriend, ensureFriendEdge,
    isPermissionDenied, fetchUserProfile,
} from '@/src/services/social';
import { captureException } from '@/src/telemetry';
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

type Tab = 'friends' | 'requests' | 'search';

interface PopulatedFriendRequest extends FriendRequest {
    _type: 'incoming' | 'outgoing';
    displayName?: string;
}

interface PopulatedFriendEdge extends FriendEdge {
    displayName?: string;
    photoURL?: string;
}

export default function FriendsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('friends');

    // Friends
    const [friends, setFriends] = useState<PopulatedFriendEdge[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);

    // Requests
    const [incoming, setIncoming] = useState<PopulatedFriendRequest[]>([]);
    const [outgoing, setOutgoing] = useState<PopulatedFriendRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchMutualCounts, setSearchMutualCounts] = useState<Record<string, number>>({});

    const loadFriends = useCallback(async () => {
        if (!user) return;
        setFriendsLoading(true);
        try {
            const result = await listFriends(user.uid);
            const populated = await Promise.all(
                result.map(async (f) => {
                    try {
                        const prof = await fetchUserProfile(f.friendUid);
                        return { ...f, displayName: prof?.displayName, photoURL: prof?.photoURL };
                    } catch (e) {
                        return f;
                    }
                })
            );
            setFriends(populated);
        } catch (err) {
            captureException(err, { flow: 'loadFriends' });
        } finally {
            setFriendsLoading(false);
        }
    }, [user]);

    const loadRequests = useCallback(async () => {
        if (!user) return;
        setRequestsLoading(true);
        try {
            const [inc, out] = await Promise.all([
                fetchIncomingRequests(user.uid),
                fetchOutgoingRequests(user.uid),
            ]);

            // Populate display names
            const populate = async (reqs: FriendRequest[], type: 'incoming' | 'outgoing') => {
                const populated: PopulatedFriendRequest[] = [];
                for (const r of reqs) {
                    const targetUid = type === 'incoming' ? r.fromUid : r.toUid;
                    try {
                        const prof = await fetchUserProfile(targetUid);
                        populated.push({ ...r, _type: type, displayName: prof?.displayName });
                    } catch (e) {
                        populated.push({ ...r, _type: type });
                    }
                }
                return populated;
            };

            const [incPop, outPop] = await Promise.all([
                populate(inc, 'incoming'),
                populate(out, 'outgoing')
            ]);

            setIncoming(incPop);
            setOutgoing(outPop);
        } catch (err) {
            captureException(err, { flow: 'loadRequests' });
        } finally {
            setRequestsLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadFriends();
            loadRequests();
        }, [loadFriends, loadRequests])
    );

    const handleAccept = async (req: FriendRequest) => {
        if (!user) return;
        try {
            await acceptFriendRequest(req.fromUid, req.toUid);
            // Ensure our edge
            await ensureFriendEdge(user.uid, req.fromUid);
            setIncoming((prev) => prev.filter((r) => r.id !== req.id));
            loadFriends();
        } catch (err) {
            Alert.alert('Error', 'Failed to accept request.');
        }
    };

    const handleReject = async (req: FriendRequest) => {
        try {
            await rejectFriendRequest(req.fromUid, req.toUid);
            setIncoming((prev) => prev.filter((r) => r.id !== req.id));
        } catch (err) {
            Alert.alert('Error', 'Failed to reject request.');
        }
    };

    const handleCancel = async (req: FriendRequest) => {
        try {
            await cancelFriendRequest(req.fromUid, req.toUid);
            setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
        } catch (err) {
            Alert.alert('Error', 'Failed to cancel request.');
        }
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await searchUsers(text.trim());
            // Filter out self
            setSearchResults(results.filter((u) => u.uid !== user?.uid));

            // Compute mutual friend counts for search results
            if (friends.length > 0) {
                const myFriendUids = new Set(friends.map((f) => f.friendUid));
                const counts: Record<string, number> = {};
                await Promise.all(
                    results.filter((u) => u.uid !== user?.uid).map(async (u) => {
                        try {
                            const theirFriends = await listFriends(u.uid);
                            counts[u.uid] = theirFriends.filter((f) => myFriendUids.has(f.friendUid)).length;
                        } catch { }
                    }),
                );
                setSearchMutualCounts(counts);
            }
        } catch (err) {
            if (isPermissionDenied(err)) {
                Alert.alert('Error', 'Please verify your email to search users.');
            } else {
                Alert.alert('Search Error', 'Failed to search users. Please try again.');
            }
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAddFriend = async (targetUid: string) => {
        if (!user) return;

        // Optimistically update the UI so the button changes to a 'sent' icon instantly
        setOutgoing((prev) => [
            ...prev,
            {
                id: `temp_${Date.now()}`,
                fromUid: user.uid,
                toUid: targetUid,
                status: 'pending',
                createdAt: new Date(),
                _type: 'outgoing'
            } as unknown as PopulatedFriendRequest,
        ]);

        try {
            // sendFriendRequest now creates the notification internally
            await sendFriendRequest(user.uid, targetUid, user.displayName || undefined);
            Alert.alert('Sent!', 'Friend request sent.');
            loadRequests();
        } catch (err: any) {
            // Revert optimistic update on failure
            setOutgoing((prev) => prev.filter(req => req.id !== `temp_${Date.now()}` && req.toUid !== targetUid));
            if (isPermissionDenied(err)) {
                Alert.alert('Permission Denied', 'Could not send request. This user may not exist, or a request may already exist.');
            } else {
                Alert.alert('Error', 'Failed to send request.');
            }
        }
    };

    const handleRemoveFriend = async (friendUid: string) => {
        if (!user) return;
        Alert.alert('Remove Friend', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await removeFriend(user.uid, friendUid);
                        setFriends((prev) => prev.filter((f) => f.friendUid !== friendUid));
                    } catch {
                        Alert.alert('Error', 'Failed to remove friend.');
                    }
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.pageTitle}>Friends</Text>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {(['friends', 'requests', 'search'] as Tab[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tabItem, tab === t && styles.tabItemActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'friends' ? `Friends (${friends.length})` : t === 'requests' ? `Requests (${incoming.length})` : 'Search'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Friends Tab */}
            {tab === 'friends' && (
                friendsLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : friends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No friends yet — search and connect!</Text>
                    </View>
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={(item) => item.friendUid}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.listItem}
                                onPress={() => router.push(`/profile/${item.friendUid}`)}
                            >
                                <View style={styles.listAvatar}>
                                    {getAvatarSource(item.photoURL) ? (
                                        <Image source={getAvatarSource(item.photoURL)!} style={styles.listAvatarImg} />
                                    ) : (
                                        <Text style={styles.listAvatarText}>
                                            {(item.displayName || 'Unknown User').charAt(0).toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.listName}>{item.displayName || 'Unknown User'}</Text>
                                <TouchableOpacity
                                    onPress={() => handleRemoveFriend(item.friendUid)}
                                    style={styles.removeBtn}
                                >
                                    <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    />
                )
            )}

            {/* Requests Tab */}
            {tab === 'requests' && (
                requestsLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={[...incoming, ...outgoing]}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No pending requests</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.requestItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listName}>
                                        {item.displayName || 'Unknown User'}
                                    </Text>
                                    <Text style={styles.requestType}>
                                        {item._type === 'incoming' ? 'Incoming request' : 'Sent request'}
                                    </Text>
                                </View>
                                {item._type === 'incoming' ? (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                                            onPress={() => handleAccept(item)}
                                        >
                                            <Text style={styles.actionBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                                            onPress={() => handleReject(item)}
                                        >
                                            <Text style={styles.actionBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                                        onPress={() => handleCancel(item)}
                                    >
                                        <Text style={styles.actionBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />
                )
            )}

            {/* Search Tab */}
            {tab === 'search' && (
                <View style={{ flex: 1 }}>
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Search by name..."
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                    />
                    {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.uid}
                        ListEmptyComponent={
                            searchQuery.length >= 2 && !searchLoading ? (
                                <Text style={styles.emptyText}>No users found</Text>
                            ) : null
                        }
                        renderItem={({ item }) => {
                            const isFriendFromList = friends.some((f) => f.friendUid === item.uid);
                            const hasAcceptedIncoming = incoming.some((r) => r.fromUid === item.uid && r.status === 'accepted');
                            const hasAcceptedOutgoing = outgoing.some((r) => r.toUid === item.uid && r.status === 'accepted');
                            const isFriend = isFriendFromList || hasAcceptedIncoming || hasAcceptedOutgoing;

                            const hasOutgoing = outgoing.some((r) => r.toUid === item.uid && r.status !== 'accepted');
                            const hasIncoming = incoming.some((r) => r.fromUid === item.uid && r.status !== 'accepted');

                            return (
                                <TouchableOpacity
                                    style={styles.listItem}
                                    onPress={() => router.push(`/profile/${item.uid}`)}
                                >
                                    <View style={styles.listAvatar}>
                                        {getAvatarSource(item.photoURL) ? (
                                            <Image source={getAvatarSource(item.photoURL)!} style={styles.listAvatarImg} />
                                        ) : (
                                            <Text style={styles.listAvatarText}>
                                                {item.displayName.charAt(0).toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.listName}>{item.displayName}</Text>
                                        {(searchMutualCounts[item.uid] ?? 0) > 0 && (
                                            <Text style={styles.mutualCount}>
                                                {searchMutualCounts[item.uid]} mutual
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={() => handleAddFriend(item.uid)}
                                        disabled={isFriend || hasOutgoing}
                                    >
                                        {isFriend ? (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                                        ) : hasOutgoing ? (
                                            <Ionicons name="time-outline" size={24} color={colors.primary} />
                                        ) : hasIncoming ? (
                                            <Ionicons name="arrow-undo-circle" size={24} color={colors.warning} />
                                        ) : (
                                            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        }}
                    />
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
    pageTitle: {
        fontSize: fontSizes.xxl,
        fontFamily: fonts.display,
        color: colors.text,
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        marginHorizontal: spacing.base,
        padding: spacing.xs,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.bodyMedium,
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.primary,
        fontFamily: fonts.bodySemiBold,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    listAvatar: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
    },
    listAvatarImg: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
    },
    listAvatarText: {
        color: colors.text,
        fontSize: fontSizes.lg,
        fontFamily: fonts.heading,
    },
    listName: {
        flex: 1,
        fontSize: fontSizes.base,
        fontFamily: fonts.bodyMedium,
        color: colors.text,
    },
    removeBtn: {
        padding: spacing.xs,
    },
    addBtn: {
        padding: spacing.xs,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    requestType: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.body,
        color: colors.textSecondary,
        marginTop: 2,
    },
    actionBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm - 2,
        borderRadius: radius.sm,
    },
    actionBtnText: {
        color: colors.text,
        fontSize: fontSizes.sm,
        fontFamily: fonts.bodySemiBold,
    },
    searchInput: {
        marginHorizontal: spacing.base,
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        paddingHorizontal: spacing.base,
        paddingVertical: 10,
        fontSize: fontSizes.md,
        fontFamily: fonts.body,
        color: colors.text,
        marginBottom: spacing.md,
    },
    mutualCount: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.bodyMedium,
        color: colors.accent,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: fontSizes.md,
        fontFamily: fonts.body,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});
