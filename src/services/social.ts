// Social service layer — all Firestore CRUD for the social schema
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
    deleteDoc,
    collection,
    collectionGroup,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    writeBatch,
    QueryDocumentSnapshot,
    Timestamp,
    GeoPoint,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { UserProfile, userProfileFromFirestoreDoc, validateUserProfile } from '@/components/models/UserProfile';
import { FriendRequest, friendRequestFromFirestoreDoc, makeFriendRequestId } from '@/components/models/FriendRequest';
import { Comment as EventComment, commentFromFirestoreDoc } from '@/components/models/Comment';
import { ConnectEvent, fromFirestoreDoc } from '@/components/models/ConnectEvent';
import { Rsvp, rsvpFromFirestoreDoc } from '@/components/models/Rsvp';
import { logFirestoreError, isPermissionDenied, logEvent } from '@/src/telemetry';

// ================================================================
// Error helper
// ================================================================
export { isPermissionDenied } from '@/src/telemetry';

export function getFirestoreErrorMessage(error: unknown): string {
    if (isPermissionDenied(error)) {
        return 'You do not have permission to perform this action. Please verify your email.';
    }
    return 'An unexpected error occurred. Please try again.';
}

// ================================================================
// User Profiles
// ================================================================

export async function getOrCreateUserProfile(
    uid: string,
    defaults: Partial<UserProfile> = {},
): Promise<UserProfile | null> {
    const ref = doc(db, 'users', uid);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return userProfileFromFirestoreDoc(uid, snap.data());
        }
        // Create new profile
        const displayName = defaults.displayName || 'UBC User';
        const profile = {
            displayName,
            displayNameLower: displayName.toLowerCase(),
            bio: defaults.bio || '',
            program: defaults.program || '',
            year: defaults.year || '',
            interests: defaults.interests || [],
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
        };
        await setDoc(ref, profile);
        return userProfileFromFirestoreDoc(uid, { ...profile, createdAt: new Date(), lastActiveAt: new Date() });
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'getOrCreateUserProfile', uid });
        throw error;
    }
}

export async function updateUserProfile(
    uid: string,
    patch: Partial<UserProfile>,
): Promise<void> {
    const ref = doc(db, 'users', uid);
    try {
        // Build the update — only include allowed fields
        const update: Record<string, any> = {};
        if (patch.displayName !== undefined) {
            update.displayName = patch.displayName;
            update.displayNameLower = patch.displayName.toLowerCase();
        }
        if (patch.photoURL !== undefined) update.photoURL = patch.photoURL;
        if (patch.bio !== undefined) update.bio = patch.bio;
        if (patch.program !== undefined) update.program = patch.program;
        if (patch.year !== undefined) update.year = patch.year;
        if (patch.interests !== undefined) update.interests = patch.interests;
        update.lastActiveAt = serverTimestamp();

        // We need to do a full setDoc since Firestore rules use hasOnly
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const existing = snap.data();
            const allowedKeys = [
                'displayName', 'displayNameLower', 'photoURL', 'bio',
                'program', 'year', 'interests', 'createdAt', 'lastActiveAt'
            ];
            const merged: Record<string, any> = {};
            for (const k of allowedKeys) {
                if (existing[k] !== undefined && existing[k] !== null) merged[k] = existing[k];
            }
            Object.assign(merged, update);

            // Ensure required fields are always present to satisfy security rules
            if (!merged.displayName) {
                merged.displayName = existing.name || 'UBC User'; // Fallback to old schema name if exists
                merged.displayNameLower = merged.displayName.toLowerCase();
            }
            if (!merged.createdAt) {
                merged.createdAt = serverTimestamp();
            }

            // Clean any undefined keys before sending as undefined violates rules
            Object.keys(merged).forEach(key => {
                if (merged[key] === undefined) {
                    delete merged[key];
                }
            });

            await setDoc(ref, merged);
        } else {
            // Profile doesn't exist, create it
            update.createdAt = serverTimestamp();
            if (!update.displayName) {
                update.displayName = 'UBC User';
                update.displayNameLower = 'ubc user';
            }
            await setDoc(ref, update);
        }
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'updateUserProfile', uid });
        throw error;
    }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return userProfileFromFirestoreDoc(uid, snap.data());
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'fetchUserProfile', uid });
        throw error;
    }
}

