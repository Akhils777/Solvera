import { useState, FormEvent } from 'react';
import {
  AuthUser,
  JournalInteraction,
  Goal,
  AIInsight,
  WeeklyReview,
  AppView,
  UserProfile,
} from '../types';
import {
  Sparkles,
  Target,
  Lightbulb,
  CalendarCheck,
  ArrowRight,
  CheckCircle2,
  Circle,
  Plus,
  Compass,
  Flame,
} from 'lucide-react';

interface DashboardViewProps {
  user: AuthUser;
  profile: UserProfile | null;
  interactions: JournalInteraction[];
  goals: Goal[];
  insights: AIInsight[];
  reviews: WeeklyReview[];
  onNavigate: (view: AppView) => void;
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onQuickReflectSubmit: (text: string) => void;
  onToggleGoalAction: (goalId: string, actionId: string) => void;
}

export function DashboardView({
  user,
  profile,
  interactions,
  goals,
  insights,
  reviews,
  onNavigate,
  onSelectInteraction,
  onQuickReflectSubmit,
  onToggleGoalAction,
}: DashboardViewProps) {
  const [quickText, setQuickText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate greeting by hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user.displayName ? user.displayName.split(' ')[0] : 'there';

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Total completed actions across all goals
  const totalCompletedActions = goals.reduce((acc, g) => {
    return acc + g.actions.filter((a) => a.completed).length;
  }, 0);

  const latestInsight = insights[0] || null;
  const latestReview = reviews[0] || null;
  const recentInteractions = interactions.slice(0, 4);

  const handleQuickSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const textToSubmit = quickText.trim();
    if (!textToSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      setQuickText('');
      await onQuickReflectSubmit(textToSubmit);
    } catch (err) {
      console.warn('Quick reflect error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
            {greeting}, {displayName}.
          </h1>
          <p className="mt-1 text-xs text-white/50">
            {profile?.primaryIntention
              ? `Current Focus: ${profile.primaryIntention}`
              : 'Your private executive space for clarity, decisions, and deliberate momentum.'}
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="dashboard-new-reflection-btn"
            onClick={() => onNavigate('reflect')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Reflect</span>
          </button>

          <button
            id="dashboard-decompose-goal-btn"
            onClick={() => onNavigate('goals')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>Set Goal</span>
          </button>

          <button
            id="dashboard-view-insights-btn"
            onClick={() => onNavigate('insights')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span>Insights</span>
          </button>

          <button
            id="dashboard-weekly-review-btn"
            onClick={() => onNavigate('review')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Weekly Review</span>
          </button>
        </div>
      </div>

      {/* Quick Reflection Card */}
      <div className="relative rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 via-black to-black p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
          <Sparkles className="h-4 w-4" />
          <span>Quick Reflection Prompt</span>
        </div>
        <p className="mt-1 text-sm font-serif italic text-white/80">
          What is currently occupying your mind, or which decision needs clarity today?
        </p>
        <form onSubmit={handleQuickSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <input
            id="quick-reflection-input"
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder="Type a thought, dilemma, or reflection..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
          />
          <button
            id="quick-reflection-submit-btn"
            type="submit"
            disabled={!quickText.trim() || isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-40 cursor-pointer shrink-0"
          >
            <span>{isSubmitting ? 'Reflecting...' : 'Reflect with Solvéra'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Reflections</span>
            <Compass className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-serif text-white">{interactions.length}</div>
          <p className="text-[10px] text-white/40 mt-0.5">Logged sessions</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Active Goals</span>
            <Target className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-serif text-white">{activeGoals.length}</div>
          <p className="text-[10px] text-white/40 mt-0.5">{completedGoals.length} completed</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Actions Done</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-serif text-white">{totalCompletedActions}</div>
          <p className="text-[10px] text-white/40 mt-0.5">Tasks checked off</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Weekly Reviews</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-serif text-white">{reviews.length}</div>
          <p className="text-[10px] text-white/40 mt-0.5">
            {latestReview ? 'Up to date' : 'Pending review'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Goals & Recent Sessions (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Goals Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Active Goals &amp; Next Actions
                </h2>
              </div>
              <button
                id="dashboard-see-all-goals-btn"
                onClick={() => onNavigate('goals')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Manage</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-2">
                <p className="text-xs text-white/50">No active goals configured yet.</p>
                <button
                  onClick={() => onNavigate('goals')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Decompose Your First Goal</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeGoals.slice(0, 3).map((goal) => {
                  const completedCount = goal.actions.filter((a) => a.completed).length;
                  const total = goal.actions.length;
                  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

                  return (
                    <div
                      key={goal.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                              {goal.category}
                            </span>
                            {goal.targetDate && (
                              <span className="text-[10px] text-white/40 font-mono">
                                ⏱ {goal.targetDate}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-semibold text-white mt-1.5">{goal.title}</h3>
                        </div>
                        <span className="text-xs font-mono text-white/50">{percentage}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Micro actions preview */}
                      <div className="space-y-1.5 pt-1">
                        {goal.actions.slice(0, 2).map((action) => (
                          <div
                            key={action.id}
                            onClick={() => onToggleGoalAction(goal.id, action.id)}
                            className="flex items-center gap-2 text-xs text-white/70 hover:text-white cursor-pointer select-none group"
                          >
                            {action.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 shrink-0" />
                            )}
                            <span
                              className={`text-[11px] line-clamp-1 ${
                                action.completed ? 'line-through text-white/30' : ''
                              }`}
                            >
                              {action.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Journal Reflections */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Recent Reflections
                </h2>
              </div>
              <button
                id="dashboard-see-all-history-btn"
                onClick={() => onNavigate('history')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>All Entries</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {recentInteractions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
                No reflections logged yet. Start your first session above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentInteractions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectInteraction(item)}
                    className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-left hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-white/40">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span className="font-mono">{item.turns.length} turns</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mt-1.5 group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                        {item.summary || (item.turns[0]?.text || '').slice(0, 90)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {(item.tags || []).slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Weekly Summary (1 col) */}
        <div className="space-y-6">
          {/* Latest AI Insight Card */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/10 to-black p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  AI Pattern Insight
                </h2>
              </div>
              <button
                id="dashboard-open-insights-btn"
                onClick={() => onNavigate('insights')}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Inspect
              </button>
            </div>

            {latestInsight ? (
              <div className="space-y-3">
                <p className="text-xs text-white/80 leading-relaxed italic font-serif">
                  "{latestInsight.summary}"
                </p>

                {latestInsight.recurringThemes?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">
                      Recurring Themes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestInsight.recurringThemes.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {latestInsight.suggestedActions?.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/70">
                    <span className="font-semibold text-white block mb-0.5">
                      High-Leverage Recommendation:
                    </span>
                    {latestInsight.suggestedActions[0]}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-center space-y-2">
                <p className="text-xs text-white/50">
                  Synthesize cross-journal patterns with Gemini 3.6 Flash.
                </p>
                <button
                  id="dashboard-generate-first-insight-btn"
                  onClick={() => onNavigate('insights')}
                  className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/30 cursor-pointer font-medium"
                >
                  Generate Insights
                </button>
              </div>
            )}
          </div>

          {/* Weekly Review Status Card */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-black p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Weekly Review
                </h2>
              </div>
              <button
                id="dashboard-open-review-btn"
                onClick={() => onNavigate('review')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Open
              </button>
            </div>

            {latestReview ? (
              <div className="space-y-3">
                <p className="text-xs text-white/80 leading-relaxed">
                  {latestReview.weekSummary}
                </p>
                {latestReview.prioritiesNextWeek?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">
                      Priorities for Next Week:
                    </span>
                    <ul className="space-y-1 text-[11px] text-emerald-300/90 list-disc list-inside">
                      {latestReview.prioritiesNextWeek.slice(0, 2).map((p, idx) => (
                        <li key={idx} className="line-clamp-1">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-center space-y-2">
                <p className="text-xs text-white/50">
                  No review logged for this week yet.
                </p>
                <button
                  id="dashboard-generate-first-review-btn"
                  onClick={() => onNavigate('review')}
                  className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30 cursor-pointer font-medium"
                >
                  Generate Review
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
