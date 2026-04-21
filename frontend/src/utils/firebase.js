import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// User provided configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD6yhngorYwZpdGVgIwY8KFodsxTG55r-U",
  authDomain: "breathometer6.firebaseapp.com",
  projectId: "breathometer6",
  storageBucket: "breathometer6.firebasestorage.app",
  messagingSenderId: "124093463358",
  appId: "1:124093463358:web:df84c2cf31506bbf144a6f",
  measurementId: "G-SYLYY7MDXE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics, firebaseConfig };
