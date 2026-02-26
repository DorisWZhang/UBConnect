// Comment model — Firestore "connectEvents/{eventId}/comments/{commentId}" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export interface Comment {
    id: string;
    text: string;                  // 1–500 chars
    createdAt: Date;
    createdBy: string;             // uid
    createdByName?: string;        // display name snapshot

    // Threading fields
    parentId: string | null;       // null = top-level comment
    rootId: string;                // top-level comment id (self if top-level)
    replyToUid: string | null;     // uid of the user being replied to
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateComment(
    data: Partial<Comment>,
): ValidationResult {
    const errors: string[] = [];

    if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        errors.push('text is required');
    } else if (data.text.trim().length > 500) {
        errors.push('text must be 500 characters or fewer');
    }

    if (!data.createdBy || typeof data.createdBy !== 'string') {
        errors.push('createdBy is required');
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------
export function commentFromFirestoreDoc(
    id: string,
    data: Record<string, any> | undefined,
): Comment | null {
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

    return {
        id,
        text: typeof data.text === 'string' ? data.text : '',
        createdAt: toDate(data.createdAt) ?? new Date(),
        createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
        createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
        parentId: typeof data.parentId === 'string' ? data.parentId : null,
        rootId: typeof data.rootId === 'string' ? data.rootId : id,
        replyToUid: typeof data.replyToUid === 'string' ? data.replyToUid : null,
    };
}
