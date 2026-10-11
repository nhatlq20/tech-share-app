import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAI9YZWIn1zSGy1-WndSNDrz_RB003RE6k',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'tech-share-80539.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'tech-share-80539',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'tech-share-80539.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '215197206890',
  appId: process.env.FIREBASE_APP_ID || '1:215197206890:web:645a4a4fe0136ff6f4bd13',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-WEJH0576JW',
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export default db;
