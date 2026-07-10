import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA__jPC-2VA0N8EQUEPNP_BAJcrJKvrAPY",
  authDomain: "autenticacion-app-tu-casa.firebaseapp.com",
  projectId: "autenticacion-app-tu-casa",
  storageBucket: "autenticacion-app-tu-casa.firebasestorage.app",
  messagingSenderId: "479604908879",
  appId: "1:479604908879:web:4a45d6b3ec853d5aed9b3a"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
};