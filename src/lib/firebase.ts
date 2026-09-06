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

// Initialize Firebase services safely
export function initFirebase() {
  if (firebaseApp) {
    return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
  }

  const config = getFirebaseConfig();
  if (config.apiKey && config.projectId) {
    try {
      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      authInstance = getAuth(firebaseApp);
      firestoreInstance = getFirestore(firebaseApp);
      return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
    } catch (err) {
      console.warn('Firebase initialization error, falling back to local storage auth:', err);
    }
  }

  return { app: null, auth: null, firestore: null };
}

// Local mock storage for testing/preview when Firebase credentials are not yet injected
const LOCAL_STORAGE_USER_KEY = 'reflection_journal_auth_user';
const LOCAL_STORAGE_INTERACTIONS_KEY = 'reflection_journal_interactions_';

// Sign In with Google Provider
export async function signInWithGoogle(): Promise<AuthUser> {
  const { auth } = initFirebase();

  if (auth) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isDemo: false,
    };
  }

  // Fallback demo user for immediate testability in preview environments
  const demoUser: AuthUser = {
    uid: 'demo-user-' + Math.random().toString(36).substring(2, 9),
    email: 'alex.journal@example.com',
    displayName: 'Alex Carter',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    isDemo: true,
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

// Sign Out
export async function logOut(): Promise<void> {
  const { auth } = initFirebase();
  if (auth) {
    await firebaseSignOut(auth);
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
}

// Subscribe to Auth State Changes
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  const { auth } = initFirebase();

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

  // Check local session
  const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (stored) {
    try {
      callback(JSON.parse(stored));
    } catch {
      callback(null);
    }
  } else {
    callback(null);
  }

  return () => {};
}

// Save Journal Interaction to Cloud Firestore
// Strictly isolated to /users/{userId}/interactions/{interactionId}
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

  const { firestore } = initFirebase();

  if (firestore) {
    // Write directly to user isolated subcollection
    const docRef = doc(firestore, 'users', userId, 'interactions', interaction.id);
    await setDoc(docRef, sanitized, { merge: true });
    return;
  }

  // Fallback to isolated user-specific local storage
  const storageKey = `${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`;
  const existing = getLocalInteractions(userId);
  const index = existing.findIndex((i) => i.id === interaction.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

// Load All Journal Interactions for current user
export async function loadUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) {
    return [];
  }

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
      return items;
    } catch (err) {
      console.warn('Error reading from Firestore, checking local backup:', err);
      return getLocalInteractions(userId);
    }
  }

  return getLocalInteractions(userId);
}

// Delete interaction
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) return;

  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'interactions', interactionId);
    await deleteDoc(docRef);
  }

  const storageKey = `${LOCAL_STORAGE_INTERACTIONS_KEY}${userId}`;
  const existing = getLocalInteractions(userId);
  const updated = existing.filter((i) => i.id !== interactionId);
  localStorage.setItem(storageKey, JSON.stringify(updated));
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

  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'profile', 'preferences');
    await setDoc(docRef, sanitized, { merge: true });
    return;
  }

  localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY}${userId}`, JSON.stringify(sanitized));
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const { firestore } = initFirebase();
  if (firestore) {
    try {
      const docRef = doc(firestore, 'users', userId, 'profile', 'preferences');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (err) {
      console.warn('Error loading profile from Firestore:', err);
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

  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'goals', goal.id);
    await setDoc(docRef, sanitized, { merge: true });
    return;
  }

  const storageKey = `${LOCAL_STORAGE_GOALS_KEY}${userId}`;
  const existing = getLocalGoals(userId);
  const index = existing.findIndex((g) => g.id === goal.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

export async function loadUserGoals(userId: string): Promise<Goal[]> {
  if (!userId) return [];
  const { firestore } = initFirebase();
  if (firestore) {
    try {
      const colRef = collection(firestore, 'users', userId, 'goals');
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: Goal[] = [];
      snapshot.forEach((d) => items.push(d.data() as Goal));
      return items;
    } catch (err) {
      console.warn('Error reading goals from Firestore:', err);
      return getLocalGoals(userId);
    }
  }
  return getLocalGoals(userId);
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;
  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'goals', goalId);
    await deleteDoc(docRef);
  }
  const storageKey = `${LOCAL_STORAGE_GOALS_KEY}${userId}`;
  const existing = getLocalGoals(userId);
  const updated = existing.filter((g) => g.id !== goalId);
  localStorage.setItem(storageKey, JSON.stringify(updated));
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

  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'insights', insight.id);
    await setDoc(docRef, sanitized, { merge: true });
    return;
  }

  const storageKey = `${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`;
  const existing = getLocalInsights(userId);
  const index = existing.findIndex((i) => i.id === insight.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

export async function loadUserInsights(userId: string): Promise<AIInsight[]> {
  if (!userId) return [];
  const { firestore } = initFirebase();
  if (firestore) {
    try {
      const colRef = collection(firestore, 'users', userId, 'insights');
      const q = query(colRef, orderBy('generatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: AIInsight[] = [];
      snapshot.forEach((d) => items.push(d.data() as AIInsight));
      return items;
    } catch (err) {
      console.warn('Error reading insights from Firestore:', err);
      return getLocalInsights(userId);
    }
  }
  return getLocalInsights(userId);
}

export async function deleteInsight(userId: string, insightId: string): Promise<void> {
  if (!userId || !insightId) return;
  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'insights', insightId);
    await deleteDoc(docRef);
  }
  const storageKey = `${LOCAL_STORAGE_INSIGHTS_KEY}${userId}`;
  const existing = getLocalInsights(userId);
  const updated = existing.filter((i) => i.id !== insightId);
  localStorage.setItem(storageKey, JSON.stringify(updated));
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

  const { firestore } = initFirebase();
  if (firestore) {
    const docRef = doc(firestore, 'users', userId, 'reviews', review.id);
    await setDoc(docRef, sanitized, { merge: true });
    return;
  }

  const storageKey = `${LOCAL_STORAGE_REVIEWS_KEY}${userId}`;
  const existing = getLocalReviews(userId);
  const index = existing.findIndex((r) => r.id === review.id);
  if (index >= 0) {
    existing[index] = sanitized;
  } else {
    existing.unshift(sanitized);
  }
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

export async function loadUserReviews(userId: string): Promise<WeeklyReview[]> {
  if (!userId) return [];
  const { firestore } = initFirebase();
  if (firestore) {
    try {
      const colRef = collection(firestore, 'users', userId, 'reviews');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: WeeklyReview[] = [];
      snapshot.forEach((d) => items.push(d.data() as WeeklyReview));
      return items;
    } catch (err) {
      console.warn('Error reading reviews from Firestore:', err);
      return getLocalReviews(userId);
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

