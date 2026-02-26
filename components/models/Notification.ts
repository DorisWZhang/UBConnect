// Notification model — Firestore "users/{uid}/notifications/{notificationId}" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export type NotificationType = 'friend_request' | 'event_live' | 'comment' | 'reply';

export interface Notification {
    id: string;
    type: NotificationType;
    actorUid: string;              // who triggered
    actorName?: string;            // display name snapshot
    targetUid: string;             // recipient
    eventId?: string;              // associated event
    commentId?: string;            // associated comment
    rootCommentId?: string;        // root comment for deep-linking
    createdAt: Date;
    readAt?: Date | null;
}

const VALID_TYPES: NotificationType[] = ['friend_request', 'event_live', 'comment', 'reply'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateNotification(
    data: Partial<Notification>,
): ValidationResult {
    const errors: string[] = [];

    if (!data.type || !VALID_TYPES.includes(data.type)) {
        errors.push('type must be one of: friend_request, event_live, comment, reply');
    }
    if (!data.actorUid || typeof data.actorUid !== 'string') {
        errors.push('actorUid is required');
    }
    if (!data.targetUid || typeof data.targetUid !== 'string') {
        errors.push('targetUid is required');
    }
    if (data.actorUid && data.targetUid && data.actorUid === data.targetUid) {
        errors.push('cannot notify yourself');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------
export function notificationFromFirestoreDoc(
    id: string,
    data: Record<string, any> | undefined,
): Notification | null {
    if (!data) return null;

    const toDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Timestamp) return val.toDate();
        if (val instanceof Date) return val;
        if (typeof val === 'string' || typeof val === 'number') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        }
        if (val && typeof val.seconds === 'number') {
            return new Date(val.seconds * 1000);
        }
        return null;
    };

    const type = VALID_TYPES.includes(data.type) ? data.type : 'comment';

    return {
        id,
        type,
        actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
        actorName: typeof data.actorName === 'string' ? data.actorName : undefined,
        targetUid: typeof data.targetUid === 'string' ? data.targetUid : '',
        eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
        commentId: typeof data.commentId === 'string' ? data.commentId : undefined,
        rootCommentId: typeof data.rootCommentId === 'string' ? data.rootCommentId : undefined,
        createdAt: toDate(data.createdAt) ?? new Date(),
        readAt: toDate(data.readAt) ?? null,
    };
}
