// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCngCSzS2Br0PJwpgmLaqKzuYq3yTU4QU0",
  authDomain: "personal-dashboard-4579f.firebaseapp.com",
  databaseURL: "https://personal-dashboard-4579f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "personal-dashboard-4579f",
  storageBucket: "personal-dashboard-4579f.firebasestorage.app",
  messagingSenderId: "542539197845",
  appId: "1:542539197845:web:5ac7d4346cdd1829895a9c",
  measurementId: "G-P17SLX32V3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
//const analytics = getAnalytics(app);