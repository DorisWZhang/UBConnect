// Notification service — Firestore CRUD for users/{uid}/notifications
import {
    doc,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    collection,
    query,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Notification, notificationFromFirestoreDoc } from '@/components/models/Notification';
import { logFirestoreError, logEvent } from '@/src/telemetry';

// ================================================================
// Create notifications
// ================================================================

export async function createNotification(data: {
    type: 'friend_request' | 'event_live' | 'comment' | 'reply';
    actorUid: string;
    actorName?: string;
    targetUid: string;
    eventId?: string;
    commentId?: string;
    rootCommentId?: string;
}): Promise<void> {
    // Don't notify yourself
    if (data.actorUid === data.targetUid) return;

    const ref = collection(db, 'users', data.targetUid, 'notifications');
    try {
        // Only include fields that are defined to match rules hasOnly constraint
        const notifDoc: Record<string, any> = {
            type: data.type,
            actorUid: data.actorUid,
            targetUid: data.targetUid,
            createdAt: serverTimestamp(),
            readAt: null,
        };
        if (data.actorName) notifDoc.actorName = data.actorName;
        if (data.eventId) notifDoc.eventId = data.eventId;
        if (data.commentId) notifDoc.commentId = data.commentId;
        if (data.rootCommentId) notifDoc.rootCommentId = data.rootCommentId;

        await addDoc(ref, notifDoc);
        await logEvent('notification_created', { type: data.type, targetUid: data.targetUid });
    } catch (error) {
        await logFirestoreError(error, {
            screen: 'notifications',
            operation: 'createNotification',
            uid: data.actorUid,
        });
        // Non-critical — don't rethrow
    }
}

// ================================================================
// Fetch notifications (paginated)
// ================================================================

export interface NotificationsResult {
    notifications: Notification[];
    lastDoc: QueryDocumentSnapshot | null;
}

export async function fetchNotifications(
    uid: string,
    options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {},
): Promise<NotificationsResult> {
    const { pageSize = 20, cursor = null } = options;
    try {
        const ref = collection(db, 'users', uid, 'notifications');
        const constraints: any[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);

        const notifications: Notification[] = [];
        snap.docs.forEach((d) => {
            const n = notificationFromFirestoreDoc(d.id, d.data());
            if (n) notifications.push(n);
        });

        return {
            notifications,
            lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
    } catch (error) {
        await logFirestoreError(error, {
            screen: 'notifications',
            operation: 'fetchNotifications',
            uid,
        });
        throw error;
    }
}

// ================================================================
// Mark notification read
// ================================================================

export async function markNotificationRead(
    uid: string,
    notificationId: string,
): Promise<void> {
    const ref = doc(db, 'users', uid, 'notifications', notificationId);
    try {
        await updateDoc(ref, { readAt: serverTimestamp() });
    } catch (error) {
        await logFirestoreError(error, {
            screen: 'notifications',
            operation: 'markNotificationRead',
            uid,
        });
        // Non-critical
    }
}

// ================================================================
// Delete notifications
// ================================================================

export async function deleteNotifications(
    uid: string,
    notificationIds: string[],
): Promise<void> {
    try {
        await Promise.all(
            notificationIds.map((id) => deleteDoc(doc(db, 'users', uid, 'notifications', id)))
        );
    } catch (error) {
        await logFirestoreError(error, {
            screen: 'notifications',
            operation: 'deleteNotifications',
            uid,
        });
        throw error;
    }
}
