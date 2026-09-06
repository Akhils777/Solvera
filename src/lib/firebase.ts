import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import {
  AuthUser,
  JournalInteraction,
  FirebaseConfig,
  UserProfile,
  Goal,
  AIInsight,
  WeeklyReview,
} from '../types';
import { sanitizeForFirestore } from './sanitizer';


let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

// Determine if Firebase environment configuration is available
export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

// Check if currently authenticated with a real Firebase Auth user matching userId
export function isRealFirebaseUser(userId: string): boolean {
  if (!userId || userId.startsWith('demo_user_')) return false;
  const { auth } = initFirebase();
  return Boolean(auth && auth.currentUser && auth.currentUser.uid === userId);
}

// Initialize Firebase services safely
export function initFirebase() {
  if (!firebaseApp) {
    const config = getFirebaseConfig();
    if (config.apiKey && config.projectId) {
      try {
        firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      } catch (err) {
        console.error('Firebase initialization error:', err);
      }
    }
  }

  if (firebaseApp) {
    if (!authInstance) {
      authInstance = getAuth(firebaseApp);
    }
    if (!firestoreInstance) {
      firestoreInstance = getFirestore(firebaseApp);
    }
    return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
  }

  return { app: null, auth: null, firestore: null };
}

// Local mock storage key (used for legacy cleanup)
const LOCAL_STORAGE_USER_KEY = 'reflection_journal_auth_user';
const LOCAL_STORAGE_INTERACTIONS_KEY = 'reflection_journal_interactions_';

// Sign In with Google Provider
export async function signInWithGoogle(): Promise<AuthUser> {
  const { auth } = initFirebase();

  if (!auth) {
    throw new Error(
      'Firebase Authentication is not configured or failed to initialize. Please verify your Firebase project configuration.'
    );
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  // Explicitly prompt the user to select their Google account
  // even if they are already signed into one or more Google accounts in their browser.
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Clean up any legacy mock user data from localStorage
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  } catch {}

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isDemo: false,
  };
}

// Sign Out
export async function logOut(): Promise<void> {
  const { auth } = initFirebase();
  if (auth) {
    await firebaseSignOut(auth);
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  } catch {}
}

// Subscribe to Auth State Changes
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  const { auth } = initFirebase();

  // Clean up any stale legacy mock user in localStorage so it never triggers accidental auto-login
  try {
    if (localStorage.getItem(LOCAL_STORAGE_USER_KEY)) {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  } catch {}

  if (auth) {
    return firebaseOnAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isDemo: false,
        });
      } else {
        callback(null);
      }
    });
  }

  // If Firebase auth is not configured, do not auto-sign into any mock account
  callback(null);
  return () => {};
}

// Save Journal Interaction
export async function saveInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to save interaction');
  }

  // 1. Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
  const sanitized = sanitizeForFirestore<JournalInteraction>({
    ...interaction,
    userId,
    updatedAt: Date.now(),
  });

  // Always update local storage first for guaranteed immediate persistence
  const storageKey = `${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`;
  const existing = getLocalInteractions(userId);
  const index = existing.findIndex((i) => i.id === interaction.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (storageErr) {
    console.warn('Local storage write warning:', storageErr);
  }

  // If real authenticated Firebase user, sync directly to Cloud Firestore
  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'interactions', interaction.id);
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.warn('Firestore write warning (persisted locally):', err);
      }
    }
  }
}

// Load All Journal Interactions for current user
export async function loadUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) {
    return [];
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const colRef = collection(firestore, 'users', userId, 'interactions');
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: JournalInteraction[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as JournalInteraction);
        });
        if (items.length > 0) {
          // Sync to local cache
          try {
            localStorage.setItem(`${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`, JSON.stringify(items));
          } catch {}
          return items;
        }
      } catch (err) {
        console.warn('Error reading from Firestore, checking local backup:', err);
      }
    }
  }

  return getLocalInteractions(userId);
}

// Delete interaction
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) return;

  const storageKey = `${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`;
  const existing = getLocalInteractions(userId);
  const updated = existing.filter((i) => i.id !== interactionId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('Local storage delete warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'interactions', interactionId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Error deleting interaction from Firestore:', err);
      }
    }
  }
}

function getLocalInteractions(userId: string): JournalInteraction[] {
  const storageKey = `${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- USER PROFILE & ONBOARDING PERSISTENCE ---
const LOCAL_STORAGE_PROFILE_KEY = 'copilot_user_profile_';

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  if (!userId) return;
  const sanitized = sanitizeForFirestore<UserProfile>({
    ...profile,
    userId,
    updatedAt: Date.now(),
  });

  try {
    localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}${userId}`, JSON.stringify(sanitized));
  } catch (storageErr) {
    console.warn('Local storage profile write warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'profile', 'preferences');
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.warn('Error saving profile to Firestore (saved locally):', err);
      }
    }
  }
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'profile', 'preferences');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const profileData = snap.data() as UserProfile;
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}${userId}`, JSON.stringify(profileData));
          } catch {}
          return profileData;
        }
      } catch (err) {
        console.warn('Error loading profile from Firestore:', err);
      }
    }
  }

  const raw = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY}${userId}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

// --- GOAL & ACTION TRACKER PERSISTENCE ---
const LOCAL_STORAGE_GOALS_KEY = 'copilot_goals_';

export async function saveGoal(userId: string, goal: Goal): Promise<void> {
  if (!userId) throw new Error('User ID is required to save goal');
  const sanitized = sanitizeForFirestore<Goal>({
    ...goal,
    userId,
    updatedAt: Date.now(),
  });

  const storageKey = `${LOCAL_STORAGE_GOALS_KEY}${userId}`;
  const existing = getLocalGoals(userId);
  const index = existing.findIndex((g) => g.id === goal.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (storageErr) {
    console.warn('Local storage goal write warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'goals', goal.id);
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.warn('Error saving goal to Firestore (saved locally):', err);
      }
    }
  }
}

export async function loadUserGoals(userId: string): Promise<Goal[]> {
  if (!userId) return [];

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const colRef = collection(firestore, 'users', userId, 'goals');
        const q = query(colRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: Goal[] = [];
        snapshot.forEach((d) => items.push(d.data() as Goal));
        if (items.length > 0) {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_GOALS_KEY}${userId}`, JSON.stringify(items));
          } catch {}
          return items;
        }
      } catch (err) {
        console.warn('Error reading goals from Firestore:', err);
      }
    }
  }
  return getLocalGoals(userId);
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;

  const storageKey = `${LOCAL_STORAGE_GOALS_KEY}${userId}`;
  const existing = getLocalGoals(userId);
  const updated = existing.filter((g) => g.id !== goalId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('Local storage delete goal warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'goals', goalId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Error deleting goal from Firestore:', err);
      }
    }
  }
}

