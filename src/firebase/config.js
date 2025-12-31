// Firebase configuration for miruwebAR
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE",
  authDomain: "miruwebar.firebaseapp.com",
  projectId: "miruwebar",
  storageBucket: "miruwebar.firebasestorage.app",
  messagingSenderId: "432056187652",
  appId: "1:432056187652:web:6b1afd0f4f75e7ed132e51"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Storage
const storage = getStorage(app);

export { app, storage };