// ================================================================
// Friend Requests
// ================================================================

export async function sendFriendRequest(fromUid: string, toUid: string): Promise<void> {
    const id = makeFriendRequestId(fromUid, toUid);
    const ref = doc(db, 'friendRequests', id);
    try {
        await setDoc(ref, {
            fromUid,
            toUid,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        await logEvent('friend_request_sent', { fromUid, toUid });
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'sendFriendRequest', uid: fromUid });
        throw error;
    }
}

export async function acceptFriendRequest(fromUid: string, toUid: string): Promise<void> {
    const requestId = makeFriendRequestId(fromUid, toUid);
    const batch = writeBatch(db);

    try {
        // Update request status to accepted
        const requestRef = doc(db, 'friendRequests', requestId);
        batch.update(requestRef, {
            status: 'accepted',
            respondedAt: serverTimestamp(),
        });

        // Create the acceptor's friend edge (toUid adds fromUid as friend)
        const friendRef = doc(db, 'users', toUid, 'friends', fromUid);
        batch.set(friendRef, {
            friendUid: fromUid,
            since: serverTimestamp(),
            createdAt: serverTimestamp(),
        });

        await batch.commit();
        await logEvent('friend_request_accepted', { fromUid, toUid });
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'acceptFriendRequest', uid: toUid });
        throw error;
    }
}

export async function rejectFriendRequest(fromUid: string, toUid: string): Promise<void> {
    const requestId = makeFriendRequestId(fromUid, toUid);
    const ref = doc(db, 'friendRequests', requestId);
    try {
        await updateDoc(ref, {
            status: 'rejected',
            respondedAt: serverTimestamp(),
        });
        await logEvent('friend_request_rejected', { fromUid, toUid });
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'rejectFriendRequest', uid: toUid });
        throw error;
    }
}

export async function cancelFriendRequest(fromUid: string, toUid: string): Promise<void> {
    const requestId = makeFriendRequestId(fromUid, toUid);
    const ref = doc(db, 'friendRequests', requestId);
    try {
        await updateDoc(ref, {
            status: 'cancelled',
            respondedAt: serverTimestamp(),
        });
        await logEvent('friend_request_cancelled', { fromUid, toUid });
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'cancelFriendRequest', uid: fromUid });
        throw error;
    }
}

/**
 * Ensures the requester's friend edge exists after an accepted request.
 */
export async function ensureFriendEdge(uid: string, friendUid: string): Promise<void> {
    const friendRef = doc(db, 'users', uid, 'friends', friendUid);
    try {
        const snap = await getDoc(friendRef);
        if (!snap.exists()) {
            await setDoc(friendRef, {
                friendUid,
                since: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'ensureFriendEdge', uid });
        // Non-critical — don't rethrow
    }
}

/**
 * Remove a friend — delete both friend edges.
 */
export async function removeFriend(uid: string, friendUid: string): Promise<void> {
    try {
        // Delete our edge
        const myEdge = doc(db, 'users', uid, 'friends', friendUid);
        await deleteDoc(myEdge);
        // The other user must delete their own edge (rules enforce isOwner)
        // For now we attempt but it may fail due to rules — that's OK
        try {
            const theirEdge = doc(db, 'users', friendUid, 'friends', uid);
            await deleteDoc(theirEdge);
        } catch {
            // Expected to fail — their edge must be deleted by them
        }
        await logEvent('friend_removed', { uid, friendUid });
    } catch (error) {
        await logFirestoreError(error, { screen: 'social', operation: 'removeFriend', uid });
        throw error;
    }
}

// ================================================================
// Friend request queries
// ================================================================

export async function fetchIncomingRequests(uid: string): Promise<FriendRequest[]> {
    try {
        const ref = collection(db, 'friendRequests');
        const q = query(ref, where('toUid', '==', uid), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => friendRequestFromFirestoreDoc(d.id, d.data())).filter(Boolean) as FriendRequest[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'friends', operation: 'fetchIncomingRequests', uid });
        throw error;
    }
}