function getLocalGoals(userId: string): Goal[] {
  const raw = localStorage.getItem(`${LOCAL_STORAGE_GOALS_KEY}${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- AI INSIGHT PERSISTENCE ---
const LOCAL_STORAGE_INSIGHTS_KEY = 'copilot_insights_';

export async function saveInsight(userId: string, insight: AIInsight): Promise<void> {
  if (!userId) throw new Error('User ID is required to save insight');
  const sanitized = sanitizeForFirestore<AIInsight>({
    ...insight,
    userId,
  });

  const storageKey = `${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`;
  const existing = getLocalInsights(userId);
  const index = existing.findIndex((i) => i.id === insight.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (storageErr) {
    console.warn('Local storage insight write warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'insights', insight.id);
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.warn('Error saving insight to Firestore (saved locally):', err);
      }
    }
  }
}

export async function loadUserInsights(userId: string): Promise<AIInsight[]> {
  if (!userId) return [];

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const colRef = collection(firestore, 'users', userId, 'insights');
        const q = query(colRef, orderBy('generatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: AIInsight[] = [];
        snapshot.forEach((d) => items.push(d.data() as AIInsight));
        if (items.length > 0) {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`, JSON.stringify(items));
          } catch {}
          return items;
        }
      } catch (err) {
        console.warn('Error reading insights from Firestore:', err);
      }
    }
  }
  return getLocalInsights(userId);
}

export async function deleteInsight(userId: string, insightId: string): Promise<void> {
  if (!userId || !insightId) return;

  const storageKey = `${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`;
  const existing = getLocalInsights(userId);
  const updated = existing.filter((i) => i.id !== insightId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('Local storage delete insight warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'insights', insightId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Error deleting insight from Firestore:', err);
      }
    }
  }
}

function getLocalInsights(userId: string): AIInsight[] {
  const raw = localStorage.getItem(`${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- WEEKLY AI REVIEW PERSISTENCE ---
const LOCAL_STORAGE_REVIEWS_KEY = 'copilot_reviews_';

export async function saveReview(userId: string, review: WeeklyReview): Promise<void> {
  if (!userId) throw new Error('User ID is required to save review');
  const sanitized = sanitizeForFirestore<WeeklyReview>({
    ...review,
    userId,
  });

  const storageKey = `${LOCAL_STORAGE_REVIEWS_KEY}${userId}`;
  const existing = getLocalReviews(userId);
  const index = existing.findIndex((r) => r.id === review.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (storageErr) {
    console.warn('Local storage review write warning:', storageErr);
  }

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'users', userId, 'reviews', review.id);
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.warn('Error saving review to Firestore (saved locally):', err);
      }
    }
  }
}

export async function loadUserReviews(userId: string): Promise<WeeklyReview[]> {
  if (!userId) return [];

  if (isRealFirebaseUser(userId)) {
    const { firestore } = initFirebase();
    if (firestore) {
      try {
        const colRef = collection(firestore, 'users', userId, 'reviews');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: WeeklyReview[] = [];
        snapshot.forEach((d) => items.push(d.data() as WeeklyReview));
        if (items.length > 0) {
          try {
            localStorage.setItem(`${LOCAL_STORAGE_REVIEWS_KEY}${userId}`, JSON.stringify(items));
          } catch {}
          return items;
        }
      } catch (err) {
        console.warn('Error reading reviews from Firestore:', err);
      }
    }
  }
  return getLocalReviews(userId);
}

function getLocalReviews(userId: string): WeeklyReview[] {
  const raw = localStorage.getItem(`${LOCAL_STORAGE_REVIEWS_KEY}${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- FULL DATA EXPORT (PRIVACY & SOVEREIGNTY) ---
export async function exportAllUserData(userId: string): Promise<{
  exportDate: string;
  userId: string;
  profile: UserProfile | null;
  interactions: JournalInteraction[];
  goals: Goal[];
  insights: AIInsight[];
  reviews: WeeklyReview[];
}> {
  const [profile, interactions, goals, insights, reviews] = await Promise.all([
    loadUserProfile(userId),
    loadUserInteractions(userId),
    loadUserGoals(userId),
    loadUserInsights(userId),
    loadUserReviews(userId),
  ]);

  return {
    exportDate: new Date().toISOString(),
    userId,
    profile,
    interactions,
    goals,
    insights,
    reviews,
  };
}

