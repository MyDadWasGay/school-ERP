import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminAuth: Auth | undefined;

export function getFirebaseAdminAuth() {
  if (adminAuth) return adminAuth;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return undefined;
  const app: App = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  adminAuth = getAuth(app);
  return adminAuth;
}
