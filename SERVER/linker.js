










































import { server, SERVER_CONFIG } from "./server.js";


export const activeServer = SERVER_CONFIG.active;
export const serverInfo = server.info;


export const auth = server.auth;
export const provider = server.provider;
export const onAuthStateChanged = server.authApi.onAuthStateChanged;
export const signInWithPopup = server.authApi.signInWithPopup;
export const signOut = server.authApi.signOut;


export const db = server.db;
export const getFirestore = server.firestore.getFirestore;
export const collection = server.firestore.collection;
export const doc = server.firestore.doc;
export const addDoc = server.firestore.addDoc;
export const updateDoc = server.firestore.updateDoc;
export const deleteDoc = server.firestore.deleteDoc;
export const getDocs = server.firestore.getDocs;
export const getDoc = server.firestore.getDoc;
export const setDoc = server.firestore.setDoc;
export const writeBatch = server.firestore.writeBatch;
export const query = server.firestore.query;
export const where = server.firestore.where;
export const orderBy = server.firestore.orderBy;
export const limit = server.firestore.limit;
export const onSnapshot = server.firestore.onSnapshot;
export const serverTimestamp = server.firestore.serverTimestamp;
export const Timestamp = server.firestore.Timestamp;
export const arrayUnion = server.firestore.arrayUnion;
export const arrayRemove = server.firestore.arrayRemove;
export const increment = server.firestore.increment;
export const deleteField = server.firestore.deleteField;





export const SYSTEM_SESSION_KEY = "JAMALI_SYSTEM_SESSION";



const ALWAYS_OPEN = ["home", "account-recovery"];

export function readSystemSession() {
  try {
    const raw = sessionStorage.getItem(SYSTEM_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearSystemSession() {
  try { sessionStorage.removeItem(SYSTEM_SESSION_KEY); } catch (e) {}
}


function currentFolder() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length ? parts[0] : "";
}


function folderAllowed(folder, session) {
  if (!session) return false;
  if (session.role === "admin") return true;
  if (folder === "system-admin") return false;
  if (ALWAYS_OPEN.indexOf(folder) !== -1) return true;
  return Array.isArray(session.grants) && session.grants.indexOf(folder) !== -1;
}







export function requireAuth() {
  return new Promise((resolve) => {
    server.authApi.onAuthStateChanged(server.auth, (user) => {
      if (!user) {
        clearSystemSession();
        location.replace("/?need=house");
        return;
      }
      const s = readSystemSession();
      if (s && s.uid !== user.uid) {
         
        s.uid = user.uid;
        try { sessionStorage.setItem(SYSTEM_SESSION_KEY, JSON.stringify(s)); } catch (e) {}
      }
       
      resolve(user);
    });
  });
}







export const JamalLinker = {
  
  server() {
    return { ...server.info };
  },

  
  auth: {
    currentUser() { return server.auth ? server.auth.currentUser : null; },
    signInGoogle() {
      return server.authApi.signInWithPopup(server.auth, server.provider);
    },
    signOut() { return server.authApi.signOut(server.auth); },
    requireAuth
  },

  
  session: {
    read: readSystemSession,
    clear: clearSystemSession,
    folderAllowed: (folder) => folderAllowed(folder, readSystemSession())
  },

  
  db: {
    add(collectionName, data) {
      const ref = server.firestore.collection(server.db, collectionName);
      return server.firestore.addDoc(ref, {
        ...data,
        createdAt: server.firestore.serverTimestamp()
      });
    },
    get(collectionName, id) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.getDoc(ref);
    },
    list(collectionName, ...constraints) {
      const base = server.firestore.collection(server.db, collectionName);
      const q = constraints.length
        ? server.firestore.query(base, ...constraints)
        : base;
      return server.firestore.getDocs(q);
    },
    set(collectionName, id, data, options) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.setDoc(ref, data, options);
    },
    update(collectionName, id, data) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.updateDoc(ref, data);
    },
    delete(collectionName, id) {
      const ref = server.firestore.doc(server.db, collectionName, id);
      return server.firestore.deleteDoc(ref);
    },
    watch(collectionName, callback, ...constraints) {
      const base = server.firestore.collection(server.db, collectionName);
      const q = constraints.length
        ? server.firestore.query(base, ...constraints)
        : base;
      return server.firestore.onSnapshot(q, callback);
    }
  },

  
  
  
  raw() {
    return {
      app: server.app,
      auth: server.auth,
      db: server.db,
      authApi: server.authApi,
      firestore: server.firestore
    };
  }
};
