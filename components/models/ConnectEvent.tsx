// ConnectEvent model — single source of truth for the Firestore "connectEvents" schema
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export interface ConnectEvent {
  id: string;                                     // Firestore document id
  title: string;                                  // required
  description: string;                            // required
  location: string;                               // optional but recommended
  category: string;                               // optional
  visibility: 'public' | 'friends';               // optional, default 'public'
  capacity: number | null;                        // optional
  startAt: Date | null;                           // optional
  endAt: Date | null;                             // optional
  createdAt: Date;                                // server timestamp
  createdBy: string;                              // uid of creator
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an event object before writing to Firestore.
 * Returns { valid: true, errors: [] } when all required fields are present.
 */
export function validateEvent(
  data: Partial<ConnectEvent>,
): ValidationResult {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('title is required');
  }
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('description is required');
  }
  if (data.capacity !== undefined && data.capacity !== null) {
    const cap = Number(data.capacity);
    if (isNaN(cap) || cap < 1) {
      errors.push('capacity must be a positive number');
    }
  }
  if (data.startAt && data.endAt && data.startAt > data.endAt) {
    errors.push('startAt must be before endAt');
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Firestore ↔ Model mapping
// ---------------------------------------------------------------------------

/**
 * Safely map a Firestore document snapshot's data to a ConnectEvent.
 * Handles missing fields, Timestamp conversion, and type mismatches gracefully.
 */
export function fromFirestoreDoc(
  id: string,
  data: Record<string, any> | undefined,
): ConnectEvent | null {
  if (!data) return null;

  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    // Firestore Timestamp-like object with seconds
    if (val && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000);
    }
    return null;
  };

  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    location: typeof data.location === 'string' ? data.location : '',
    category: typeof data.category === 'string' ? data.category : '',
    visibility: data.visibility === 'friends' ? 'friends' : 'public',
    capacity: typeof data.capacity === 'number' ? data.capacity : null,
    startAt: toDate(data.startAt),
    endAt: toDate(data.endAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  };
}
