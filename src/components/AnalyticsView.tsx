import { useMemo } from 'react';
import { JournalInteraction, Goal, AIInsight, WeeklyReview } from '../types';
import {
  BarChart3,
  Flame,
  CheckCircle2,
  Calendar,
  MessageSquare,
  TrendingUp,
  Target,
} from 'lucide-react';

interface AnalyticsViewProps {
  interactions: JournalInteraction[];
  goals: Goal[];
  insights: AIInsight[];
  reviews: WeeklyReview[];
}

export function AnalyticsView({ interactions, goals, insights, reviews }: AnalyticsViewProps) {
  // Day of week distribution (0 = Sunday ... 6 = Saturday)
  const dayDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    interactions.forEach((item) => {
      const day = new Date(item.createdAt).getDay();
      counts[day]++;
    });
    const max = Math.max(...counts, 1);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames.map((name, idx) => ({
      name,
      count: counts[idx],
      pct: Math.round((counts[idx] / max) * 100),
    }));
  }, [interactions]);

  // Topic & Tag frequencies
  const tagFrequencies = useMemo(() => {
    const freq: { [tag: string]: number } = {};
    interactions.forEach((i) => {
      (i.tags || []).forEach((t) => {
        freq[t] = (freq[t] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [interactions]);

  // Total turns
  const totalTurns = useMemo(() => {
    return interactions.reduce((acc, i) => acc + (i.turns?.length || 0), 0);
  }, [interactions]);

  const avgTurnsPerSession =
    interactions.length > 0 ? (totalTurns / interactions.length).toFixed(1) : '0';

  // Goals completion metrics
  const totalActions = goals.reduce((acc, g) => acc + g.actions.length, 0);
  const completedActions = goals.reduce(
    (acc, g) => acc + g.actions.filter((a) => a.completed).length,
    0
  );
  const actionCompletionRate =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
          Personal Analytics &amp; Momentum
        </h1>
        <p className="mt-1 text-xs text-white/50">
          Quantified overview of reflection consistency, action task completion, and thematic focus.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Total Sessions</span>
            <MessageSquare className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-serif text-white">{interactions.length}</div>
          <p className="text-[11px] text-white/40">{totalTurns} dialogue exchanges</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Depth of Thought</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-serif text-white">{avgTurnsPerSession}</div>
          <p className="text-[11px] text-white/40">Avg turns per reflection</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Task Execution</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-serif text-white">{actionCompletionRate}%</div>
          <p className="text-[11px] text-white/40">
            {completedActions} of {totalActions} tasks completed
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] uppercase tracking-wider font-semibold">AI Syntheses</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-serif text-white">{insights.length + reviews.length}</div>
          <p className="text-[11px] text-white/40">
            {insights.length} insights • {reviews.length} weekly reviews
          </p>
        </div>
      </div>

      {/* 2-Column Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reflection Cadence Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Reflection Cadence by Day
              </h3>
            </div>
            <span className="text-[10px] text-white/40 font-mono">Past History</span>
          </div>

          {/* Bar Columns */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {dayDistribution.map((d) => (
              <div key={d.name} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="text-[10px] font-mono text-white/50">{d.count}</div>
                <div className="w-full bg-white/5 rounded-t-lg h-32 flex items-end overflow-hidden p-0.5">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-purple-500 transition-all duration-500"
                    style={{ height: `${Math.max(d.pct, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/40">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Thematic Topics */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Top Thematic Focus Areas
              </h3>
            </div>
            <span className="text-[10px] text-white/40 font-mono">Occurrences</span>
          </div>

          {tagFrequencies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40">
              No tags indexed yet. As you converse with Gemini, automatic topic tags will populate here.
            </div>
          ) : (
            <div className="space-y-3">
              {tagFrequencies.map(([tag, count]) => {
                const max = tagFrequencies[0][1] || 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={tag} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-white/80">#{tag}</span>
                      <span className="text-[11px] font-mono text-white/40">{count} entries</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
