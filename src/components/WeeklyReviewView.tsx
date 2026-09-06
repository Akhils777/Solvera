import { useState } from 'react';
import { WeeklyReview, JournalInteraction, Goal } from '../types';
import { askGeminiWeeklyReview } from '../lib/gemini';
import {
  CalendarCheck,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface WeeklyReviewViewProps {
  userId: string;
  interactions: JournalInteraction[];
  goals: Goal[];
  reviews: WeeklyReview[];
  onSaveReview: (review: WeeklyReview) => Promise<void>;
}

export function WeeklyReviewView({
  userId,
  interactions,
  goals,
  reviews,
  onSaveReview,
}: WeeklyReviewViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateReview = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const now = new Date();
      // Calculate start of week (e.g. 7 days back)
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentInteractions = interactions.filter((i) => i.createdAt >= weekStart.getTime());

      const res = await askGeminiWeeklyReview(
        recentInteractions.length > 0 ? recentInteractions : interactions.slice(0, 5),
        goals
      );
      const data = res.data;

      const newReview: WeeklyReview = {
        id: 'rev_' + Date.now(),
        userId,
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: now.toISOString().split('T')[0],
        weekSummary: data.weekSummary || 'Executive weekly synthesis of your reflections and goal progress.',
        majorThemes: data.majorThemes || [],
        progressMade: data.progressMade || [],
        goalsCompleted: data.goalsCompleted || [],
        unfinishedActions: data.unfinishedActions || [],
        importantReflections: data.importantReflections || [],
        prioritiesNextWeek: data.prioritiesNextWeek || [],
        createdAt: Date.now(),
        modelUsed: res.modelUsed || 'gemini-3.6-flash',
      };

      await onSaveReview(newReview);
    } catch (err: any) {
      console.error('Error generating weekly review:', err);
      setErrorMessage(err?.message || 'Failed to generate weekly review with Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentReview = reviews[0] || null;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
            Weekly AI Review
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Synthesize your weekly reflections, quantify goal progress, and define 3 focused priorities for the upcoming week.
          </p>
        </div>

        <button
          id="generate-weekly-review-btn"
          onClick={handleGenerateReview}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-40 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          <span>{isGenerating ? 'Synthesizing Week...' : 'Generate Weekly Review'}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {currentReview ? (
        <div className="space-y-6">
          {/* Executive Overview Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-[#0d0d0d] to-[#0d0d0d] p-6 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-[11px] text-white/40">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Week Period: {currentReview.weekStartDate} → {currentReview.weekEndDate}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60">
                {currentReview.modelUsed || 'gemini-3.6-flash'}
              </span>
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Executive Weekly Synthesis
            </h2>
            <p className="text-sm font-serif italic text-white/90 leading-relaxed">
              "{currentReview.weekSummary}"
            </p>

            {/* Major Themes */}
            {currentReview.majorThemes?.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {currentReview.majorThemes.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-300 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3-Column Review Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Accomplishments & Progress */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>Progress &amp; Wins</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80 list-disc list-inside">
                {(currentReview.progressMade || []).map((p, i) => (
                  <li key={i} className="leading-relaxed">
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Unfinished Actions */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Carried Forward Tasks</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80 list-disc list-inside">
                {(currentReview.unfinishedActions || []).map((u, i) => (
                  <li key={i} className="leading-relaxed">
                    {u}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mental Models & Key Reflections */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Lightbulb className="h-4 w-4" />
                <span>Realizations &amp; Mindset</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80 list-disc list-inside">
                {(currentReview.importantReflections || []).map((r, i) => (
                  <li key={i} className="leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Priorities for Next Week */}
          {currentReview.prioritiesNextWeek?.length > 0 && (
            <div className="rounded-2xl border border-indigo-500/30 bg-[#0d0d0d] p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <ArrowRight className="h-4 w-4" />
                <span>Top 3 Priorities for Next Week</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {currentReview.prioritiesNextWeek.map((priority, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs font-medium text-white/90 flex items-start gap-2.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-3">
          <CalendarCheck className="h-8 w-8 text-emerald-400/40 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Review Generated For This Week</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
            Click "Generate Weekly Review" to have Gemini examine this week's journal entries and active goal milestones.
          </p>
          <button
            onClick={handleGenerateReview}
            disabled={isGenerating}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Now</span>
          </button>
        </div>
      )}

      {/* Historical Reviews */}
      {reviews.length > 1 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Past Weekly Reviews ({reviews.length})
          </h3>
          <div className="space-y-3">
            {reviews.slice(1).map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>
                    {rev.weekStartDate} → {rev.weekEndDate}
                  </span>
                  <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-white/80 line-clamp-2 leading-relaxed italic font-serif">
                  "{rev.weekSummary}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
