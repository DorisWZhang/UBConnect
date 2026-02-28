// Firestore security rules tests
// Requires Firebase emulator: npx firebase emulators:start --only firestore
const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} = require('@firebase/rules-unit-testing');

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'ubconnect-test';

let testEnv;

// Helper to create an auth context for a verified UBC user
function verifiedUbcAuth(uid, email) {
    return {
        sub: uid,
        email: email || `${uid}@student.ubc.ca`,
        email_verified: true,
        token: {
            email: email || `${uid}@student.ubc.ca`,
            email_verified: true,
        },
    };
}

// Helper: unverified UBC user
function unverifiedUbcAuth(uid) {
    return {
        sub: uid,
        email: `${uid}@student.ubc.ca`,
        email_verified: false,
        token: {
            email: `${uid}@student.ubc.ca`,
            email_verified: false,
        },
    };
}

// Helper: verified non-UBC user
function verifiedNonUbcAuth(uid) {
    return {
        sub: uid,
        email: `${uid}@gmail.com`,
        email_verified: true,
        token: {
            email: `${uid}@gmail.com`,
            email_verified: true,
        },
    };
}

beforeAll(async () => {
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules, host: '127.0.0.1', port: 8080 },
    });
});

afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
    if (testEnv) await testEnv.clearFirestore();
});

// ================================================================
// Gating: Email verification + UBC domain
// ================================================================
describe('Global gating', () => {
    test('unverified user cannot read users collection', async () => {
        const db = testEnv.authenticatedContext('alice', unverifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').get());
    });

    test('non-UBC email user cannot read users collection', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedNonUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').get());
    });

    test('unauthenticated user cannot read anything', async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(db.collection('users').doc('anybody').get());
    });

    test('verified UBC user can read users collection', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('alice').set({ displayName: 'Alice' });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('users').doc('alice').get());
    });

    test('unverified user cannot read events', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Test', description: 'Test', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', unverifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').get());
    });

    test('non-UBC user cannot read events', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Test', description: 'Test', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedNonUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').get());
    });
});

// ================================================================
// User profiles
// ================================================================
describe('User profiles', () => {
    test('verified UBC user can create own profile', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('users').doc('alice').set({
            displayName: 'Alice',
            displayNameLower: 'alice',
            bio: '',
            interests: [],
            createdAt: new Date(),
            lastActiveAt: new Date(),
        }));
    });

    test('user cannot create profile for another user', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').set({
            displayName: 'Bob',
            createdAt: new Date(),
        }));
    });

    test('user can read other profiles', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('bob').set({ displayName: 'Bob' });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('users').doc('bob').get());
    });

    test('profile displayName cannot exceed 50 chars', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').set({
            displayName: 'A'.repeat(51),
            createdAt: new Date(),
        }));
    });
});

// ================================================================
// Events
// ================================================================
describe('Events', () => {
    test('verified UBC user can create public event', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('connectEvents').add({
            title: 'Study Session',
            description: 'Meet at Nest',
            visibility: 'public',
            createdBy: 'alice',
            categoryId: 'Academic',
            createdAt: new Date(),
        }));
    });

    test('title cannot exceed 80 chars', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('connectEvents').add({
            title: 'X'.repeat(81),
            description: 'Test',
            visibility: 'public',
            createdBy: 'alice',
            createdAt: new Date(),
        }));
    });

    test('cannot create event as another user', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('connectEvents').add({
            title: 'Test',
            description: 'Test',
            visibility: 'public',
            createdBy: 'bob',
            createdAt: new Date(),
        }));
    });

    test('friends-only event visible to creator', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Private Event',
                description: 'Friends only',
                visibility: 'friends',
                createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('connectEvents').doc('e1').get());
    });

    test('friends-only event hidden from non-friend', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Private Event',
                description: 'Friends only',
                visibility: 'friends',
                createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').get());
    });

    test('friends-only event visible to friend', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Private Event',
                description: 'Friends only',
                visibility: 'friends',
                createdBy: 'alice',
            });
            // Create friend edge: alice has bob as friend
            await admin.collection('users').doc('alice').collection('friends').doc('bob').set({
                friendUid: 'bob', since: new Date(), createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('connectEvents').doc('e1').get());
    });

    test('only creator can delete an event', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'Test', visibility: 'public', createdBy: 'alice',
            });

        });
        const aliceDb = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(aliceDb.collection('connectEvents').doc('e1').delete());
    });

    test('non-creator cannot delete an event', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'Test', visibility: 'public', createdBy: 'alice',
            });

        });
        const bobDb = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(bobDb.collection('connectEvents').doc('e1').delete());
    });
});

