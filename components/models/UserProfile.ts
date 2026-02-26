// UserProfile model — Firestore "users/{uid}" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export interface UserProfile {
    uid: string;
    displayName: string;         // required, 1–50 chars
    displayNameLower: string;    // lowercase for search
    photoURL?: string;
    bio?: string;                // optional, 0–280 chars
    program?: string;
    year?: string;
    interests?: string[];
    createdAt: Date;
    lastActiveAt?: Date;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateUserProfile(
    data: Partial<UserProfile>,
): ValidationResult {
    const errors: string[] = [];

    if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
        errors.push('displayName is required');
    } else if (data.displayName.trim().length > 50) {
        errors.push('displayName must be 50 characters or fewer');
    }

    if (data.bio !== undefined && data.bio !== null) {
        if (typeof data.bio !== 'string') {
            errors.push('bio must be a string');
        } else if (data.bio.length > 280) {
            errors.push('bio must be 280 characters or fewer');
        }
    }

    if (data.interests !== undefined && data.interests !== null) {
        if (!Array.isArray(data.interests)) {
            errors.push('interests must be an array');
        }
    }

    return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------
export function userProfileFromFirestoreDoc(
    uid: string,
    data: Record<string, any> | undefined,
): UserProfile | null {
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

    const displayName = typeof data.displayName === 'string' ? data.displayName : '';

    return {
        uid,
        displayName,
        displayNameLower: typeof data.displayNameLower === 'string'
            ? data.displayNameLower
            : displayName.toLowerCase(),
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
        bio: typeof data.bio === 'string' ? data.bio : undefined,
        program: typeof data.program === 'string' ? data.program : undefined,
        year: typeof data.year === 'string' ? data.year : undefined,
        interests: Array.isArray(data.interests) ? data.interests : undefined,
        createdAt: toDate(data.createdAt) ?? new Date(),
        lastActiveAt: toDate(data.lastActiveAt) ?? undefined,
    };
}
