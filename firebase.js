import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
  authDomain: "jamal-542b5.firebaseapp.com",
  projectId: "jamal-542b5",
  storageBucket: "jamal-542b5.firebasestorage.app",
  messagingSenderId: "401281850731",
  appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
  measurementId: "G-DHB2DJ769H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics requires a browser environment and is not supported in every environment.
let analytics = null;

if (typeof window !== "undefined") {
  getAnalytics(app);
}

export { app, analytics };
export default app;