// ================================================================
// Comments
// ================================================================
describe('Comments', () => {
    test('can add a comment to a public event', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Public Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('connectEvents').doc('e1').collection('comments').add({
            text: 'Great event!',
            createdBy: 'bob',
            createdByName: 'Bob',
            createdAt: new Date(),
            parentId: null,
            rootId: null,
            replyToUid: null,
        }));
    });

    test('comment text cannot exceed 500 chars', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('comments').add({
            text: 'X'.repeat(501),
            createdBy: 'bob',
            createdAt: new Date(),
            parentId: null,
            rootId: null,
        }));
    });

    test('cannot spoof createdBy on a comment', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('comments').add({
            text: 'Spoofed!',
            createdBy: 'alice',
            createdAt: new Date(),
            parentId: null,
        }));
    });
});

// ================================================================
// RSVPs
// ================================================================
describe('RSVPs', () => {
    test('can RSVP to a public event with matching visibilitySnapshot', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('connectEvents').doc('e1').collection('rsvps').doc('bob').set({
            userId: 'bob',
            status: 'going',
            visibilitySnapshot: 'public',
            createdAt: new Date(),
        }));
    });

    test('cannot RSVP to a public event with mismatched visibilitySnapshot', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('rsvps').doc('bob').set({
            userId: 'bob',
            status: 'going',
            visibilitySnapshot: 'friends', // Mismatched!
            createdAt: new Date(),
        }));
    });

    test('cannot RSVP without visibilitySnapshot (keys check)', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('rsvps').doc('bob').set({
            userId: 'bob',
            status: 'going',
            createdAt: new Date(),
        }));
    });

    test('cannot RSVP as another user', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('rsvps').doc('alice').set({
            userId: 'alice',
            status: 'going',
            createdAt: new Date(),
        }));
    });

    test('RSVP userId must match doc id', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('rsvps').doc('bob').set({
            userId: 'alice',
            status: 'going',
            createdAt: new Date(),
        }));
    });

    test('invalid RSVP status is rejected', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('rsvps').doc('bob').set({
            userId: 'bob',
            status: 'maybe',
            createdAt: new Date(),
        }));
    });
});

// ================================================================
// Friend Requests
// ================================================================
describe('Friend Requests', () => {
    test('can create a pending friend request', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('friendRequests').doc('alice_bob').set({
            fromUid: 'alice',
            toUid: 'bob',
            status: 'pending',
            createdAt: new Date(),
        }));
    });

    test('cannot create request with non-pending status', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('friendRequests').doc('alice_bob').set({
            fromUid: 'alice',
            toUid: 'bob',
            status: 'accepted',
            createdAt: new Date(),
        }));
    });

    test('cannot create request as another user', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('friendRequests').doc('bob_charlie').set({
            fromUid: 'bob',
            toUid: 'charlie',
            status: 'pending',
            createdAt: new Date(),
        }));
    });

    test('ID must match fromUid_toUid', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('friendRequests').doc('wrong_id').set({
            fromUid: 'alice',
            toUid: 'bob',
            status: 'pending',
            createdAt: new Date(),
        }));
    });

    test('receiver can accept a pending request', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('friendRequests').doc('alice_bob').update({
            status: 'accepted', respondedAt: new Date(),
        }));
    });

    test('sender cannot accept their own request', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('friendRequests').doc('alice_bob').update({
            status: 'accepted',
        }));
    });

    test('sender can cancel their pending request', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('friendRequests').doc('alice_bob').update({
            status: 'cancelled', respondedAt: new Date(),
        }));
    });
});

