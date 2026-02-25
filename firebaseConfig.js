// firebaseConfig.js — Single Firebase initialization from env vars
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Runtime guard: ensure all required EXPO_PUBLIC_FIREBASE_* env vars are set.
// ---------------------------------------------------------------------------
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  const msg =
    `[UBConnect] Missing required environment variables:\n` +
    missing.map((k) => `  • ${k}`).join('\n') +
    `\n\nCopy .env.example to .env and fill in your Firebase project values.`;
  console.error(msg);
  throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Firebase config — all values sourced from Expo public env vars
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Single initialization — one app, one auth, one db
import { Platform } from 'react-native';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);

// Try using getAuth uniformly instead of initializeAuth for React Native and Expo
const authInstance = getAuth(app);
export const auth = authInstance;

export const db = getFirestore(app);
export default app;