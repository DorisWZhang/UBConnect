// app/(tabs)/friends.tsx — Friends list, requests, and user search
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
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

type Tab = 'friends' | 'requests' | 'search';

interface PopulatedFriendRequest extends FriendRequest {
    _type: 'incoming' | 'outgoing';
    displayName?: string;
}

interface PopulatedFriendEdge extends FriendEdge {
    displayName?: string;
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

    const loadFriends = useCallback(async () => {
        if (!user) return;
        setFriendsLoading(true);
        try {
            const result = await listFriends(user.uid);
            const populated = await Promise.all(
                result.map(async (f) => {
                    try {
                        const prof = await fetchUserProfile(f.friendUid);
                        return { ...f, displayName: prof?.displayName };
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

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, [loadFriends, loadRequests]);

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
        try {
            // sendFriendRequest now creates the notification internally
            await sendFriendRequest(user.uid, targetUid, user.displayName || undefined);
            Alert.alert('Sent!', 'Friend request sent.');
            loadRequests();
        } catch (err: any) {
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
                    <ActivityIndicator size="large" color="#866FD8" style={{ marginTop: 40 }} />
                ) : friends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color="#ccc" />
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
                                    <Text style={styles.listAvatarText}>
                                        {(item.displayName || item.friendUid).charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.listName}>{item.displayName || item.friendUid}</Text>
                                <TouchableOpacity
                                    onPress={() => handleRemoveFriend(item.friendUid)}
                                    style={styles.removeBtn}
                                >
                                    <Ionicons name="close-circle-outline" size={22} color="#e65100" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    />
                )
            )}

            {/* Requests Tab */}
            {tab === 'requests' && (
                requestsLoading ? (
                    <ActivityIndicator size="large" color="#866FD8" style={{ marginTop: 40 }} />
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
                                        {item.displayName || (item._type === 'incoming' ? item.fromUid : item.toUid)}
                                    </Text>
                                    <Text style={styles.requestType}>
                                        {item._type === 'incoming' ? 'Incoming request' : 'Sent request'}
                                    </Text>
                                </View>
                                {item._type === 'incoming' ? (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                                            onPress={() => handleAccept(item)}
                                        >
                                            <Text style={styles.actionBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: '#e65100' }]}
                                            onPress={() => handleReject(item)}
                                        >
                                            <Text style={styles.actionBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
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
                        placeholderTextColor="#aaa"
                        autoCapitalize="none"
                    />
                    {searchLoading && <ActivityIndicator size="small" color="#866FD8" />}
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.uid}
                        ListEmptyComponent={
                            searchQuery.length >= 2 && !searchLoading ? (
                                <Text style={styles.emptyText}>No users found</Text>
                            ) : null
                        }
                        renderItem={({ item }) => {
                            const isFriend = friends.some((f) => f.friendUid === item.uid);
                            const hasOutgoing = outgoing.some((r) => r.toUid === item.uid);
                            const hasIncoming = incoming.some((r) => r.fromUid === item.uid);

                            return (
                                <TouchableOpacity
                                    style={styles.listItem}
                                    onPress={() => router.push(`/profile/${item.uid}`)}
                                >
                                    <View style={styles.listAvatar}>
                                        <Text style={styles.listAvatarText}>
                                            {item.displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.listName}>{item.displayName}</Text>
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={() => handleAddFriend(item.uid)}
                                        disabled={isFriend || hasOutgoing}
                                    >
                                        {isFriend ? (
                                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                        ) : hasOutgoing ? (
                                            <Ionicons name="time-outline" size={24} color="#866FD8" />
                                        ) : hasIncoming ? (
                                            <Ionicons name="arrow-undo-circle" size={24} color="#FF9800" />
                                        ) : (
                                            <Ionicons name="person-add-outline" size={20} color="#866FD8" />
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
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
    pageTitle: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
    tabItem: {
        flex: 1, alignItems: 'center', paddingVertical: 8,
        borderBottomWidth: 2, borderBottomColor: '#eee',
    },
    tabItemActive: { borderBottomColor: '#866FD8' },
    tabText: { fontSize: 14, color: '#999' },
    tabTextActive: { color: '#866FD8', fontWeight: '600' },
    listItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    listAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#866FD8',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    listAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    listName: { flex: 1, fontSize: 16, color: '#333' },
    removeBtn: { padding: 4 },
    addBtn: { padding: 4 },
    requestItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    requestType: { fontSize: 12, color: '#999', marginTop: 2 },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    searchInput: {
        marginHorizontal: 16, backgroundColor: '#f5f5f5', borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginBottom: 12,
    },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#999', fontSize: 15, marginTop: 12, textAlign: 'center' },
});