// ================================================================
// Friend Edges
// ================================================================
describe('Friend Edges', () => {
    test('can create own friend edge when accepted request exists', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'accepted', createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('users').doc('bob').collection('friends').doc('alice').set({
            friendUid: 'alice', since: new Date(), createdAt: new Date(),
        }));
    });

    test('cannot create friend edge for another user', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'accepted', createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('friends').doc('alice').set({
            friendUid: 'alice', since: new Date(), createdAt: new Date(),
        }));
    });

    // --- PREVIOUSLY FAILING TEST THAT WAS FIXED ---
    test('cannot create friend edge without accepted request', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').collection('friends').doc('bob').set({
            friendUid: 'bob', since: new Date(), createdAt: new Date(),
        }));
    });

    test('can delete own friend edge', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('alice').collection('friends').doc('bob').set({
                friendUid: 'bob', since: new Date(), createdAt: new Date(),
            });

        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('users').doc('alice').collection('friends').doc('bob').delete());
    });
});

// ================================================================
// Notifications
// ================================================================
describe('Notifications', () => {
    test('can create notification for another user (anti-spoofing)', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertSucceeds(db.collection('users').doc('bob').collection('notifications').add({
            type: 'friend_request',
            actorUid: 'alice',
            targetUid: 'bob',
            createdAt: new Date(),
        }));
    });

    test('cannot spoof actorUid on notification', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('notifications').add({
            type: 'friend_request',
            actorUid: 'charlie',
            targetUid: 'bob',
            createdAt: new Date(),
        }));
    });

    test('targetUid must match collection owner', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('notifications').add({
            type: 'friend_request',
            actorUid: 'alice',
            targetUid: 'charlie',
            createdAt: new Date(),
        }));
    });

    test('only recipient can read their notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('bob').collection('notifications').doc('n1').set({
                type: 'comment', actorUid: 'alice', targetUid: 'bob', createdAt: new Date(),
            });

        });
        const bobDb = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(bobDb.collection('users').doc('bob').collection('notifications').doc('n1').get());

        const aliceDb = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(aliceDb.collection('users').doc('bob').collection('notifications').doc('n1').get());
    });

    test('recipient can mark notification as read', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('bob').collection('notifications').doc('n1').set({
                type: 'comment', actorUid: 'alice', targetUid: 'bob', createdAt: new Date(), readAt: null,
            });

        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('users').doc('bob').collection('notifications').doc('n1').update({
            readAt: new Date(),
        }));
    });

    test('invalid notification type is rejected', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('notifications').add({
            type: 'invalid_type',
            actorUid: 'alice',
            targetUid: 'bob',
            createdAt: new Date(),
        }));
    });

    test('recipient can delete their own notification', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('bob').collection('notifications').doc('n1').set({
                type: 'friend_request', actorUid: 'alice', targetUid: 'bob', createdAt: new Date()
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('users').doc('bob').collection('notifications').doc('n1').delete());
    });

    test('non-recipient cannot delete someone else\'s notification', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('bob').collection('notifications').doc('n1').set({
                type: 'friend_request', actorUid: 'alice', targetUid: 'bob', createdAt: new Date()
            });
        });
        const db = testEnv.authenticatedContext('alice', verifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('notifications').doc('n1').delete());
    });
});

// ================================================================
// Phase 2: Batch friend accept (getAfter/existsAfter)
// ================================================================
describe('Batch Friend Accept', () => {
    test('batch: update request + create both friend edges succeeds', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: new Date(),
            });
        });
        // Bob accepts: updates request status + creates both edges in one batch
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        const batch = db.batch();

        const reqRef = db.collection('friendRequests').doc('alice_bob');
        batch.update(reqRef, { status: 'accepted', respondedAt: new Date() });

        const edgeA = db.collection('users').doc('bob').collection('friends').doc('alice');
        batch.set(edgeA, { friendUid: 'alice', since: new Date(), createdAt: new Date() });

        const edgeB = db.collection('users').doc('alice').collection('friends').doc('bob');
        batch.set(edgeB, { friendUid: 'bob', since: new Date(), createdAt: new Date() });

        await assertSucceeds(batch.commit());
    });

    test('cannot create friend edge without batch-accepted request', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('friendRequests').doc('alice_bob').set({
                fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: new Date(),
            });
        });
        // Try to create edge without accepting request
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('users').doc('bob').collection('friends').doc('alice').set({
            friendUid: 'alice', since: new Date(), createdAt: new Date(),
        }));
    });
});

