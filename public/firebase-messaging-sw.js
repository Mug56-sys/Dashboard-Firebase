import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";


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

const firebaseApp = initializeApp(firebaseConfig);
const messaging=getMessaging(firebaseApp)
messaging.onBackgroundMessage((payload)=>{
  console.log('[firebase-messaging-sw.js] Received background message ',payload);

  const notificationTitle=payload.notification?.title || "New Message";
  const notificationOptions={
    body:payload.notification?.body || 'You have a new message',
    icon:'/favicon.ico'
  }

  self.ServiceWorkerRegistration.showNotification(notificationTitle,notificationOptions)
})