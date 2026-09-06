import { useState, useEffect } from 'react';
import {
  AuthUser,
  JournalInteraction,
  ReflectionMode,
  TurnMessage,
  Goal,
  AIInsight,
  WeeklyReview,
  UserProfile,
  AppView,
} from './types';
import {
  subscribeToAuth,
  signInWithGoogle,
  logOut,
  saveInteraction,
  loadUserInteractions,
  deleteInteraction,
  saveUserProfile,
  loadUserProfile,
  saveGoal,
  loadUserGoals,
  deleteGoal,
  saveInsight,
  loadUserInsights,
  deleteInsight,
  saveReview,
  loadUserReviews,
  isFirebaseConfigured,
} from './lib/firebase';
import { askGeminiReflection, askGeminiSummarize } from './lib/gemini';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { NavigationSidebar } from './components/NavigationSidebar';
import { DashboardView } from './components/DashboardView';
import { GoalTrackerView } from './components/GoalTrackerView';
import { InsightsView } from './components/InsightsView';
import { SmartSearchView } from './components/SmartSearchView';
import { AnalyticsView } from './components/AnalyticsView';
import { WeeklyReviewView } from './components/WeeklyReviewView';
import { HistoryView } from './components/HistoryView';
import { PrivacySecurityView } from './components/PrivacySecurityView';
import { ReflectionFeed } from './components/ReflectionFeed';
import { ReflectionInput } from './components/ReflectionInput';
import { OnboardingModal } from './components/OnboardingModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';