// ================================================================
// Phase 2: Comment creation with known rootId
// ================================================================
describe('Comment creation (no update needed)', () => {
    test('can create top-level comment with rootId set to own doc id', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        // Using a known doc ID and setting rootId to that ID on create
        const commentRef = db.collection('connectEvents').doc('e1').collection('comments').doc('comment1');
        await assertSucceeds(commentRef.set({
            text: 'Top-level comment',
            createdBy: 'bob',
            createdByName: 'Bob',
            createdAt: new Date(),
            parentId: null,
            rootId: 'comment1',
            replyToUid: null,
        }));
    });

    test('can create reply with parentId pointing to root', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });
            await admin.collection('connectEvents').doc('e1').collection('comments').doc('root1').set({
                text: 'Root', createdBy: 'alice', createdAt: new Date(),
                parentId: null, rootId: 'root1', replyToUid: null,
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('connectEvents').doc('e1').collection('comments').doc('reply1').set({
            text: 'A reply!',
            createdBy: 'bob',
            createdAt: new Date(),
            parentId: 'root1',
            rootId: 'root1',
            replyToUid: 'alice',
        }));
    });

    test('cannot update a comment (rootId or text)', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('connectEvents').doc('e1').set({
                title: 'Event', description: 'D', visibility: 'public', createdBy: 'alice',
            });
            await admin.collection('connectEvents').doc('e1').collection('comments').doc('c1').set({
                text: 'Original', createdBy: 'bob', createdAt: new Date(),
                parentId: null, rootId: null, replyToUid: null,
            });
        });
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertFails(db.collection('connectEvents').doc('e1').collection('comments').doc('c1').update({
            rootId: 'c1',
        }));
    });
});

// ================================================================
// Phase 2: User profile isAuthorized gating
// ================================================================
describe('User profile isAuthorized gating', () => {
    test('unverified user cannot create own profile', async () => {
        const db = testEnv.authenticatedContext('alice', unverifiedUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').set({
            displayName: 'Alice',
            displayNameLower: 'alice',
            bio: '',
            interests: [],
            createdAt: new Date(),
            lastActiveAt: new Date(),
        }));
    });

    test('non-UBC user cannot create own profile', async () => {
        const db = testEnv.authenticatedContext('alice', verifiedNonUbcAuth('alice')).firestore();
        await assertFails(db.collection('users').doc('alice').set({
            displayName: 'Alice',
            displayNameLower: 'alice',
            bio: '',
            interests: [],
            createdAt: new Date(),
            lastActiveAt: new Date(),
        }));
    });
});

// ================================================================
// Phase 2: Friend edge cleanup (both sides)
// ================================================================
describe('Friend edge bidirectional delete', () => {
    test('friend can delete their edge from the other user list', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            // Alice has Bob as friend
            await admin.collection('users').doc('alice').collection('friends').doc('bob').set({
                friendUid: 'bob', since: new Date(), createdAt: new Date(),
            });
        });
        // Bob (the friend) can delete Alice's edge for bob
        const db = testEnv.authenticatedContext('bob', verifiedUbcAuth('bob')).firestore();
        await assertSucceeds(db.collection('users').doc('alice').collection('friends').doc('bob').delete());
    });

    test('unrelated user cannot delete friend edge', async () => {
        await testEnv.withSecurityRulesDisabled(async (ctx) => {
            const admin = ctx.firestore();
            await admin.collection('users').doc('alice').collection('friends').doc('bob').set({
                friendUid: 'bob', since: new Date(), createdAt: new Date(),
            });
        });
        // Charlie (unrelated) cannot delete alice-bob edge
        const db = testEnv.authenticatedContext('charlie', verifiedUbcAuth('charlie')).firestore();
        await assertFails(db.collection('users').doc('alice').collection('friends').doc('bob').delete());
    });
});
