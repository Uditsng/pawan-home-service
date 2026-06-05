/**
 * Firebase Admin SDK — Server-Side Initialization
 *
 * This module lazily initializes the Firebase Admin SDK using
 * environment variables. It MUST only be imported in server-side
 * code (server actions, API routes, middleware).
 *
 * Required env vars (server-only):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let firebaseApp: App | undefined;

function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    // Firebase is not configured — FCM push will be silently skipped.
    // In-app database notifications will still work.
    console.warn(
      "[firebase-admin] Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY. " +
        "Push notifications via FCM are disabled."
    );
    return null;
  }

  // Prevent duplicate initialization across hot-reloads in dev
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Handle escaped newlines from env variable
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseApp;
}

/**
 * Returns the Firebase Cloud Messaging instance, or null if
 * Firebase is not configured.
 */
export function getFirebaseMessaging(): Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getMessaging(app);
}