export default function App() {
  // Authentication State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // User Profile & Onboarding
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Core Data Collections
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);

  // Navigation & Active Session
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);

  // Interaction Processing State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modals & Mobile Drawers
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadAllUserData(currentUser.uid);
      } else {
        resetAppState();
      }
    });

    return () => unsubscribe();
  }, []);

  const resetAppState = () => {
    setProfile(null);
    setInteractions([]);
    setGoals([]);
    setInsights([]);
    setReviews([]);
    setActiveInteractionId(null);
    setCurrentView('dashboard');
  };

  const loadAllUserData = async (userId: string) => {
    try {
      const [loadedProfile, loadedInteractions, loadedGoals, loadedInsights, loadedReviews] =
        await Promise.all([
          loadUserProfile(userId),
          loadUserInteractions(userId),
          loadUserGoals(userId),
          loadUserInsights(userId),
          loadUserReviews(userId),
        ]);

      setProfile(loadedProfile);
      setInteractions(loadedInteractions);
      setGoals(loadedGoals);
      setInsights(loadedInsights);
      setReviews(loadedReviews);

      if (loadedInteractions.length > 0 && !activeInteractionId) {
        setActiveInteractionId(loadedInteractions[0].id);
      }

      // If user profile does not exist or onboarding is incomplete, open onboarding modal
      if (!loadedProfile || !loadedProfile.onboardingCompleted) {
        setIsOnboardingOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to load user data:', err);
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const signedInUser = await signInWithGoogle();
      setUser(signedInUser);
      await loadAllUserData(signedInUser.uid);
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // User closed or cancelled popup window before picking an account
        return;
      }
      console.error('Sign-in failed:', err);
      setAuthError(err?.message || 'Authentication could not be completed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo Sign-In (Ensures sandbox preview functionality without external Google redirect constraints)
  const handleDemoSignIn = async () => {
    const demoUser: AuthUser = {
      uid: 'demo_user_' + Math.random().toString(36).substring(2, 8),
      email: 'alex@solvera.app',
      displayName: 'Alex Chen',
      photoURL: null,
      isDemo: true,
    };
    setUser(demoUser);
    await loadAllUserData(demoUser.uid);
  };

  const handleSignOut = async () => {
    await logOut();
    setUser(null);
    resetAppState();
  };

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    setIsOnboardingOpen(false);
    if (user) {
      try {
        await saveUserProfile(user.uid, newProfile);
      } catch (err) {
        console.warn('Save user profile warning (persisted in local state):', err);
      }
    }
  };

  // --- GOAL ACTIONS ---
  const handleSaveGoal = async (goal: Goal) => {
    if (!user) return;
    try {
      await saveGoal(user.uid, goal);
    } catch (err) {
      console.warn('Save goal warning (persisted in local state):', err);
    }
    setGoals((prev) => {
      const index = prev.findIndex((g) => g.id === goal.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = goal;
        return copy;
      }
      return [goal, ...prev];
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    try {
      await deleteGoal(user.uid, goalId);
    } catch (err) {
      console.warn('Delete goal warning (updated in local state):', err);
    }
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleToggleGoalAction = async (goalId: string, actionId: string) => {
    if (!user) return;
    const targetGoal = goals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const updatedActions = targetGoal.actions.map((act) => {
      if (act.id === actionId) {
        return {
          ...act,
          completed: !act.completed,
          completedAt: !act.completed ? Date.now() : undefined,
        };
      }
      return act;
    });

    const isAllCompleted =
      updatedActions.length > 0 && updatedActions.every((a) => a.completed);

    const updatedGoal: Goal = {
      ...targetGoal,
      actions: updatedActions,
      status: isAllCompleted ? 'completed' : 'active',
      updatedAt: Date.now(),
    };

    try {
      await handleSaveGoal(updatedGoal);
    } catch (err) {
      console.warn('Toggle goal action warning:', err);
    }
  };

  // --- INSIGHT ACTIONS ---
  const handleSaveInsight = async (insight: AIInsight) => {
    if (!user) return;
    try {
      await saveInsight(user.uid, insight);
    } catch (err) {
      console.warn('Save insight warning (persisted in local state):', err);
    }
    setInsights((prev) => [insight, ...prev]);
  };

  const handleDeleteInsight = async (insightId: string) => {
    if (!user) return;
    try {
      await deleteInsight(user.uid, insightId);
    } catch (err) {
      console.warn('Delete insight warning (updated in local state):', err);
    }
    setInsights((prev) => prev.filter((i) => i.id !== insightId));
  };

  // --- REVIEW ACTIONS ---
  const handleSaveReview = async (review: WeeklyReview) => {
    if (!user) return;
    try {
      await saveReview(user.uid, review);
    } catch (err) {
      console.warn('Save review warning (persisted in local state):', err);
    }
    setReviews((prev) => [review, ...prev]);
  };

  // --- JOURNAL REFLECTION WORKFLOW ---
  const activeInteraction =
    interactions.find((i) => i.id === activeInteractionId) || null;

  const handleNewReflection = () => {
    setActiveInteractionId(null);
    setCurrentView('reflect');
    setErrorMessage(null);
  };

  const handleSelectInteraction = (interaction: JournalInteraction) => {
    setActiveInteractionId(interaction.id);
    setCurrentView('reflect');
    setErrorMessage(null);
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!user) return;
    try {
      await deleteInteraction(user.uid, id);
    } catch (err) {
      console.warn('Delete interaction warning (updated in local state):', err);
    }
    const updated = interactions.filter((i) => i.id !== id);
    setInteractions(updated);
    if (activeInteractionId === id) {
      setActiveInteractionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleQuickReflectSubmit = async (text: string) => {
    handleNewReflection();
    try {
      await handleSubmitReflection(text, 'reflect');
    } catch (err) {
      console.warn('Quick reflection error handled:', err);
    }
  };

  const handleSubmitReflection = async (text: string, mode: ReflectionMode) => {
    if (!user) {
      setErrorMessage('You must be signed in to reflect with Gemini.');
      return;
    }

    setIsAiLoading(true);
    setErrorMessage(null);
    setSyncStatus('saving');

    const userTurnId = 'turn-u-' + Date.now();
    const userTurn: TurnMessage = {
      id: userTurnId,
      role: 'user',
      text,
      timestamp: Date.now(),
      mode,
    };

    let currentInter: JournalInteraction;
    let isBrandNew = false;

    if (activeInteraction) {
      currentInter = {
        ...activeInteraction,
        turns: [...activeInteraction.turns, userTurn],
        updatedAt: Date.now(),
      };
    } else {
      isBrandNew = true;
      const newId = 'entry-' + Date.now();
      currentInter = {
        id: newId,
        userId: user.uid,
        title: text.slice(0, 40).trim() + (text.length > 40 ? '...' : ''),
        summary: '',
        tags: ['Journal'],
        turns: [userTurn],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    try {
      // 1. Resilient 4-tier model ladder
      const geminiResult = await askGeminiReflection(
        text,
        mode,
        currentInter.turns.slice(0, -1)
      );

      const modelTurn: TurnMessage = {
        id: 'turn-m-' + Date.now(),
        role: 'model',
        text: geminiResult.text,
        timestamp: Date.now(),
        mode: geminiResult.mode,
        modelUsed: geminiResult.modelUsed,
      };

      currentInter.turns.push(modelTurn);
      currentInter.updatedAt = Date.now();

      // 2. Guaranteed Persistence (Local Storage + Cloud Firestore)
      try {
        await saveInteraction(user.uid, currentInter);
      } catch (saveErr) {
        console.warn('Interaction save warning (fallback to local state):', saveErr);
      }

      // 3. Update local state
      setInteractions((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === currentInter.id);
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = currentInter;
          return copy;
        }
        return [currentInter, ...prev];
      });
      setActiveInteractionId(currentInter.id);
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 3000);

      // 4. Background auto-summarize
      if (isBrandNew || !currentInter.summary) {
        triggerAutoSummarize(user.uid, currentInter, text);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setSyncStatus('error');
      setErrorMessage(err?.message || 'Failed to generate response or persist entry.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const triggerAutoSummarize = async (
    userId: string,
    interaction: JournalInteraction,
    sampleText: string
  ) => {
    try {
      const summaryResult = await askGeminiSummarize(sampleText);
      if (summaryResult.success && summaryResult.data) {
        const updated: JournalInteraction = {
          ...interaction,
          title: summaryResult.data.title || interaction.title,
          summary: summaryResult.data.summary || interaction.summary,
          tags: summaryResult.data.tags || interaction.tags,
          updatedAt: Date.now(),
        };

        await saveInteraction(userId, updated);
        setInteractions((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
      }
    } catch (err) {
      console.warn('Auto-summarize failed softly:', err);
    }
  };

  const handleManualSummarize = async () => {
    if (!user || !activeInteraction || activeInteraction.turns.length === 0) return;

    setIsSummarizing(true);
    try {
      const fullText = activeInteraction.turns
        .map((t) => `${t.role === 'user' ? 'User' : 'Gemini'}: ${t.text}`)
        .join('\n\n');

      const summaryResult = await askGeminiSummarize(fullText);
      if (summaryResult.success && summaryResult.data) {
        const updated: JournalInteraction = {
          ...activeInteraction,
          title: summaryResult.data.title || activeInteraction.title,
          summary: summaryResult.data.summary || activeInteraction.summary,
          tags: summaryResult.data.tags || activeInteraction.tags,
          updatedAt: Date.now(),
        };

        await saveInteraction(user.uid, updated);
        setInteractions((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
      }
    } catch (err: any) {
      setErrorMessage('Failed to summarize: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  const activeGoalCount = goals.filter((g) => g.status === 'active').length;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#080808] text-[#e0e0e0] font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Top Header */}
      <Header
        user={user}
        currentView={currentView}
        onSignOut={handleSignOut}
        isFirebaseConfigured={isFirebaseConfigured()}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Main Container */}
      {!user ? (
        <div className="flex-1 overflow-y-auto">
          <LandingPage
            onSignIn={handleSignIn}
            onDemoSignIn={handleDemoSignIn}
            isLoading={authLoading}
            error={authError}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Navigation Sidebar */}
          <NavigationSidebar
            currentView={currentView}
            onSelectView={(view) => setCurrentView(view)}
            onNewReflection={handleNewReflection}
            user={user}
            onSignOut={handleSignOut}
            activeGoalCount={activeGoalCount}
            totalReflections={interactions.length}
            isMobileOpen={isMobileNavOpen}
            onCloseMobile={() => setIsMobileNavOpen(false)}
          />

          {/* Primary Viewport Area */}
          <main className="flex flex-1 flex-col overflow-hidden bg-[#080808]">
            {currentView === 'reflect' ? (
              // Dedicated Reflection Workspace
              <div className="flex flex-1 flex-col overflow-hidden">
                <ReflectionFeed
                  interaction={activeInteraction}
                  onGenerateSummary={handleManualSummarize}
                  isSummarizing={isSummarizing}
                />
                <ReflectionInput
                  onSubmit={handleSubmitReflection}
                  isLoading={isAiLoading}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                  syncStatus={syncStatus}
                />
              </div>
            ) : (
              // Dynamic SaaS View Container
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                {currentView === 'dashboard' && (
                  <DashboardView
                    user={user}
                    profile={profile}
                    interactions={interactions}
                    goals={goals}
                    insights={insights}
                    reviews={reviews}
                    onNavigate={(v) => setCurrentView(v)}
                    onSelectInteraction={handleSelectInteraction}
                    onQuickReflectSubmit={handleQuickReflectSubmit}
                    onToggleGoalAction={handleToggleGoalAction}
                  />
                )}

                {currentView === 'goals' && (
                  <GoalTrackerView
                    userId={user.uid}
                    goals={goals}
                    onSaveGoal={handleSaveGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onToggleAction={handleToggleGoalAction}
                  />
                )}

                {currentView === 'insights' && (
                  <InsightsView
                    userId={user.uid}
                    interactions={interactions}
                    insights={insights}
                    onSaveInsight={handleSaveInsight}
                    onDeleteInsight={handleDeleteInsight}
                  />
                )}

                {currentView === 'search' && (
                  <SmartSearchView
                    interactions={interactions}
                    onSelectInteraction={handleSelectInteraction}
                  />
                )}

                {currentView === 'analytics' && (
                  <AnalyticsView
                    interactions={interactions}
                    goals={goals}
                    insights={insights}
                    reviews={reviews}
                  />
                )}

                {currentView === 'review' && (
                  <WeeklyReviewView
                    userId={user.uid}
                    interactions={interactions}
                    goals={goals}
                    reviews={reviews}
                    onSaveReview={handleSaveReview}
                  />
                )}

                {currentView === 'history' && (
                  <HistoryView
                    interactions={interactions}
                    onSelectInteraction={handleSelectInteraction}
                    onDeleteInteraction={handleDeleteInteraction}
                    onNewReflection={handleNewReflection}
                  />
                )}

                {currentView === 'privacy' && (
                  <PrivacySecurityView
                    user={user}
                    onOpenConfigModal={() => setIsConfigModalOpen(true)}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Onboarding Personalization Modal */}
      {user && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          userId={user.uid}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Firebase & Cloud Security Configuration Modal */}
      <FirebaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}
