import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize messaging only on client side
let messaging: ReturnType<typeof getMessaging> | null = null;

export const getMessagingInstance = () => {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  }
  return null;
};

export const requestFCMToken = async () => {
  try {
    const msg = getMessagingInstance();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error("FCM Token error:", error);
    return null;
  }
};

export default app;
