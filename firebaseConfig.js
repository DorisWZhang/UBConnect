import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAopxRE2QKISJ8pkXXpsiNNSlEEqPKbZ2c",
  authDomain: "ubconnect-793d3.firebaseapp.com",
  projectId: "ubconnect-793d3",
  storageBucket: "ubconnect-793d3.firebasestorage.app",
  messagingSenderId: "505763970947",
  appId: "1:505763970947:web:3bdb5a06d3fe387af500b6",
  measurementId: "G-K1PY1QN1LP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
// (Optional) import { getStorage } from 'firebase/storage';

// Replace the config object with your actual Firebase credentials const firebaseConfig = { apiKey: "YOUR_API_KEY", authDomain: "YOUR_PROJECT_ID.firebaseapp.com", projectId: "YOUR_PROJECT_ID", storageBucket: "YOUR_PROJECT_ID.appspot.com", messagingSenderId: "YOUR_SENDER_ID", appId: "YOUR_APP_ID", };

// Initialize Firebase const app = initializeApp(firebaseConfig);

// Export services for use throughout the app export const auth = getAuth(app); export const db = getFirestore(app); // export const storage = getStorage(app); // if you need file storage