// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// These values will be picked up from the main app's firebase configuration.
firebase.initializeApp({
  apiKey: "AIzaSyD6yhngorYwZpdGVgIwY8KFodsxTG55r-U",
  authDomain: "breathometer6.firebaseapp.com",
  projectId: "breathometer6",
  storageBucket: "breathometer6.firebasestorage.app",
  messagingSenderId: "124093463358",
  appId: "1:124093463358:web:df84c2cf31506bbf144a6f"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/badge.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
