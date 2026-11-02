// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAolRfZQ40SHJ6rXTFxXC2bkjn0l_SROL0",
  authDomain: "mobileapps-865e7.firebaseapp.com",
  projectId: "mobileapps-865e7",
  storageBucket: "mobileapps-865e7.firebasestorage.app",
  messagingSenderId: "323164159198",
  appId: "1:323164159198:web:84c13cd2ec32822eeb164f",
  measurementId: "G-N830H24ZXM"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// Analytics removed: the Firebase JS SDK doesn't support it on iOS/Android.
export const storage = getStorage(app);