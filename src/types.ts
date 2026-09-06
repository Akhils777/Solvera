export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export interface UserProfile {
  userId: string;
  focusAreas: string[];
  cadence: 'daily' | 'weekly' | 'flexible';
  primaryIntention: string;
  onboardingCompleted: boolean;
  updatedAt: number;
}

export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_items' | 'decision';

export interface TurnMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  summary: string;
  tags: string[];
  turns: TurnMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface GoalAction {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: string;
  description?: string;
  targetDate?: string;
  status: 'active' | 'completed';
  actions: GoalAction[];
  createdAt: number;
  updatedAt: number;
}

export interface AIInsight {
  id: string;
  userId: string;
  generatedAt: number;
  summary: string;
  recurringThemes: string[];
  commonConcerns: string[];
  positivePatterns: string[];
  improvementAreas: string[];
  observations: string[];
  suggestedActions: string[];
  modelUsed?: string;
}

export interface WeeklyReview {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  weekSummary: string;
  majorThemes: string[];
  progressMade: string[];
  goalsCompleted: string[];
  unfinishedActions: string[];
  importantReflections: string[];
  prioritiesNextWeek: string[];
  createdAt: number;
  modelUsed?: string;
}

export type AppView =
  | 'dashboard'
  | 'reflect'
  | 'goals'
  | 'insights'
  | 'search'
  | 'analytics'
  | 'review'
  | 'history'
  | 'privacy';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

