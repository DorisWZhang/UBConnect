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

export function isFailedPrecondition(error: unknown): boolean {
    if (error && typeof error === 'object') {
        const code = (error as any).code;
        return code === 'failed-precondition' || code === 'FAILED_PRECONDITION';
    }
    return false;
}

export function getFirestoreErrorMessage(error: unknown): string {
    if (isPermissionDenied(error)) {
        return 'You do not have permission to perform this action. Please verify your email.';
    }
    if (isFailedPrecondition(error)) {
        const msg = (error as any).message || '';
        if (__DEV__ && msg.includes('https://')) {
            // In dev, extract the index URL for convenience
            const urlMatch = msg.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
            if (urlMatch) {
                return `Missing Firestore index. Create it here: ${urlMatch[1]}`;
            }
        }
        return 'This query requires a database index. An admin must create it before this feature works.';
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

export async function sendFriendRequest(fromUid: string, toUid: string, actorName?: string): Promise<void> {
    const id = makeFriendRequestId(fromUid, toUid);
    const ref = doc(db, 'friendRequests', id);
    try {
        await setDoc(ref, {
            fromUid,
            toUid,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        // Create notification for the target user
        const { createNotification } = await import('./notifications');
        await createNotification({
            type: 'friend_request',
            actorUid: fromUid,
            actorName,
            targetUid: toUid,
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

        // Create BOTH friend edges in the same batch
        // toUid adds fromUid as friend
        const edgeA = doc(db, 'users', toUid, 'friends', fromUid);
        batch.set(edgeA, {
            friendUid: fromUid,
            since: serverTimestamp(),
            createdAt: serverTimestamp(),
        });
        // fromUid adds toUid as friend
        const edgeB = doc(db, 'users', fromUid, 'friends', toUid);
        batch.set(edgeB, {
            friendUid: toUid,
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
        // Delete both edges — rules now allow the friend (friendUid == auth.uid) to delete
        const myEdge = doc(db, 'users', uid, 'friends', friendUid);
        const theirEdge = doc(db, 'users', friendUid, 'friends', uid);
        await Promise.all([deleteDoc(myEdge), deleteDoc(theirEdge)]);
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

/**
 * Helper: chunk array into groups of N for Firestore 'in' queries (max 10).
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

/**
 * SAFE feed strategy: runs parallel visibility-filtered queries to avoid
 * permission-denied on friends-only docs the user cannot read.
 *
 * A) public events
 * B) own events
 * C) friends-only events from friend UIDs (chunked in groups of 10)
 */
export async function fetchEventsFeed(options: {
    pageSize?: number;
    currentUid?: string;
    friendUids?: string[];
    categoryId?: string;
} = {}): Promise<FeedResult> {
    const { pageSize = 25, currentUid, friendUids = [], categoryId } = options;
    const startTime = Date.now();
    try {
        const ref = collection(db, 'connectEvents');
        const allEvents: ConnectEvent[] = [];
        const seenIds = new Set<string>();

        const categoryConstraints = categoryId ? [where('categoryId', '==', categoryId)] : [];

        // Query A: public events
        const publicQ = query(
            ref,
            where('visibility', '==', 'public'),
            ...categoryConstraints,
            orderBy('createdAt', 'desc'),
            limit(pageSize),
        );

        // Query B: own events (only if currentUid is provided)
        const ownPromise = currentUid
            ? getDocs(query(
                ref,
                where('createdBy', '==', currentUid),
                ...categoryConstraints,
                orderBy('createdAt', 'desc'),
                limit(pageSize),
            ))
            : Promise.resolve(null);

        // Query C: friends-only events from friends (chunked)
        const friendChunks = currentUid ? chunkArray(friendUids.slice(0, 100), 10) : [];
        const friendPromises = friendChunks
            .filter(chunk => chunk.length > 0)
            .map(chunk =>
                getDocs(query(
                    ref,
                    where('visibility', '==', 'friends'),
                    where('createdBy', 'in', chunk),
                    ...categoryConstraints,
                    orderBy('createdAt', 'desc'),
                    limit(pageSize),
                )),
            );

        const [publicSnap, ownSnap, ...friendSnaps] = await Promise.all([
            getDocs(publicQ),
            ownPromise,
            ...friendPromises,
        ]);

        // Merge results
        const addDocs = (snap: { docs: QueryDocumentSnapshot[] } | null) => {
            if (!snap) return;
            snap.docs.forEach((d) => {
                if (!seenIds.has(d.id)) {
                    const event = fromFirestoreDoc(d.id, d.data());
                    if (event && event.title) {
                        allEvents.push(event);
                        seenIds.add(d.id);
                    }
                }
            });
        };

        addDocs(publicSnap);
        addDocs(ownSnap);
        friendSnaps.forEach(addDocs);

        // Sort by createdAt desc and take pageSize
        allEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const sliced = allEvents.slice(0, pageSize);

        await logEvent('feed_fetch', {
            count: sliced.length,
            latencyMs: Date.now() - startTime,
            hasMore: allEvents.length > pageSize,
            source: categoryId ? 'category' : 'safe_feed',
        });

        return {
            events: sliced,
            lastDoc: null, // cursor-based pagination not used with merged queries
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
 * Interests-first safe feed: runs visibility-filtered queries, then ranks
 * events matching user interests higher.
 */
export async function fetchInterestsFeed(
    userInterests: string[],
    options: { pageSize?: number; currentUid?: string; friendUids?: string[] } = {},
): Promise<FeedResult> {
    const { pageSize = 25, currentUid, friendUids = [] } = options;
    const startTime = Date.now();

    try {
        // Fetch using the safe feed (no category filter — get all)
        const result = await fetchEventsFeed({
            pageSize: pageSize * 2, // over-fetch to rank
            currentUid,
            friendUids,
        });

        const interestSet = new Set(userInterests.map(i => i.toLowerCase()));

        // Sort: interest-matching events first, then by createdAt desc
        const scored = result.events.map(e => ({
            event: e,
            matchesInterest: interestSet.has((e.categoryId || '').toLowerCase()),
        }));

        scored.sort((a, b) => {
            if (a.matchesInterest !== b.matchesInterest) return a.matchesInterest ? -1 : 1;
            return b.event.createdAt.getTime() - a.event.createdAt.getTime();
        });

        const sliced = scored.slice(0, pageSize).map(s => s.event);

        await logEvent('feed_fetch', {
            count: sliced.length,
            latencyMs: Date.now() - startTime,
            source: 'interests_first',
        });

        return { events: sliced, lastDoc: null };
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
    options: { pageSize?: number; viewerUid?: string } = {},
): Promise<ConnectEvent[]> {
    const { pageSize = 20, viewerUid } = options;
    const isSelf = viewerUid === uid;

    try {
        const ref = collection(db, 'connectEvents');
        const constraints: any[] = [
            where('createdBy', '==', uid)
        ];

        // If not looking at own profile, you only have static read access to public events.
        // Even if we are friends, querying the whole collection by 'createdBy' will throw Permission Denied
        // unless we constrain the query to exactly match a rule we have access to via a static query filter.
        if (!isSelf) {
            constraints.push(where('visibility', '==', 'public'));
        }

        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(pageSize));

        const q = query(ref, ...constraints);
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

        // Create event_live notification (self-skip handled in createNotification)
        const { createNotification } = await import('./notifications');
        await createNotification({
            type: 'event_live',
            actorUid: data.createdBy,
            actorName: data.createdByName,
            targetUid: data.createdBy,
            eventId: docRef.id,
        });

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
        // Use parentId == rootId to fetch replies. This avoids the invalid
        // inequality filter (parentId != null) that conflicts with Firestore ordering.
        const constraints: any[] = [
            where('parentId', '==', rootId),
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
    const colRef = collection(db, 'connectEvents', eventId, 'comments');
    try {
        // Generate a known doc ID first so we can set rootId at create time
        // (rules disallow comment updates, so we can't set rootId after creation)
        const newRef = doc(colRef);
        const docData: Record<string, any> = {
            text: text.trim(),
            createdBy,
            createdAt: serverTimestamp(),
            parentId: threading?.parentId ?? null,
            rootId: threading?.rootId ?? newRef.id, // self-referencing for top-level
            replyToUid: threading?.replyToUid ?? null,
        };
        if (createdByName) docData.createdByName = createdByName;

        await setDoc(newRef, docData);

        await logEvent('comment_added', { eventId, isReply: !!threading });

        // Return optimistic comment
        return {
            id: newRef.id,
            text: text.trim(),
            createdBy,
            createdByName,
            createdAt: new Date(),
            parentId: threading?.parentId ?? null,
            rootId: threading?.rootId ?? newRef.id,
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
        // Fetch parent event visibility to snapshot into RSVP doc
        const eventRef = doc(db, 'connectEvents', eventId);
        const eventSnap = await getDoc(eventRef);
        const visibility = eventSnap.exists() ? (eventSnap.data().visibility || 'public') : 'public';

        await setDoc(ref, {
            userId: uid,
            status,
            visibilitySnapshot: visibility,
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
            orderBy('displayNameLower'),
            limit(pageSize),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => userProfileFromFirestoreDoc(d.id, d.data())).filter(Boolean) as UserProfile[];
    } catch (error) {
        await logFirestoreError(error, { screen: 'search', operation: 'searchUsers' });
        throw error; // Don't swallow — surface errors to UI
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

export interface AttendingResult {
    ids: string[];
    error: string | null;
}

/**
 * Fetch event IDs that a user is attending.
 * - Self view: query all RSVPs for this user.
 * - Other user: query only RSVPs with visibilitySnapshot=='public' to avoid permission errors.
 */
export async function fetchUserAttendingEventIds(
    uid: string,
    viewerUid?: string,
    options: { pageSize?: number } = {},
): Promise<AttendingResult> {
    const { pageSize = 20 } = options;
    const isSelf = viewerUid === uid;
    try {
        const constraints: any[] = [
            where('userId', '==', uid),
            where('status', '==', 'going'),
        ];
        // When viewing another user, only show public-event RSVPs
        if (!isSelf) {
            constraints.push(where('visibilitySnapshot', '==', 'public'));
        }
        constraints.push(limit(pageSize));

        const q = query(
            collectionGroup(db, 'rsvps'),
            ...constraints,
        );
        const snap = await getDocs(q);
        const ids = snap.docs.map((d) => {
            // Path: connectEvents/{eventId}/rsvps/{uid}
            const segments = d.ref.path.split('/');
            return segments[1]; // eventId
        });
        return { ids, error: null };
    } catch (error) {
        await logFirestoreError(error, { screen: 'profile', operation: 'fetchUserAttendingEventIds', uid });
        if (isFailedPrecondition(error)) {
            return { ids: [], error: getFirestoreErrorMessage(error) };
        }
        throw error;
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
