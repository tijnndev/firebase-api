importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCeTNDAPWl0mYoZQ6zOPjqcFktzLv3P91M",
  authDomain: "native-app-986da.firebaseapp.com",
  projectId: "native-app-986da",
  storageBucket: "native-app-986da.firebasestorage.app",
  messagingSenderId: "238680437595",
  appId: "1:238680437595:web:7b368861412401cf15e07e",
  measurementId: "G-VP3Q8GP3Y0"
});

const messaging = firebase.messaging();
