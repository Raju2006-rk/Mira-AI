/**
 * Firebase CLIENT SDK — runs in the browser only.
 *
 * Config values are hardcoded (not from env vars) because:
 *  1. NEXT_PUBLIC_ vars are sometimes undefined during SSR/pre-rendering,
 *     causing "auth/invalid-api-key" build errors.
 *  2. These values are PUBLIC — they only identify the Firebase project.
 *     Security comes from Firebase Security Rules and the Admin SDK, not
 *     from hiding these strings (they are visible in the browser anyway).
 *
 * Firebase is initialised LAZILY (only when getFirebaseAuth() is called)
 * so module evaluation never touches the SDK during server-side rendering.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

// ── Hardcoded public config (safe to commit) ────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCombIOX1v3QT-qIfkn14B7_jtP2_xEzx4",
  authDomain: "mira-ai-ca492.firebaseapp.com",
  projectId: "mira-ai-ca492",
  storageBucket: "mira-ai-ca492.firebasestorage.app",
  messagingSenderId: "82708260891",
  appId: "1:82708260891:web:56897045af882e9fc270be",
  measurementId: "G-4RR9S1NB22",
};
// ────────────────────────────────────────────────────────────────────────────

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/**
 * Returns the Firebase App singleton. Safe to call multiple times.
 * Only initialises on first call — never during SSR/build.
 */
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return _app;
}

/**
 * Returns the Firebase Auth singleton.
 * Always call this inside a browser event handler or useEffect — never at
 * module top level.
 */
export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
};
