// Firebase configuration for miruwebAR
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// 環境変数から読み込む（Viteでは import.meta.env.VITE_* を使用）
// Firebase設定はオプショナル（BYO ホスティングのため）
const envVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase設定の有無をチェック
const missingVars = Object.entries(envVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

const isFirebaseConfigured = missingVars.length === 0;

if (!isFirebaseConfigured) {
  console.warn(
    `⚠️ Firebase設定が不完全です（オプショナル）: 以下の環境変数が設定されていません: ${missingVars.join(", ")}\n` +
    `Firebase機能を使用する場合は、.env ファイルを作成し、env.example を参考に設定してください。\n` +
    `Firebase設定がない場合でも、ローカルストレージ（IndexedDB）を使用してプロジェクトを編集・保存できます。`
  );
}

// Firebase設定がある場合のみ初期化
let app = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: envVars.apiKey,
      authDomain: envVars.authDomain,
      projectId: envVars.projectId,
      storageBucket: envVars.storageBucket,
      messagingSenderId: envVars.messagingSenderId,
      appId: envVars.appId,
    };

    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Storage
    storage = getStorage(app);

    console.log("✅ Firebase初期化完了");
  } catch (error) {
    console.error("❌ Firebase初期化エラー:", error);
    app = null;
    storage = null;
  }
}

export { app, storage, isFirebaseConfigured };
