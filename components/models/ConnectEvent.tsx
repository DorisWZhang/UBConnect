// ConnectEvent model — single source of truth for the Firestore "connectEvents" schema
import { Timestamp, GeoPoint } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export interface ConnectEvent {
  id: string;                                     // Firestore document id
  title: string;                                  // required, 1–80 chars
  titleLower: string;                             // lowercase for search
  description: string;                            // required, 1–2000 chars
  categoryId: string;                             // category identifier
  visibility: 'public' | 'friends';               // required
  capacity: number | null;                        // optional
  startTime: Date | null;                         // optional
  endTime: Date | null;                           // optional
  createdAt: Date;                                // server timestamp
  createdBy: string;                              // uid of creator

  // Location fields
  locationName: string;                           // display name, ≤120 chars
  placeId: string;                                // Google Places ID
  locationGeo: { latitude: number; longitude: number } | null; // lat/lng
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
  } else if (data.title.trim().length > 80) {
    errors.push('title must be 80 characters or less');
  }
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('description is required');
  } else if (data.description.trim().length > 2000) {
    errors.push('description must be 2000 characters or less');
  }
  if (data.locationName !== undefined && data.locationName !== null && data.locationName !== '') {
    if (typeof data.locationName !== 'string') {
      errors.push('locationName must be a string');
    } else if (data.locationName.length > 120) {
      errors.push('locationName must be 120 characters or less');
    }
  }
  if (data.capacity !== undefined && data.capacity !== null) {
    const cap = Number(data.capacity);
    if (isNaN(cap) || cap < 1) {
      errors.push('capacity must be a positive number');
    }
  }
  if (data.startTime && data.endTime && data.startTime > data.endTime) {
    errors.push('startTime must be before endTime');
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

  // Parse locationGeo from GeoPoint or plain object
  let locationGeo: { latitude: number; longitude: number } | null = null;
  if (data.locationGeo) {
    if (data.locationGeo instanceof GeoPoint) {
      locationGeo = { latitude: data.locationGeo.latitude, longitude: data.locationGeo.longitude };
    } else if (typeof data.locationGeo.latitude === 'number' && typeof data.locationGeo.longitude === 'number') {
      locationGeo = { latitude: data.locationGeo.latitude, longitude: data.locationGeo.longitude };
    }
  }
  // Fallback: try legacy latitude/longitude fields
  if (!locationGeo && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    locationGeo = { latitude: data.latitude, longitude: data.longitude };
  }

  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    titleLower: typeof data.titleLower === 'string' ? data.titleLower : (typeof data.title === 'string' ? data.title.toLowerCase() : ''),
    description: typeof data.description === 'string' ? data.description : '',
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : (typeof data.category === 'string' ? data.category : ''),
    visibility: data.visibility === 'friends' ? 'friends' : 'public',
    capacity: typeof data.capacity === 'number' ? data.capacity : null,
    startTime: toDate(data.startTime) ?? toDate(data.startAt),
    endTime: toDate(data.endTime) ?? toDate(data.endAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    locationName: typeof data.locationName === 'string' ? data.locationName : (typeof data.location === 'string' ? data.location : ''),
    placeId: typeof data.placeId === 'string' ? data.placeId : '',
    locationGeo,
  };
}
