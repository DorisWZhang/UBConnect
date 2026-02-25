/**
 * @jest-environment node
 */

/**
 * Firestore Security Rules tests — requires Firebase emulator running.
 *
 * Run: npm run test:rules
 * Or:  firebase emulators:exec --only firestore "jest __tests__/firestore.rules.test.js"
 */

// Force the Firestore SDK to use the emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { setDoc, doc, getDoc, deleteDoc } = require('firebase/firestore');

const PROJECT_ID = 'ubconnect-test';

let testEnv;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync('firestore.rules', 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
    });
}, 30000);

afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
    if (testEnv) await testEnv.clearFirestore();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function verifiedUser(uid = 'user1', email = 'alice@student.ubc.ca') {
    return testEnv.authenticatedContext(uid, {
        email,
        email_verified: true,
    });
}

function unverifiedUser(uid = 'unverified1', email = 'bob@student.ubc.ca') {
    return testEnv.authenticatedContext(uid, {
        email,
        email_verified: false,
    });
}

function unauthenticatedUser() {
    return testEnv.unauthenticatedContext();
}

function validEvent(uid = 'user1') {
    return {
        title: 'Study Group',
        description: 'Library room 200',
        location: 'UBC Library',
        category: 'Academics',
        visibility: 'public',
        createdBy: uid,
        createdAt: new Date(),
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('connectEvents rules', () => {
    test('unauthenticated user cannot read', async () => {
        const ctx = unauthenticatedUser();
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertFails(getDoc(ref));
    });

    test('unauthenticated user cannot write', async () => {
        const ctx = unauthenticatedUser();
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertFails(setDoc(ref, validEvent()));
    });

    test('unverified user cannot write', async () => {
        const ctx = unverifiedUser();
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertFails(setDoc(ref, validEvent('unverified1')));
    });

    test('unverified user cannot read', async () => {
        const ctx = unverifiedUser();
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertFails(getDoc(ref));
    });

    test('verified user can create event with correct createdBy', async () => {
        const ctx = verifiedUser('user1');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertSucceeds(setDoc(ref, validEvent('user1')));
    });

    test('verified user cannot create event with spoofed createdBy', async () => {
        const ctx = verifiedUser('user1');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertFails(setDoc(ref, validEvent('someone-else')));
    });

    test('verified user cannot create event without title', async () => {
        const ctx = verifiedUser('user1');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        const badEvent = { ...validEvent('user1'), title: '' };
        await assertFails(setDoc(ref, badEvent));
    });

    test('verified user cannot create event without description', async () => {
        const ctx = verifiedUser('user1');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        const { description, ...noDesc } = validEvent('user1');
        await assertFails(setDoc(ref, noDesc));
    });

    test('verified user can read events', async () => {
        // Seed data using admin context
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            const ref = doc(adminCtx.firestore(), 'connectEvents', 'event1');
            await setDoc(ref, validEvent('user1'));
        });

        const ctx = verifiedUser('user2');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertSucceeds(getDoc(ref));
    });

    test('verified user can only update own event', async () => {
        // Seed event owned by user1
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            const ref = doc(adminCtx.firestore(), 'connectEvents', 'event1');
            await setDoc(ref, validEvent('user1'));
        });

        // user2 tries to update user1's event → should fail
        const ctx2 = verifiedUser('user2');
        const ref2 = doc(ctx2.firestore(), 'connectEvents', 'event1');
        await assertFails(setDoc(ref2, { ...validEvent('user2') }));
    });

    test('verified user can delete own event', async () => {
        // Seed
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            const ref = doc(adminCtx.firestore(), 'connectEvents', 'event1');
            await setDoc(ref, validEvent('user1'));
        });

        const ctx = verifiedUser('user1');
        const ref = doc(ctx.firestore(), 'connectEvents', 'event1');
        await assertSucceeds(deleteDoc(ref));
    });
});
