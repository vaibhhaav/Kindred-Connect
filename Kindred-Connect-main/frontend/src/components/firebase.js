import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAv6WXTjfl6bbdEqVsMnyPG4vnlMLxg5wA",
  authDomain: "kindered-connect-f2a3f.firebaseapp.com",
  projectId: "kindered-connect-f2a3f",
  storageBucket: "kindered-connect-f2a3f.firebasestorage.app",
  messagingSenderId: "414291827430",
  appId: "1:414291827430:web:c3a1e4c051e14ad434b927",
  measurementId: "G-EQX5D7RS09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
