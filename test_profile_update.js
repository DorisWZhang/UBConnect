import { readFileSync } from 'fs';
import * as firebaseRules from '@firebase/rules-unit-testing';

const PROJECT_ID = "ubconnect-test-env-edit";

async function testUpdate() {
  const testEnv = await firebaseRules.initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  const authDb = testEnv.authenticatedContext('alice', {
    sub: 'alice',
    email: 'alice@student.ubc.ca',
    email_verified: true
  }).firestore();

  // 1. Create native profile
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();
    await adminDb.doc('users/alice').set({
      name: "Old Name",
      email: "alice@student.ubc.ca",
      createdAt: new Date()
    });
  });

  // 2. Fetch existing and build merged
  const snap = await authDb.doc('users/alice').get();
  const existing = snap.data();

  const allowedKeys = [
    'displayName', 'displayNameLower', 'photoURL', 'bio',
    'program', 'year', 'interests', 'createdAt', 'lastActiveAt'
  ];
  const merged = {};
  for (const k of allowedKeys) {
    if (existing[k] !== undefined) merged[k] = existing[k];
  }

  // Update logic
  const update = {
    bio: "This is a bio update",
    interests: ["Sports", "Anime"],
    lastActiveAt: firebaseRules.assertFails(() => { }).constructor.prototype ? new Date() : new Date() // Just use Date for mock
  };
  Object.assign(merged, update);

  if (!merged.displayName) {
    merged.displayName = existing.name || 'UBC User';
    merged.displayNameLower = merged.displayName.toLowerCase();
  }
  if (!merged.createdAt) {
    merged.createdAt = new Date();
  }

  try {
    await firebaseRules.assertSucceeds(authDb.doc('users/alice').set(merged));
    console.log("UPDATE SUCCEEDED!");
  } catch (err) {
    console.error("UPDATE FAILED!", err);
  }

  await testEnv.cleanup();
}

testUpdate();
