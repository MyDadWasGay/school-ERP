"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { publicEnv } from "@/lib/env-public";

const firebaseConfig = publicEnv.firebase;

let firebaseAuthInstance: ReturnType<typeof getAuth> | undefined;

export function getFirebaseAuth() {
  if (!firebaseAuthInstance) {
    const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firebaseAuthInstance = getAuth(firebaseApp);
  }
  return firebaseAuthInstance;
}
