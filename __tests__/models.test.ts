// Unit tests for social models: UserProfile, FriendRequest, Comment, Rsvp, Notification
import { validateUserProfile, userProfileFromFirestoreDoc } from '../components/models/UserProfile';
import { validateFriendRequest, friendRequestFromFirestoreDoc, makeFriendRequestId } from '../components/models/FriendRequest';
import { validateComment, commentFromFirestoreDoc } from '../components/models/Comment';
import { validateRsvp, rsvpFromFirestoreDoc } from '../components/models/Rsvp';
import { validateNotification, notificationFromFirestoreDoc } from '../components/models/Notification';

// ===========================================================================
// UserProfile
// ===========================================================================
describe('validateUserProfile', () => {
    it('passes for a valid profile', () => {
        const result = validateUserProfile({ displayName: 'Alice' });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('fails when displayName is missing', () => {
        const result = validateUserProfile({});
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('displayName is required');
    });

    it('fails when displayName is empty', () => {
        const result = validateUserProfile({ displayName: '   ' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('displayName is required');
    });

    it('fails when displayName exceeds 50 chars', () => {
        const result = validateUserProfile({ displayName: 'A'.repeat(51) });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('displayName must be 50 characters or fewer');
    });

    it('passes with 50-char displayName', () => {
        const result = validateUserProfile({ displayName: 'A'.repeat(50) });
        expect(result.valid).toBe(true);
    });

    it('fails when bio exceeds 280 chars', () => {
        const result = validateUserProfile({ displayName: 'Alice', bio: 'B'.repeat(281) });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('bio must be 280 characters or fewer');
    });

    it('passes with valid bio at 280 chars', () => {
        const result = validateUserProfile({ displayName: 'Alice', bio: 'B'.repeat(280) });
        expect(result.valid).toBe(true);
    });

    it('fails when interests is not an array', () => {
        const result = validateUserProfile({ displayName: 'Alice', interests: 'not-array' as any });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('interests must be an array');
    });
});

describe('userProfileFromFirestoreDoc', () => {
    it('maps a complete doc', () => {
        const profile = userProfileFromFirestoreDoc('uid1', {
            displayName: 'Alice',
            displayNameLower: 'alice',
            bio: 'Hello!',
            program: 'CS',
            year: '3',
            interests: ['Hiking', 'Coding'],
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
        });
        expect(profile).not.toBeNull();
        expect(profile!.uid).toBe('uid1');
        expect(profile!.displayName).toBe('Alice');
        expect(profile!.displayNameLower).toBe('alice');
        expect(profile!.bio).toBe('Hello!');
        expect(profile!.interests).toEqual(['Hiking', 'Coding']);
        expect(profile!.createdAt).toBeInstanceOf(Date);
    });

    it('auto-generates displayNameLower when missing', () => {
        const profile = userProfileFromFirestoreDoc('uid1', { displayName: 'Bob McAlice' });
        expect(profile!.displayNameLower).toBe('bob mcalice');
    });

    it('returns null for undefined data', () => {
        expect(userProfileFromFirestoreDoc('uid1', undefined)).toBeNull();
    });

    it('handles missing optional fields', () => {
        const profile = userProfileFromFirestoreDoc('uid1', { displayName: 'Bob' });
        expect(profile).not.toBeNull();
        expect(profile!.bio).toBeUndefined();
        expect(profile!.interests).toBeUndefined();
    });
});

// ===========================================================================
// FriendRequest
// ===========================================================================
describe('validateFriendRequest', () => {
    it('passes for a valid request', () => {
        const result = validateFriendRequest({ fromUid: 'a', toUid: 'b', status: 'pending' });
        expect(result.valid).toBe(true);
    });

    it('fails when fromUid is missing', () => {
        const result = validateFriendRequest({ toUid: 'b', status: 'pending' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('fromUid is required');
    });

    it('fails when toUid is missing', () => {
        const result = validateFriendRequest({ fromUid: 'a', status: 'pending' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('toUid is required');
    });

    it('fails for self-request', () => {
        const result = validateFriendRequest({ fromUid: 'a', toUid: 'a', status: 'pending' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('cannot send friend request to yourself');
    });

    it('fails for invalid status', () => {
        const result = validateFriendRequest({ fromUid: 'a', toUid: 'b', status: 'invalid' as any });
        expect(result.valid).toBe(false);
    });

    it('accepts all valid statuses', () => {
        for (const status of ['pending', 'accepted', 'rejected', 'cancelled'] as const) {
            const result = validateFriendRequest({ fromUid: 'a', toUid: 'b', status });
            expect(result.valid).toBe(true);
        }
    });
});

describe('makeFriendRequestId', () => {
    it('creates deterministic ID', () => {
        expect(makeFriendRequestId('alice', 'bob')).toBe('alice_bob');
        expect(makeFriendRequestId('bob', 'alice')).toBe('bob_alice');
    });
});

describe('friendRequestFromFirestoreDoc', () => {
    it('maps a complete doc', () => {
        const req = friendRequestFromFirestoreDoc('a_b', {
            fromUid: 'a',
            toUid: 'b',
            status: 'pending',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
        });
        expect(req).not.toBeNull();
        expect(req!.id).toBe('a_b');
        expect(req!.fromUid).toBe('a');
        expect(req!.status).toBe('pending');
    });

    it('returns null for undefined data', () => {
        expect(friendRequestFromFirestoreDoc('a_b', undefined)).toBeNull();
    });

    it('defaults invalid status to pending', () => {
        const req = friendRequestFromFirestoreDoc('a_b', {
            fromUid: 'a',
            toUid: 'b',
            status: 'invalid',
            createdAt: new Date(),
        });
        expect(req!.status).toBe('pending');
    });
});

// ===========================================================================
// Comment (with threading)
// ===========================================================================
describe('validateComment', () => {
    it('passes for a valid comment', () => {
        const result = validateComment({ text: 'Nice event!', createdBy: 'uid1' });
        expect(result.valid).toBe(true);
    });

    it('fails when text is empty', () => {
        const result = validateComment({ text: '', createdBy: 'uid1' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('text is required');
    });

    it('fails when text exceeds 500 chars', () => {
        const result = validateComment({ text: 'X'.repeat(501), createdBy: 'uid1' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('text must be 500 characters or fewer');
    });

    it('fails when createdBy is missing', () => {
        const result = validateComment({ text: 'Hello' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('createdBy is required');
    });

    it('passes with 500-char text', () => {
        const result = validateComment({ text: 'X'.repeat(500), createdBy: 'uid1' });
        expect(result.valid).toBe(true);
    });
});

describe('commentFromFirestoreDoc', () => {
    it('maps a complete doc with threading', () => {
        const c = commentFromFirestoreDoc('c1', {
            text: 'Great!',
            createdBy: 'uid1',
            createdByName: 'Alice',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
            parentId: 'c0',
            rootId: 'c0',
            replyToUid: 'uid2',
        });
        expect(c).not.toBeNull();
        expect(c!.id).toBe('c1');
        expect(c!.text).toBe('Great!');
        expect(c!.parentId).toBe('c0');
        expect(c!.rootId).toBe('c0');
        expect(c!.replyToUid).toBe('uid2');
    });

    it('defaults threading fields for top-level comment', () => {
        const c = commentFromFirestoreDoc('c1', {
            text: 'Hello',
            createdBy: 'uid1',
            createdAt: new Date(),
        });
        expect(c!.parentId).toBeNull();
        expect(c!.rootId).toBe('c1'); // defaults to own id
        expect(c!.replyToUid).toBeNull();
    });

    it('returns null for undefined data', () => {
        expect(commentFromFirestoreDoc('c1', undefined)).toBeNull();
    });

    it('handles missing createdByName', () => {
        const c = commentFromFirestoreDoc('c1', {
            text: 'Hello',
            createdBy: 'uid1',
            createdAt: new Date(),
        });
        expect(c!.createdByName).toBeUndefined();
    });
});

// ===========================================================================
// Rsvp (with userId)
// ===========================================================================
describe('validateRsvp', () => {
    it('passes for going', () => {
        const result = validateRsvp({ status: 'going' });
        expect(result.valid).toBe(true);
    });

    it('passes for interested', () => {
        const result = validateRsvp({ status: 'interested' });
        expect(result.valid).toBe(true);
    });

    it('fails for invalid status', () => {
        const result = validateRsvp({ status: 'maybe' as any });
        expect(result.valid).toBe(false);
    });

    it('fails when status is missing', () => {
        const result = validateRsvp({});
        expect(result.valid).toBe(false);
    });
});

describe('rsvpFromFirestoreDoc', () => {
    it('maps a complete doc with userId', () => {
        const r = rsvpFromFirestoreDoc('uid1', {
            userId: 'uid1',
            status: 'going',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
        });
        expect(r).not.toBeNull();
        expect(r!.userId).toBe('uid1');
        expect(r!.status).toBe('going');
        expect(r!.createdAt).toBeInstanceOf(Date);
    });

    it('defaults userId to doc id when missing', () => {
        const r = rsvpFromFirestoreDoc('uid1', {
            status: 'interested',
            createdAt: new Date(),
        });
        expect(r!.userId).toBe('uid1');
    });

    it('returns null for undefined data', () => {
        expect(rsvpFromFirestoreDoc('uid1', undefined)).toBeNull();
    });

    it('defaults invalid status to going', () => {
        const r = rsvpFromFirestoreDoc('uid1', { status: 'invalid', createdAt: new Date() });
        expect(r!.status).toBe('going');
    });
});

// ===========================================================================
// Notification
// ===========================================================================
describe('validateNotification', () => {
    it('passes for a valid notification', () => {
        const result = validateNotification({
            type: 'friend_request',
            actorUid: 'a',
            targetUid: 'b',
        });
        expect(result.valid).toBe(true);
    });

    it('fails for invalid type', () => {
        const result = validateNotification({
            type: 'invalid' as any,
            actorUid: 'a',
            targetUid: 'b',
        });
        expect(result.valid).toBe(false);
    });

    it('fails when actorUid is missing', () => {
        const result = validateNotification({ type: 'comment', targetUid: 'b' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('actorUid is required');
    });

    it('fails when targetUid is missing', () => {
        const result = validateNotification({ type: 'comment', actorUid: 'a' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('targetUid is required');
    });

    it('fails for self-notification', () => {
        const result = validateNotification({ type: 'comment', actorUid: 'a', targetUid: 'a' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('cannot notify yourself');
    });

    it('accepts all valid types', () => {
        for (const type of ['friend_request', 'event_live', 'comment', 'reply'] as const) {
            const result = validateNotification({ type, actorUid: 'a', targetUid: 'b' });
            expect(result.valid).toBe(true);
        }
    });
});

describe('notificationFromFirestoreDoc', () => {
    it('maps a complete doc', () => {
        const n = notificationFromFirestoreDoc('n1', {
            type: 'comment',
            actorUid: 'uid1',
            actorName: 'Alice',
            targetUid: 'uid2',
            eventId: 'evt1',
            commentId: 'c1',
            rootCommentId: 'c0',
            createdAt: { seconds: 1700000000, nanoseconds: 0 },
            readAt: null,
        });
        expect(n).not.toBeNull();
        expect(n!.type).toBe('comment');
        expect(n!.actorUid).toBe('uid1');
        expect(n!.actorName).toBe('Alice');
        expect(n!.targetUid).toBe('uid2');
        expect(n!.eventId).toBe('evt1');
        expect(n!.commentId).toBe('c1');
        expect(n!.rootCommentId).toBe('c0');
        expect(n!.readAt).toBeNull();
    });

    it('returns null for undefined data', () => {
        expect(notificationFromFirestoreDoc('n1', undefined)).toBeNull();
    });

    it('defaults invalid type to comment', () => {
        const n = notificationFromFirestoreDoc('n1', {
            type: 'invalid',
            actorUid: 'a',
            targetUid: 'b',
            createdAt: new Date(),
        });
        expect(n!.type).toBe('comment');
    });

    it('handles missing optional fields', () => {
        const n = notificationFromFirestoreDoc('n1', {
            type: 'friend_request',
            actorUid: 'a',
            targetUid: 'b',
            createdAt: new Date(),
        });
        expect(n!.eventId).toBeUndefined();
        expect(n!.commentId).toBeUndefined();
        expect(n!.actorName).toBeUndefined();
    });
});
