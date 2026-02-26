// FriendRequest model — Firestore "friendRequests/{fromUid}_{toUid}" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface FriendRequest {
    id: string;                    // doc ID = fromUid_toUid
    fromUid: string;
    toUid: string;
    status: FriendRequestStatus;
    createdAt: Date;
    respondedAt?: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function makeFriendRequestId(fromUid: string, toUid: string): string {
    return `${fromUid}_${toUid}`;
}

const VALID_STATUSES: FriendRequestStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateFriendRequest(
    data: Partial<FriendRequest>,
): ValidationResult {
    const errors: string[] = [];

    if (!data.fromUid || typeof data.fromUid !== 'string') {
        errors.push('fromUid is required');
    }
    if (!data.toUid || typeof data.toUid !== 'string') {
        errors.push('toUid is required');
    }
    if (data.fromUid && data.toUid && data.fromUid === data.toUid) {
        errors.push('cannot send friend request to yourself');
    }
    if (!data.status || !VALID_STATUSES.includes(data.status)) {
        errors.push('status must be one of: pending, accepted, rejected, cancelled');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------
export function friendRequestFromFirestoreDoc(
    id: string,
    data: Record<string, any> | undefined,
): FriendRequest | null {
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

    const status = VALID_STATUSES.includes(data.status) ? data.status : 'pending';

    return {
        id,
        fromUid: typeof data.fromUid === 'string' ? data.fromUid : '',
        toUid: typeof data.toUid === 'string' ? data.toUid : '',
        status,
        createdAt: toDate(data.createdAt) ?? new Date(),
        respondedAt: toDate(data.respondedAt) ?? undefined,
    };
}
