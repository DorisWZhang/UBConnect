// app/event/[eventId].tsx — Event detail with threaded comments and RSVP
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/src/auth/AuthContext';
import { Comment as EventComment } from '@/components/models/Comment';
import {
    fetchEventById, fetchTopLevelComments, fetchReplies,
    addEventComment, rsvpToEvent, removeRsvp,
    fetchRsvpStatus, fetchRsvpCount, isPermissionDenied, deleteEvent
} from '@/src/services/social';
import { createNotification } from '@/src/services/notifications';
import { ConnectEvent } from '@/components/models/ConnectEvent';
import { logFirestoreError } from '@/src/telemetry';
import InlineNotice from '@/components/InlineNotice';

export default function EventDetailScreen() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [event, setEvent] = useState<ConnectEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Comments
    const [comments, setComments] = useState<EventComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Replies per root comment
    const [repliesByRoot, setRepliesByRoot] = useState<Record<string, EventComment[]>>({});
    const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; rootId: string; uid: string; name?: string } | null>(null);

    // RSVP
    const [rsvpStatus, setRsvpStatus] = useState<'going' | 'interested' | null>(null);
    const [rsvpCount, setRsvpCount] = useState(0);

    const loadEvent = useCallback(async () => {
        if (!eventId) return;
        try {
            const e = await fetchEventById(eventId);
            setEvent(e);
        } catch (err) {
            if (isPermissionDenied(err)) {
                setError('You don\'t have permission to view this event.');
            } else {
                setError('Failed to load event.');
            }
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    const loadComments = useCallback(async () => {
        if (!eventId) return;
        setLoadingComments(true);
        try {
            const result = await fetchTopLevelComments(eventId, { pageSize: 20 });
            setComments(result.comments);
        } catch (err) {
            await logFirestoreError(err, { screen: 'event', operation: 'loadComments' });
        } finally {
            setLoadingComments(false);
        }
    }, [eventId]);

    const loadRsvpInfo = useCallback(async () => {
        if (!eventId || !user) return;
        try {
            const [count, status] = await Promise.all([
                fetchRsvpCount(eventId),
                fetchRsvpStatus(eventId, user.uid),
            ]);
            setRsvpCount(count);
            setRsvpStatus(status);
        } catch { }
    }, [eventId, user]);

    useEffect(() => {
        loadEvent();
        loadComments();
        loadRsvpInfo();
    }, [loadEvent, loadComments, loadRsvpInfo]);

    const handleRsvp = async (status: 'going' | 'interested') => {
        if (!user || !eventId) return;
        try {
            if (rsvpStatus === status) {
                await removeRsvp(eventId, user.uid);
                setRsvpStatus(null);
                setRsvpCount((p) => Math.max(0, p - 1));
            } else {
                const wasAttending = rsvpStatus != null;
                await rsvpToEvent(eventId, user.uid, status);
                setRsvpStatus(status);
                if (!wasAttending) setRsvpCount((p) => p + 1);
            }
        } catch (err) {
            if (isPermissionDenied(err)) {
                Alert.alert('Permission Denied', 'Please verify your email to RSVP.');
            } else {
                Alert.alert('Error', 'Failed to update RSVP.');
            }
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !user || !eventId) return;
        try {
            let newComment: EventComment;
            if (replyingTo) {
                newComment = await addEventComment(
                    eventId, commentText.trim(), user.uid, user.displayName || undefined,
                    { parentId: replyingTo.commentId, rootId: replyingTo.rootId, replyToUid: replyingTo.uid },
                );
                // Add to replies
                setRepliesByRoot((prev) => ({
                    ...prev,
                    [replyingTo.rootId]: [...(prev[replyingTo.rootId] || []), newComment],
                }));
                // Expand the root
                setExpandedRoots((prev) => new Set(prev).add(replyingTo.rootId));
                // Create reply notification
                await createNotification({
                    type: 'reply',
                    actorUid: user.uid,
                    actorName: user.displayName || undefined,
                    targetUid: replyingTo.uid,
                    eventId,
                    commentId: newComment.id,
                    rootCommentId: replyingTo.rootId,
                });
            } else {
                newComment = await addEventComment(
                    eventId, commentText.trim(), user.uid, user.displayName || undefined,
                );
                setComments((prev) => [newComment, ...prev]);
                // Create comment notification to event owner
                if (event && event.createdBy !== user.uid) {
                    await createNotification({
                        type: 'comment',
                        actorUid: user.uid,
                        actorName: user.displayName || undefined,
                        targetUid: event.createdBy,
                        eventId,
                        commentId: newComment.id,
                    });
                }
            }
            setCommentText('');
            setReplyingTo(null);
        } catch (err) {
            if (isPermissionDenied(err)) {
                Alert.alert('Permission Denied', 'You need to verify your email to comment.');
            } else {
                Alert.alert('Error', 'Failed to add comment.');
            }
        }
    };

    const loadReplies = async (rootId: string) => {
        if (!eventId) return;
        if (expandedRoots.has(rootId)) {
            setExpandedRoots((prev) => { const s = new Set(prev); s.delete(rootId); return s; });
            return;
        }
        try {
            const result = await fetchReplies(eventId, rootId, { pageSize: 20 });
            setRepliesByRoot((prev) => ({ ...prev, [rootId]: result.comments }));
            setExpandedRoots((prev) => new Set(prev).add(rootId));
        } catch { }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#866FD8" />
            </View>
        );
    }

    if (error || !event) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }]}>
                <View style={{ width: '100%', marginBottom: 16 }}>
                    <InlineNotice message={error || 'Event not found'} type="error" />
                </View>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Event Info */}
                <Text style={styles.eventTitle}>{event.title}</Text>

                {event.categoryId ? (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{event.categoryId}</Text>
                    </View>
                ) : null}

                {user && event.createdBy === user.uid && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                            Alert.alert(
                                'Delete Event',
                                'Are you sure you want to delete this event? This action cannot be undone.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete', style: 'destructive', onPress: async () => {
                                            try {
                                                await deleteEvent(eventId, user.uid);
                                                router.back();
                                            } catch (err) {
                                                Alert.alert('Error', 'Failed to delete event.');
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text style={styles.deleteButtonText}>Delete Event</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.eventDescription}>{event.description}</Text>

                {event.startTime && (
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {formatDate(event.startTime)}{event.endTime ? ` — ${formatDate(event.endTime)}` : ''}
                        </Text>
                    </View>
                )}

                {event.locationName ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{event.locationName}</Text>
                    </View>
                ) : null}

                {/* Host */}
                {event.createdBy ? (
                    <TouchableOpacity
                        style={styles.hostRow}
                        onPress={() => router.push(`/profile/${event.createdBy}`)}
                    >
                        <View style={styles.hostAvatar}>
                            <Text style={styles.hostInitial}>
                                {event.createdBy.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.hostText}>View Host Profile</Text>
                        <Ionicons name="chevron-forward" size={16} color="#866FD8" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.hostRow}>
                        <View style={[styles.hostAvatar, { backgroundColor: '#ccc' }]}>
                            <Ionicons name="person-outline" size={18} color="#fff" />
                        </View>
                        <Text style={[styles.hostText, { color: '#999' }]}>Host info unavailable</Text>
                    </View>
                )}

                {/* RSVP */}
                <View style={styles.rsvpRow}>
                    <TouchableOpacity
                        style={[styles.rsvpButton, rsvpStatus === 'going' && styles.rsvpActive]}
                        onPress={() => handleRsvp('going')}
                    >
                        <Ionicons name="checkmark-circle" size={18} color={rsvpStatus === 'going' ? '#fff' : '#866FD8'} />
                        <Text style={[styles.rsvpText, rsvpStatus === 'going' && styles.rsvpTextActive]}>Going</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rsvpButton, rsvpStatus === 'interested' && styles.rsvpActiveAlt]}
                        onPress={() => handleRsvp('interested')}
                    >
                        <Ionicons name="star" size={18} color={rsvpStatus === 'interested' ? '#fff' : '#FF9800'} />
                        <Text style={[styles.rsvpText, rsvpStatus === 'interested' && styles.rsvpTextActive]}>Interested</Text>
                    </TouchableOpacity>
                </View>
                {rsvpCount > 0 && (
                    <Text style={styles.attendeeCount}>{rsvpCount} attendee{rsvpCount !== 1 ? 's' : ''}</Text>
                )}

                {/* Comments Section */}
                <Text style={styles.sectionTitle}>Comments</Text>

                {/* Reply indicator */}
                {replyingTo && (
                    <View style={styles.replyIndicator}>
                        <Text style={styles.replyIndicatorText}>
                            Replying to {replyingTo.name || 'user'}
                        </Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Comment Input */}
                <View style={styles.commentInputRow}>
                    <TextInput
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                        placeholderTextColor="#aaa"
                        maxLength={500}
                    />
                    <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {loadingComments && <ActivityIndicator size="small" color="#866FD8" style={{ marginVertical: 10 }} />}

                {comments.map((c) => (
                    <View key={c.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                            <Text style={styles.commentAuthor}>{c.createdByName || 'User'}</Text>
                            <Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentBody}>{c.text}</Text>
                        <TouchableOpacity
                            onPress={() => setReplyingTo({
                                commentId: c.id, rootId: c.id, uid: c.createdBy, name: c.createdByName,
                            })}
                            style={styles.replyButton}
                        >
                            <Ionicons name="chatbubble-outline" size={14} color="#866FD8" />
                            <Text style={styles.replyButtonText}>Reply</Text>
                        </TouchableOpacity>

                        {/* Show/hide replies */}
                        <TouchableOpacity onPress={() => loadReplies(c.id)} style={styles.showRepliesButton}>
                            <Text style={styles.showRepliesText}>
                                {expandedRoots.has(c.id) ? 'Hide replies' : 'Show replies'}
                            </Text>
                        </TouchableOpacity>

                        {/* Replies */}
                        {expandedRoots.has(c.id) && (repliesByRoot[c.id] || []).map((r) => (
                            <View key={r.id} style={styles.replyCard}>
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentAuthor}>{r.createdByName || 'User'}</Text>
                                    <Text style={styles.commentDate}>{formatDate(r.createdAt)}</Text>
                                </View>
                                <Text style={styles.commentBody}>{r.text}</Text>
                                <TouchableOpacity
                                    onPress={() => setReplyingTo({
                                        commentId: r.id, rootId: c.id, uid: r.createdBy, name: r.createdByName,
                                    })}
                                    style={styles.replyButton}
                                >
                                    <Ionicons name="chatbubble-outline" size={14} color="#866FD8" />
                                    <Text style={styles.replyButtonText}>Reply</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ))}

                {!loadingComments && comments.length === 0 && (
                    <Text style={styles.emptyText}>No comments yet — be the first!</Text>
                )}
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
    headerBack: { marginRight: 12, padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#333', flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    eventTitle: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
    eventDescription: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 12 },
    categoryBadge: {
        backgroundColor: '#866FD8', borderRadius: 12, paddingHorizontal: 10,
        paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
    },
    categoryBadgeText: { color: '#fff', fontSize: 12 },
    deleteButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        alignSelf: 'flex-start', marginBottom: 16,
    },
    deleteButtonText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginLeft: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { fontSize: 14, color: '#666', marginLeft: 6 },
    hostRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        marginVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee',
    },
    hostAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#866FD8',
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    hostInitial: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    hostText: { flex: 1, fontSize: 15, color: '#866FD8', fontWeight: '500' },
    rsvpRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
    rsvpButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#866FD8',
    },
    rsvpActive: { backgroundColor: '#866FD8', borderColor: '#866FD8' },
    rsvpActiveAlt: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
    rsvpText: { marginLeft: 6, fontSize: 15, fontWeight: '600', color: '#866FD8' },
    rsvpTextActive: { color: '#fff' },
    attendeeCount: { fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 12 },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    commentInput: {
        flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    },
    sendButton: {
        marginLeft: 8, backgroundColor: '#866FD8', borderRadius: 20,
        padding: 10, alignItems: 'center', justifyContent: 'center',
    },
    commentCard: {
        backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12,
        marginBottom: 10,
    },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentAuthor: { fontSize: 14, fontWeight: '600', color: '#333' },
    commentDate: { fontSize: 11, color: '#999' },
    commentBody: { fontSize: 14, color: '#444', lineHeight: 20 },
    replyButton: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    replyButtonText: { fontSize: 13, color: '#866FD8', marginLeft: 4 },
    showRepliesButton: { marginTop: 6 },
    showRepliesText: { fontSize: 13, color: '#666' },
    replyCard: {
        backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10,
        marginTop: 8, marginLeft: 20,
    },
    replyIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#e8e0ff', borderRadius: 8, padding: 8, marginBottom: 8,
    },
    replyIndicatorText: { fontSize: 13, color: '#866FD8', fontWeight: '500' },
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
    backButton: {
        marginTop: 16, backgroundColor: '#866FD8', paddingHorizontal: 24,
        paddingVertical: 10, borderRadius: 20,
    },
    backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
