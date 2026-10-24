/**
 * Firebase ADMIN SDK — server-side only.
 *
 * Used to verify the Firebase ID token the client sends after sign-in.
 * Credentials come from env vars and never reach the browser.
 *
 * Options:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — full service-account JSON as one line
 *                                   (needed on non-GCP hosts like Vercel)
 *   (blank)                       — falls back to Application Default
 *                                   Credentials (works on Cloud Run / GCP)
 */

import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length) return getApp();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Minimal init — enough for verifyIdToken() without a service account file.
  return initializeApp({ projectId });
}

export function getAdminAuth() {
  initAdmin();
  return getAuth();
}
