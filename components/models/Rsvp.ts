// Rsvp model — Firestore "connectEvents/{eventId}/rsvps/{uid}" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export type RsvpStatus = 'going' | 'interested';

export interface Rsvp {
    id: string;                    // doc ID = uid
    userId: string;                // duplicate of uid for collectionGroup queries
    status: RsvpStatus;
    createdAt: Date;
}

const VALID_STATUSES: RsvpStatus[] = ['going', 'interested'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateRsvp(
    data: Partial<Rsvp>,
): ValidationResult {
    const errors: string[] = [];

    if (!data.status || !VALID_STATUSES.includes(data.status)) {
        errors.push('status must be one of: going, interested');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------
export function rsvpFromFirestoreDoc(
    id: string,
    data: Record<string, any> | undefined,
): Rsvp | null {
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

    const status = VALID_STATUSES.includes(data.status) ? data.status : 'going';

    return {
        id,
        userId: typeof data.userId === 'string' ? data.userId : id,
        status,
        createdAt: toDate(data.createdAt) ?? new Date(),
    };
}
