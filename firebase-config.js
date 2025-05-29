// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7hkLfyuuSiaSautZtay4GMiGfUOPlO9E",
  authDomain: "folga-f510e.firebaseapp.com",
  databaseURL: "https://folga-f510e-default-rtdb.firebaseio.com",
  projectId: "folga-f510e",
  storageBucket: "folga-f510e.appspot.com",
  messagingSenderId: "512417416816",
  appId: "1:512417416816:web:9dea4f7668ccebb834d6b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { app, auth, database, storage };