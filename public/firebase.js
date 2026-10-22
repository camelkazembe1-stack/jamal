// JAMALI Firebase configuration
// Firebase SDK is loaded from Google's CDN for browser compatibility.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAnalytics,
  isSupported
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: "jamal-542b5",
  storageBucket: "jamal-542b5.firebasestorage.app",
  messagingSenderId: "401281850731",
  appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
  measurementId: "G-DHB2DJ769H"
};

// Initialize the Firebase application.
const app = initializeApp(firebaseConfig);

// Initialize Analytics only when the browser supports it.
let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn("JAMALI Firebase Analytics is unavailable:", error);
    });
}

export { app, analytics };
export default app;
