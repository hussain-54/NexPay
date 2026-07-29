import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";

// Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase configuration is complete
const isConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: any;
let auth: any;
let db: any;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn(
    "Vite environment variables for Firebase are missing. Falling back to simulated local database layer."
  );
}

// Helper types
export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  phone: string;
  walletAddress: string;
  kycVerified: boolean;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  kycDetails?: {
    idFront?: string; // base64 string
    idBack?: string;  // base64 string
    selfie?: string;  // base64 string
    address?: {
      streetAddress?: string;
      city?: string;
      postalCode?: string;
    };
    submittedAt?: string;
  };
  createdAt: any;
  updatedAt: any;
}

// ==========================================
// SIMULATION LAYER (LOCALSTORAGE BACKED)
// ==========================================

const getSimulatedUsers = (): Record<string, UserProfile> => {
  const users = localStorage.getItem("nexpay_sim_users");
  return users ? JSON.parse(users) : {};
};

const saveSimulatedUser = (user: UserProfile) => {
  const users = getSimulatedUsers();
  users[user.uid] = user;
  localStorage.setItem("nexpay_sim_users", JSON.stringify(users));
};

const getSimulatedAuth = (): { currentUser: any } => {
  const session = localStorage.getItem("nexpay_sim_session");
  return { currentUser: session ? JSON.parse(session) : null };
};

const saveSimulatedSession = (user: any) => {
  localStorage.setItem("nexpay_sim_session", JSON.stringify(user));
};

const clearSimulatedSession = () => {
  localStorage.removeItem("nexpay_sim_session");
};

// Simulated Auth Subscription callbacks
const authListeners: Array<(user: any) => void> = [];

// ==========================================
// PUBLIC API HELPERS
// ==========================================

export const isFirebaseActive = (): boolean => {
  return isConfigured && !!app && !!auth && !!db;
};

/**
 * Register a new user in Firebase Auth and create their Firestore profile.
 */
