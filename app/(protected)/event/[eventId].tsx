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
import { colors, fonts, fontSizes, spacing, radius } from '@/src/theme';

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
                <ActivityIndicator size="large" color={colors.primary} />
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
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
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
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.deleteButtonText}>Delete Event</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.eventDescription}>{event.description}</Text>

                {event.startTime && (
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.infoText}>
                            {formatDate(event.startTime)}{event.endTime ? ` — ${formatDate(event.endTime)}` : ''}
                        </Text>
                    </View>
                )}

                {event.locationName ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
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
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.hostRow}>
                        <View style={[styles.hostAvatar, { backgroundColor: colors.textMuted }]}>
                            <Ionicons name="person-outline" size={18} color={colors.text} />
                        </View>
                        <Text style={[styles.hostText, { color: colors.textMuted }]}>Host info unavailable</Text>
                    </View>
                )}

                {/* RSVP */}
                <View style={styles.rsvpRow}>
                    <TouchableOpacity
                        style={[styles.rsvpButton, rsvpStatus === 'going' && styles.rsvpActive]}
                        onPress={() => handleRsvp('going')}
                    >
                        <Ionicons name="checkmark-circle" size={18} color={rsvpStatus === 'going' ? colors.text : colors.primary} />
                        <Text style={[styles.rsvpText, rsvpStatus === 'going' && styles.rsvpTextActive]}>Going</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rsvpButton, rsvpStatus === 'interested' && styles.rsvpActiveAlt]}
                        onPress={() => handleRsvp('interested')}
                    >
                        <Ionicons name="star" size={18} color={rsvpStatus === 'interested' ? colors.text : colors.primary} />
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
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
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
                        placeholderTextColor={colors.textMuted}
                        maxLength={500}
                    />
                    <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                        <Ionicons name="send" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {loadingComments && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />}

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
                            <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
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
                                    <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
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
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingTop: 60,
        paddingHorizontal: spacing.base, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerBack: { marginRight: spacing.md, padding: 4 },
    headerTitle: {
        fontSize: fontSizes.lg, fontFamily: fonts.heading,
        color: colors.text, flex: 1,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.base, paddingBottom: 40 },
    eventTitle: {
        fontSize: fontSizes.xl, fontFamily: fonts.display,
        color: colors.text, marginBottom: spacing.sm,
    },
    eventDescription: {
        fontSize: fontSizes.md, color: colors.textSecondary,
        lineHeight: 22, marginBottom: spacing.md, fontFamily: fonts.body,
    },
    categoryBadge: {
        backgroundColor: colors.primaryGlow, borderRadius: radius.md,
        paddingHorizontal: 10, paddingVertical: 3,
        alignSelf: 'flex-start', marginBottom: 10,
    },
    categoryBadgeText: {
        color: colors.primary, fontSize: fontSizes.xs, fontFamily: fonts.bodySemiBold,
    },
    deleteButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerGlow,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: radius.lg, alignSelf: 'flex-start', marginBottom: spacing.base,
    },
    deleteButtonText: {
        color: colors.danger, fontSize: fontSizes.sm,
        fontFamily: fonts.bodySemiBold, marginLeft: spacing.xs,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    infoText: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        marginLeft: spacing.sm, fontFamily: fonts.body,
    },
    hostRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
        marginVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: colors.border,
    },
    hostAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    hostInitial: { color: colors.text, fontSize: fontSizes.base, fontFamily: fonts.display },
    hostText: {
        flex: 1, fontSize: fontSizes.md, color: colors.primary,
        fontFamily: fonts.bodyMedium,
    },
    rsvpRow: { flexDirection: 'row', marginTop: spacing.md, gap: 10 },
    rsvpButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5,
        borderColor: colors.glassBorder,
    },
    rsvpActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    rsvpActiveAlt: { backgroundColor: colors.primary, borderColor: colors.primary },
    rsvpText: {
        marginLeft: 6, fontSize: fontSizes.md, fontFamily: fonts.bodySemiBold,
        color: colors.textSecondary,
    },
    rsvpTextActive: { color: colors.text },
    attendeeCount: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        marginTop: spacing.sm, textAlign: 'center', fontFamily: fonts.body,
    },
    sectionTitle: {
        fontSize: fontSizes.lg, fontFamily: fonts.heading,
        color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md,
    },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base },
    commentInput: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radius.full,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: fontSizes.sm,
        color: colors.text, fontFamily: fonts.body,
        borderWidth: 1, borderColor: colors.glassBorder,
    },
    sendButton: {
        marginLeft: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.full,
        padding: 10, alignItems: 'center', justifyContent: 'center',
    },
    commentCard: {
        backgroundColor: colors.glass, borderRadius: radius.md,
        padding: spacing.md, marginBottom: 10,
        borderWidth: 1, borderColor: colors.glassBorder,
    },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentAuthor: {
        fontSize: fontSizes.sm, fontFamily: fonts.bodySemiBold, color: colors.text,
    },
    commentDate: { fontSize: fontSizes.xs, color: colors.textMuted, fontFamily: fonts.body },
    commentBody: {
        fontSize: fontSizes.sm, color: colors.textSecondary,
        lineHeight: 20, fontFamily: fonts.body,
    },
    replyButton: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    replyButtonText: {
        fontSize: fontSizes.sm, color: colors.primary,
        marginLeft: spacing.xs, fontFamily: fonts.bodyMedium,
    },
    showRepliesButton: { marginTop: spacing.sm },
    showRepliesText: {
        fontSize: fontSizes.sm, color: colors.textMuted, fontFamily: fonts.bodyMedium,
    },
    replyCard: {
        backgroundColor: colors.surfaceLight, borderRadius: radius.sm,
        padding: 10, marginTop: spacing.sm, marginLeft: spacing.lg,
    },
    replyIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.primaryGlow, borderRadius: radius.sm,
        padding: spacing.sm, marginBottom: spacing.sm,
    },
    replyIndicatorText: {
        fontSize: fontSizes.sm, color: colors.primary, fontFamily: fonts.bodyMedium,
    },
    emptyText: {
        fontSize: fontSizes.sm, color: colors.textMuted,
        textAlign: 'center', marginTop: spacing.lg, fontFamily: fonts.body,
    },
    backButton: {
        marginTop: spacing.base, backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl, paddingVertical: 10,
        borderRadius: radius.full,
    },
    backButtonText: {
        color: colors.text, fontSize: fontSizes.base, fontFamily: fonts.bodySemiBold,
    },
});