export async function fetchOutgoingRequests(uid: string): Promise<FriendRequest[]> {
    try {
        const ref = collection(db, 'friendRequests');
        const q = query(ref, where('fromUid', '==', uid), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => friendRequestFromFirestoreDoc(d.id, d.data())).filter(Boolean) as FriendRequest[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'friends', operation: 'fetchOutgoingRequests', uid });
        throw error;
    }
}

/**
 * Check the friend status between two users.
 * Returns: 'friends' | 'pending_sent' | 'pending_received' | 'none'
 */
export async function getFriendStatus(
    uid: string,
    otherUid: string,
): Promise<'friends' | 'pending_sent' | 'pending_received' | 'none'> {
    try {
        // Check if already friends
        const friendRef = doc(db, 'users', uid, 'friends', otherUid);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) return 'friends';

        // Check outgoing request
        const outId = makeFriendRequestId(uid, otherUid);
        const outRef = doc(db, 'friendRequests', outId);
        const outSnap = await getDoc(outRef);
        if (outSnap.exists() && outSnap.data()?.status === 'pending') return 'pending_sent';

        // Check incoming request
        const inId = makeFriendRequestId(otherUid, uid);
        const inRef = doc(db, 'friendRequests', inId);
        const inSnap = await getDoc(inRef);
        if (inSnap.exists() && inSnap.data()?.status === 'pending') return 'pending_received';

        return 'none';
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'getFriendStatus', uid });
        return 'none';
    }
}

// ================================================================
// Friends list
// ================================================================

export interface FriendEdge {
    friendUid: string;
    since: Date;
}

export async function listFriends(uid: string): Promise<FriendEdge[]> {
    const ref = collection(db, 'users', uid, 'friends');
    try {
        const snap = await getDocs(ref);
        return snap.docs.map((d) => {
            const data = d.data();
            const since = data.since instanceof Timestamp
                ? data.since.toDate()
                : new Date(data.since?.seconds ? data.since.seconds * 1000 : Date.now());
            return { friendUid: d.id, since };
        });
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'listFriends', uid });
        throw error;
    }
}

// ================================================================
// Events Feed (paginated)
// ================================================================

export interface FeedResult {
    events: ConnectEvent[];
    lastDoc: QueryDocumentSnapshot | null;
}

export async function fetchEventsFeed(options: {
    pageSize?: number;
    cursor?: QueryDocumentSnapshot | null;
    categoryId?: string;
} = {}): Promise<FeedResult> {
    const { pageSize = 25, cursor = null, categoryId } = options;
    const startTime = Date.now();
    try {
        const ref = collection(db, 'connectEvents');
        const constraints: any[] = [];

        if (categoryId) {
            constraints.push(where('categoryId', '==', categoryId));
        }

        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(pageSize));
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);

        const events: ConnectEvent[] = [];
        snap.docs.forEach((d) => {
            const event = fromFirestoreDoc(d.id, d.data());
            if (event && event.title) events.push(event);
        });

        await logEvent('feed_fetch', {
            count: events.length,
            latencyMs: Date.now() - startTime,
            hasMore: snap.docs.length === pageSize,
            source: categoryId ? 'category' : 'all',
        });

        return {
            events,
            lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
    } catch (error) {
        await logFirestoreError(error, {
            screen: 'explore',
            operation: 'fetchEventsFeed',
        });
        throw error;
    }
}

/**
 * Interests-first feed: Query events matching user interests first, then others.
 * Returns merged/deduped list.
 */
