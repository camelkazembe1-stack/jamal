






































import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";







export const SERVER_CONFIG = {
  
  active: "firebase",

  servers: {
    firebase: {
      label: "Firebase - Google auth + Cloud Firestore",
      hosting: "Vercel static hosting (public/ folder)",
      auth: "google-popup",
      database: "cloud-firestore",
      analytics: false,
      config: {
        apiKey: "AIzaSyCtE7p5LM8L2yaJB0JJCyyTz763CBQhKGE",
        authDomain: "jamal-542b5.firebaseapp.com",
        projectId: "jamal-542b5",
        storageBucket: "jamal-542b5.firebasestorage.app",
        messagingSenderId: "401281850731",
        appId: "1:401281850731:web:afa3ff6dca4d9e095c402e",
        measurementId: "G-DHB2DJ769H"
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
  }
};







function firebaseConnector(cfg) {
  const app = initializeApp(cfg.config);

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const db = getFirestore(app);

  
  if (cfg.analytics) {
    isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});
  }

  return {
    name: "firebase",
    app,
    auth,
    provider,
    db,
    authApi: { onAuthStateChanged, signInWithPopup, signOut },
    firestore: {
      getFirestore, collection, doc, addDoc, writeBatch,
      query, where, orderBy, onSnapshot,
      serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc,
      getDoc, limit, arrayUnion, arrayRemove, increment, deleteField
    }
  };
}

const CONNECTORS = { firebase: firebaseConnector };





const activeName = SERVER_CONFIG.active;
const activeCfg = SERVER_CONFIG.servers[activeName];
if (!activeCfg) {
  throw new Error("[server.js] no configuration found for server: " + activeName);
}
const connectorFactory = CONNECTORS[activeName];
if (!connectorFactory) {
  throw new Error(
    "[server.js] no connector implemented for server: " + activeName +
    " - add one in this file, then the whole project follows it."
  );
}
const connector = connectorFactory(activeCfg);


export const server = {
  name: connector.name,
  info: {
    name: connector.name,
    label: activeCfg.label,
    hosting: activeCfg.hosting,
    auth: activeCfg.auth,
    database: activeCfg.database
  },
  app: connector.app,
  auth: connector.auth,
  provider: connector.provider,
  db: connector.db,
  authApi: connector.authApi,
  firestore: connector.firestore
};
