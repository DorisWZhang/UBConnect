import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// (Optional) import { getStorage } from 'firebase/storage';

// Replace the config object with your actual Firebase credentials const firebaseConfig = { apiKey: "YOUR_API_KEY", authDomain: "YOUR_PROJECT_ID.firebaseapp.com", projectId: "YOUR_PROJECT_ID", storageBucket: "YOUR_PROJECT_ID.appspot.com", messagingSenderId: "YOUR_SENDER_ID", appId: "YOUR_APP_ID", };

// Initialize Firebase const app = initializeApp(firebaseConfig);

// Export services for use throughout the app export const auth = getAuth(app); export const db = getFirestore(app); // export const storage = getStorage(app); // if you need file storage