export async function fetchInterestsFeed(
    userInterests: string[],
    options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {},
): Promise<FeedResult> {
    const { pageSize = 25 } = options;
    const startTime = Date.now();

    try {
        // Firestore 'in' supports up to 30 values
        const interestSubset = userInterests.slice(0, 10);
        const allEvents: ConnectEvent[] = [];
        const seenIds = new Set<string>();
        let lastDoc: QueryDocumentSnapshot | null = null;

        // Query 1: Events matching interests
        if (interestSubset.length > 0) {
            const ref = collection(db, 'connectEvents');
            const q = query(
                ref,
                where('categoryId', 'in', interestSubset),
                orderBy('createdAt', 'desc'),
                limit(pageSize),
            );
            const snap = await getDocs(q);
            snap.docs.forEach((d) => {
                const event = fromFirestoreDoc(d.id, d.data());
                if (event && event.title && !seenIds.has(d.id)) {
                    allEvents.push(event);
                    seenIds.add(d.id);
                }
            });
            if (snap.docs.length > 0) lastDoc = snap.docs[snap.docs.length - 1];
        }

        // Query 2: Recent events (fill remaining slots)
        const remaining = pageSize - allEvents.length;
        if (remaining > 0) {
            const ref = collection(db, 'connectEvents');
            const q = query(
                ref,
                orderBy('createdAt', 'desc'),
                limit(remaining + seenIds.size), // over-fetch to account for dedup
            );
            const snap = await getDocs(q);
            snap.docs.forEach((d) => {
                if (!seenIds.has(d.id)) {
                    const event = fromFirestoreDoc(d.id, d.data());
                    if (event && event.title) {
                        allEvents.push(event);
                        seenIds.add(d.id);
                    }
                }
            });
            if (snap.docs.length > 0 && !lastDoc) lastDoc = snap.docs[snap.docs.length - 1];
        }

        await logEvent('feed_fetch', {
            count: allEvents.length,
            latencyMs: Date.now() - startTime,
            source: 'interests_first',
        });

        return { events: allEvents.slice(0, pageSize), lastDoc };
    } catch (error) {
        await logFirestoreError(error, { screen: 'explore', operation: 'fetchInterestsFeed' });
        throw error;
    }
}

// ================================================================
// Single Event
// ================================================================

export async function fetchEventById(eventId: string): Promise<ConnectEvent | null> {
    try {
        const ref = doc(db, 'connectEvents', eventId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return fromFirestoreDoc(snap.id, snap.data());
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'fetchEventById' });
        throw error;
    }
}

// ================================================================
// Events by creator
// ================================================================

export async function fetchEventsByCreator(
    uid: string,
    options: { pageSize?: number } = {},
): Promise<ConnectEvent[]> {
    const { pageSize = 20 } = options;
    try {
        const ref = collection(db, 'connectEvents');
        const q = query(ref, where('createdBy', '==', uid), orderBy('createdAt', 'desc'), limit(pageSize));
        const snap = await getDocs(q);
        return snap.docs.map((d) => fromFirestoreDoc(d.id, d.data())).filter(Boolean) as ConnectEvent[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'fetchEventsByCreator', uid });
        throw error;
    }
}

// ================================================================
// Create event (with notification)
// ================================================================

export async function createEvent(
    data: {
        title: string;
        description: string;
        categoryId: string;
        visibility: 'public' | 'friends';
        locationName: string;
        placeId: string;
        locationGeo: { latitude: number; longitude: number } | null;
        startTime: Date | null;
        endTime: Date | null;
        capacity: number | null;
        createdBy: string;
        createdByName?: string;
    },
): Promise<string> {
    const startMs = Date.now();
    try {
        const eventData: Record<string, any> = {
            title: data.title.trim(),
            titleLower: data.title.trim().toLowerCase(),
            description: data.description.trim(),
            categoryId: data.categoryId || '',
            visibility: data.visibility || 'public',
            locationName: data.locationName || '',
            placeId: data.placeId || '',
            createdBy: data.createdBy,
            createdAt: serverTimestamp(),
        };

        if (data.locationGeo) {
            eventData.locationGeo = new GeoPoint(data.locationGeo.latitude, data.locationGeo.longitude);
        }
        if (data.startTime) eventData.startTime = Timestamp.fromDate(data.startTime);
        if (data.endTime) eventData.endTime = Timestamp.fromDate(data.endTime);
        if (data.capacity) eventData.capacity = data.capacity;

        const docRef = await addDoc(collection(db, 'connectEvents'), eventData);

        await logEvent('posting_success', { latencyMs: Date.now() - startMs, eventId: docRef.id });

        return docRef.id;
    } catch (error) {
        await logFirestoreError(error, { screen: 'posting', operation: 'createEvent', uid: data.createdBy });
        throw error;
    }
}

// ================================================================
// Event Comments (threaded)
// ================================================================

export interface CommentsResult {
    comments: EventComment[];
    lastDoc: QueryDocumentSnapshot | null;
}

/**
 * Fetch top-level comments (parentId == null) for an event.
 */