export async function registerUserInFirebase(
  email: string,
  password: string,
  profile: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">
): Promise<UserProfile> {
  const telemetryData = {
    email,
    walletAddress: profile.walletAddress,
    action: "signup_attempt"
  };
  
  if (isFirebaseActive()) {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      const newProfile: UserProfile = {
        ...profile,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Save user profile in Firestore
      await setDoc(doc(db, "users", uid), newProfile);
      
      // Collect telemetry / analytic log
      await addDoc(collection(db, "events"), {
        eventName: "user_signup",
        userId: uid,
        walletAddress: profile.walletAddress,
        email: email,
        timestamp: serverTimestamp(),
      });
      
      return newProfile;
    } catch (err: any) {
      console.error("Firebase SignUp Error:", err);
      throw err;
    }
  } else {
    // Simulated path
    const users = getSimulatedUsers();
    
    // Check if email already registered
    const emailExists = Object.values(users).some(u => u.email === email);
    if (emailExists) {
      throw new Error("auth/email-already-in-use: Email address already registered.");
    }
    
    const uid = "sim_" + Math.random().toString(36).substring(2, 11);
    const newProfile: UserProfile = {
      ...profile,
      uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    saveSimulatedUser(newProfile);
    saveSimulatedSession({ uid, email });
    
    // Save simulated telemetry event
    const events = JSON.parse(localStorage.getItem("nexpay_sim_events") || "[]");
    events.push({
      eventName: "user_signup_simulated",
      userId: uid,
      walletAddress: profile.walletAddress,
      email: email,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("nexpay_sim_events", JSON.stringify(events));

    // Notify listeners
    authListeners.forEach(listener => listener({ uid, email }));

    return newProfile;
  }
}

/**
 * Sign in user with Email and Password
 */
export async function loginUserInFirebase(email: string, password: string): Promise<UserProfile> {
  if (isFirebaseActive()) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Retrieve profile details from Firestore
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        throw new Error("User profile not found in Firestore.");
      }
      
      const profileData = userDocSnap.data() as UserProfile;
      
      // Collect login telemetry
      await addDoc(collection(db, "events"), {
        eventName: "user_login",
        userId: uid,
        email: email,
        walletAddress: profileData.walletAddress,
        timestamp: serverTimestamp(),
      });
      
      return profileData;
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      throw err;
    }
  } else {
    // Simulated path
    const users = getSimulatedUsers();
    const foundUser = Object.values(users).find(u => u.email === email);
    
    if (!foundUser) {
      throw new Error("auth/user-not-found: No account exists with this email.");
    }
    
    // Simple password check mock (demo passwords just pass)
    saveSimulatedSession({ uid: foundUser.uid, email: foundUser.email });
    
    // Telemetry
    const events = JSON.parse(localStorage.getItem("nexpay_sim_events") || "[]");
    events.push({
      eventName: "user_login_simulated",
      userId: foundUser.uid,
      email: email,
      walletAddress: foundUser.walletAddress,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("nexpay_sim_events", JSON.stringify(events));

    // Notify listeners
    authListeners.forEach(listener => listener({ uid: foundUser.uid, email: foundUser.email }));

    return foundUser;
  }
}

/**
 * Update KYC Document info and status in Firestore
 */
export async function saveUserKYCData(
  uid: string, 
  kycDetails: NonNullable<UserProfile["kycDetails"]>
): Promise<void> {
  if (isFirebaseActive()) {
    try {
      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, {
        kycStatus: "pending",
        kycVerified: false,
        kycDetails: {
          ...kycDetails,
          submittedAt: new Date().toISOString()
        },
        updatedAt: serverTimestamp()
      });
      
      // Telemetry
      await addDoc(collection(db, "events"), {
        eventName: "kyc_submitted",
        userId: uid,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error saving KYC data to Firestore:", err);
      throw err;
    }
  } else {
    // Simulated path
    const users = getSimulatedUsers();
    if (!users[uid]) {
      throw new Error("User does not exist in simulation database.");
    }
    
    users[uid].kycStatus = "pending";
    users[uid].kycVerified = false;
    users[uid].kycDetails = {
      ...kycDetails,
      submittedAt: new Date().toISOString()
    };
    users[uid].updatedAt = new Date().toISOString();
    
    saveSimulatedUser(users[uid]);
    
    // Sync active session profile details
    const session = getSimulatedAuth().currentUser;
    if (session && session.uid === uid) {
      saveSimulatedSession({
        ...session,
        profile: users[uid]
      });
    }

    // Telemetry
    const events = JSON.parse(localStorage.getItem("nexpay_sim_events") || "[]");
    events.push({
      eventName: "kyc_submitted_simulated",
      userId: uid,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("nexpay_sim_events", JSON.stringify(events));
  }
}

/**
 * Approve or Reject KYC status (Admin tools mock utility)
 */
export async function setKYCStatus(
  uid: string,
  status: UserProfile["kycStatus"]
): Promise<void> {
  const verified = status === "approved";
  if (isFirebaseActive()) {
    try {
      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, {
        kycStatus: status,
        kycVerified: verified,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error setting KYC status:", err);
    }
  } else {
    const users = getSimulatedUsers();
    if (users[uid]) {
      users[uid].kycStatus = status;
      users[uid].kycVerified = verified;
      users[uid].updatedAt = new Date().toISOString();
      saveSimulatedUser(users[uid]);
    }
  }
}

/**
 * Sign out the currently authenticated user
 */
export async function signOutFromFirebase(): Promise<void> {
  if (isFirebaseActive()) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase sign out error:", err);
    }
  } else {
    clearSimulatedSession();
    authListeners.forEach(listener => listener(null));
  }
}

/**
 * Fetch a user profile by UID
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (isFirebaseActive()) {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        return userDocSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  } else {
    const users = getSimulatedUsers();
    return users[uid] || null;
  }
}

/**
 * Subscribe to authentication state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: any) => void): () => void {
  if (isFirebaseActive()) {
    return onAuthStateChanged(auth, callback);
  } else {
    authListeners.push(callback);
    // Call callback immediately with current active simulated session
    const current = getSimulatedAuth().currentUser;
    callback(current);
    
    // Return unsubscribe function
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) {
        authListeners.splice(idx, 1);
      }
    };
  }
}

/**
 * Log Transaction records for analytics and data collection
 */
export async function logTransactionToFirebase(txData: {
  signature: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  fee: number;
  memo?: string;
  timestamp: number;
}): Promise<void> {
  if (isFirebaseActive()) {
    try {
      await setDoc(doc(db, "transactions", txData.signature), {
        ...txData,
        loggedAt: serverTimestamp()
      });
      console.log("Transaction successfully collected in Firestore.");
    } catch (err) {
      console.error("Error logging transaction to Firestore:", err);
    }
  } else {
    // Simulated path
    const transactions = JSON.parse(localStorage.getItem("nexpay_sim_transactions") || "[]");
    transactions.push({
      ...txData,
      loggedAt: new Date().toISOString()
    });
    localStorage.setItem("nexpay_sim_transactions", JSON.stringify(transactions));
  }
}

/**
 * Log telemetry and analytic events for compliance monitoring
 */
export async function logTelemetryEvent(
  eventName: string,
  payload: Record<string, any>
): Promise<void> {
  if (isFirebaseActive()) {
    try {
      await addDoc(collection(db, "events"), {
        eventName,
        payload,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging telemetry to Firestore:", err);
    }
  } else {
    // Simulated path
    const events = JSON.parse(localStorage.getItem("nexpay_sim_events") || "[]");
    events.push({
      eventName,
      payload,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem("nexpay_sim_events", JSON.stringify(events));
  }
}
