// Firebase configuration for miruwebAR
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// 環境変数から読み込む（Viteでは import.meta.env.VITE_* を使用）
// デフォルト値は後方互換性のため保持（本番環境では環境変数の使用を推奨）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "miruwebar.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "miruwebar",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "miruwebar.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "432056187652",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:432056187652:web:6b1afd0f4f75e7ed132e51"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Storage
const storage = getStorage(app);

export { app, storage };