export async function fetchTopLevelComments(
    eventId: string,
    options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {},
): Promise<CommentsResult> {
    const { pageSize = 20, cursor = null } = options;
    const startTime = Date.now();
    try {
        const ref = collection(db, 'connectEvents', eventId, 'comments');
        const constraints: any[] = [
            where('parentId', '==', null),
            orderBy('createdAt', 'desc'),
            limit(pageSize),
        ];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);

        const comments: EventComment[] = [];
        snap.docs.forEach((d) => {
            const c = commentFromFirestoreDoc(d.id, d.data());
            if (c) comments.push(c);
        });

        await logEvent('comments_fetch', {
            eventId,
            count: comments.length,
            latencyMs: Date.now() - startTime,
        });

        return {
            comments,
            lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'fetchTopLevelComments' });
        throw error;
    }
}

/**
 * Fetch replies for a given root comment.
 */
export async function fetchReplies(
    eventId: string,
    rootId: string,
    options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {},
): Promise<CommentsResult> {
    const { pageSize = 10, cursor = null } = options;
    try {
        const ref = collection(db, 'connectEvents', eventId, 'comments');
        const constraints: any[] = [
            where('rootId', '==', rootId),
            where('parentId', '!=', null),
            orderBy('createdAt', 'asc'),
            limit(pageSize),
        ];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);

        const comments: EventComment[] = [];
        snap.docs.forEach((d) => {
            const c = commentFromFirestoreDoc(d.id, d.data());
            if (c) comments.push(c);
        });

        return {
            comments,
            lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'fetchReplies' });
        throw error;
    }
}

/**
 * Fetch all comments (flat) for backward compatibility with explore screen.
 */
export async function fetchEventComments(
    eventId: string,
    options: { pageSize?: number; cursor?: QueryDocumentSnapshot | null } = {},
): Promise<CommentsResult> {
    const { pageSize = 20, cursor = null } = options;
    const startTime = Date.now();
    try {
        const ref = collection(db, 'connectEvents', eventId, 'comments');
        const constraints: any[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(ref, ...constraints);
        const snap = await getDocs(q);

        const comments: EventComment[] = [];
        snap.docs.forEach((d) => {
            const c = commentFromFirestoreDoc(d.id, d.data());
            if (c) comments.push(c);
        });

        await logEvent('comments_fetch', { eventId, count: comments.length, latencyMs: Date.now() - startTime });

        return {
            comments,
            lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        };
    } catch (error) {
        await logFirestoreError(error, { screen: 'explore', operation: 'fetchEventComments' });
        throw error;
    }
}

/**
 * Add a comment (top-level or reply) to an event.
 */
export async function addEventComment(
    eventId: string,
    text: string,
    createdBy: string,
    createdByName?: string,
    threading?: { parentId: string; rootId: string; replyToUid: string },
): Promise<EventComment> {
    const ref = collection(db, 'connectEvents', eventId, 'comments');
    try {
        const docData: Record<string, any> = {
            text: text.trim(),
            createdBy,
            createdAt: serverTimestamp(),
            parentId: threading?.parentId ?? null,
            rootId: threading?.rootId ?? null, // will be set to own id for top-level
            replyToUid: threading?.replyToUid ?? null,
        };
        if (createdByName) docData.createdByName = createdByName;

        const docRef = await addDoc(ref, docData);

        // For top-level comments, update rootId to point to self
        if (!threading) {
            await updateDoc(docRef, { rootId: docRef.id });
        }

        await logEvent('comment_added', { eventId, isReply: !!threading });

        // Return optimistic comment
        return {
            id: docRef.id,
            text: text.trim(),
            createdBy,
            createdByName,
            createdAt: new Date(),
            parentId: threading?.parentId ?? null,
            rootId: threading?.rootId ?? docRef.id,
            replyToUid: threading?.replyToUid ?? null,
        };
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'addEventComment' });
        throw error;
    }
}

// ================================================================
// RSVPs
// ================================================================

export async function rsvpToEvent(
    eventId: string,
    uid: string,
    status: 'going' | 'interested',
): Promise<void> {
    const ref = doc(db, 'connectEvents', eventId, 'rsvps', uid);
    try {
        await setDoc(ref, {
            userId: uid,
            status,
            createdAt: serverTimestamp(),
        });
        await logEvent('rsvp', { eventId, status });
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'rsvpToEvent' });
        throw error;
    }
}

export async function removeRsvp(
    eventId: string,
    uid: string,
): Promise<void> {
    const ref = doc(db, 'connectEvents', eventId, 'rsvps', uid);
    try {
        await deleteDoc(ref);
        await logEvent('rsvp_removed', { eventId });
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'removeRsvp' });
        throw error;
    }
}

export async function fetchRsvpStatus(
    eventId: string,
    uid: string,
): Promise<'going' | 'interested' | null> {
    const ref = doc(db, 'connectEvents', eventId, 'rsvps', uid);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            return data.status === 'going' || data.status === 'interested' ? data.status : null;
        }
        return null;
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'fetchRsvpStatus' });
        return null;
    }
}

export async function fetchRsvpCount(
    eventId: string,
): Promise<number> {
    const ref = collection(db, 'connectEvents', eventId, 'rsvps');
    try {
        const snap = await getDocs(ref);
        return snap.size;
    } catch (error) {
        await logFirestoreError(error, { screen: 'event', operation: 'fetchRsvpCount' });
        return 0;
    }
}

// ================================================================
// Search
// ================================================================

export async function searchUsers(
    queryStr: string,
    options: { pageSize?: number } = {},
): Promise<UserProfile[]> {
    const { pageSize = 20 } = options;
    const lower = queryStr.toLowerCase().trim();
    if (!lower) return [];

    try {
        const ref = collection(db, 'users');
        const q = query(
            ref,
            where('displayNameLower', '>=', lower),
            where('displayNameLower', '<=', lower + '\uf8ff'),
            limit(pageSize),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => userProfileFromFirestoreDoc(d.id, d.data())).filter(Boolean) as UserProfile[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'search', operation: 'searchUsers' });
        return [];
    }
}

export async function searchEvents(
    queryStr: string,
    options: { pageSize?: number } = {},
): Promise<ConnectEvent[]> {
    const { pageSize = 20 } = options;
    const lower = queryStr.toLowerCase().trim();
    if (!lower) return [];

    try {
        const ref = collection(db, 'connectEvents');
        const q = query(
            ref,
            where('titleLower', '>=', lower),
            where('titleLower', '<=', lower + '\uf8ff'),
            orderBy('titleLower'),
            limit(pageSize),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => fromFirestoreDoc(d.id, d.data())).filter(Boolean) as ConnectEvent[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'search', operation: 'searchEvents' });
        return [];
    }
}

// ================================================================
// Attending events (collectionGroup query)
// ================================================================

export async function fetchUserAttendingEventIds(
    uid: string,
    options: { pageSize?: number } = {},
): Promise<string[]> {
    const { pageSize = 20 } = options;
    try {
        const q = query(
            collectionGroup(db, 'rsvps'),
            where('userId', '==', uid),
            where('status', '==', 'going'),
            limit(pageSize),
        );
        const snap = await getDocs(q);
        // Extract parent event IDs from doc paths
        return snap.docs.map((d) => {
            // Path: connectEvents/{eventId}/rsvps/{uid}
            const segments = d.ref.path.split('/');
            return segments[1]; // eventId
        });
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'fetchUserAttendingEventIds', uid });
        return [];
    }
}

/**
 * Fetch full event objects for given IDs (batched).
 */
export async function fetchEventsByIds(eventIds: string[]): Promise<ConnectEvent[]> {
    if (eventIds.length === 0) return [];
    try {
        const events: ConnectEvent[] = [];
        // Batch in chunks of 10
        for (let i = 0; i < eventIds.length; i += 10) {
            const chunk = eventIds.slice(i, i + 10);
            const promises = chunk.map(async (id) => {
                try {
                    const snap = await getDoc(doc(db, 'connectEvents', id));
                    if (snap.exists()) {
                        const event = fromFirestoreDoc(snap.id, snap.data());
                        if (event) events.push(event);
                    }
                } catch {
                    // Skip events we can't read (visibility rules)
                }
            });
            await Promise.all(promises);
        }
        return events;
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'fetchEventsByIds' });
        return [];
    }
}
