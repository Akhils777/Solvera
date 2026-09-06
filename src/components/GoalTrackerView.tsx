import { useState, FormEvent } from 'react';
import { Goal, GoalAction } from '../types';
import { askGeminiGoalDecompose } from '../lib/gemini';
import {
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  X,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface GoalTrackerViewProps {
  userId: string;
  goals: Goal[];
  onSaveGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onToggleAction: (goalId: string, actionId: string) => Promise<void>;
}

export function GoalTrackerView({
  userId,
  goals,
  onSaveGoal,
  onDeleteGoal,
  onToggleAction,
}: GoalTrackerViewProps) {
  const [filterTab, setFilterTab] = useState<'active' | 'completed'>('active');

  // AI Decomposition state
  const [intentionInput, setIntentionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Career & Leadership');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);

  // Review & Approval Modal state (MANDATORY per directives)
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual Goal creation state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('Career & Leadership');
  const [manualDate, setManualDate] = useState('30 Days');
  const [manualActions, setManualActions] = useState<string[]>(['']);

  // Add action to existing goal
  const [newActionText, setNewActionText] = useState<{ [goalId: string]: string }>({});

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const displayedGoals = filterTab === 'active' ? activeGoals : completedGoals;

  // Handle AI Decomposition
  const handleDecompose = async (e: FormEvent) => {
    e.preventDefault();
    if (!intentionInput.trim()) return;

    setIsDecomposing(true);
    setDecomposeError(null);

    try {
      const response = await askGeminiGoalDecompose(intentionInput.trim(), categoryInput);
      const data = response.data;

      // Construct proposed goal for user review & approval
      const newGoal: Goal = {
        id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId,
        title: data.title || intentionInput.trim(),
        category: data.category || categoryInput,
        description: data.description || '',
        targetDate: data.targetDate || '30 Days',
        status: 'active',
        actions: (data.actions || []).map((act, index) => ({
          id: `act_${Date.now()}_${index}`,
          title: typeof act === 'string' ? act : (act as any).title || 'Action item',
          completed: false,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setPendingGoal(newGoal);
      setIsReviewOpen(true);
      setIntentionInput('');
    } catch (err: any) {
      console.error('Goal decomposition error:', err);
      setDecomposeError(err?.message || 'Failed to decompose intention with Gemini.');
    } finally {
      setIsDecomposing(false);
    }
  };

  // User approves AI goal
  const handleApproveGoal = async () => {
    if (!pendingGoal) return;
    setIsSaving(true);
    try {
      await onSaveGoal(pendingGoal);
      setIsReviewOpen(false);
      setPendingGoal(null);
    } catch (err) {
      console.error('Failed to save approved goal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual Goal creation
  const handleSaveManualGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const filteredActions = manualActions
      .filter((a) => a.trim().length > 0)
      .map((a, i) => ({
        id: `act_man_${Date.now()}_${i}`,
        title: a.trim(),
        completed: false,
      }));

    const newGoal: Goal = {
      id: 'goal_man_' + Date.now(),
      userId,
      title: manualTitle.trim(),
      category: manualCategory,
      targetDate: manualDate.trim() || '30 Days',
      status: 'active',
      actions: filteredActions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setIsSaving(true);
    try {
      await onSaveGoal(newGoal);
      setIsManualModalOpen(false);
      setManualTitle('');
      setManualActions(['']);
    } finally {
      setIsSaving(false);
    }
  };

  // Add individual action to existing goal
  const handleAddActionToGoal = async (goalId: string) => {
    const text = (newActionText[goalId] || '').trim();
    if (!text) return;

    const targetGoal = goals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const updatedActions: GoalAction[] = [
      ...targetGoal.actions,
      {
        id: `act_${Date.now()}`,
        title: text,
        completed: false,
      },
    ];

    await onSaveGoal({
      ...targetGoal,
      actions: updatedActions,
      updatedAt: Date.now(),
    });

    setNewActionText((prev) => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
            Goal &amp; Action Architect
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Convert fuzzy intentions into clear milestones, concrete habits, and verifiable tasks with AI.
          </p>
        </div>

        <button
          id="manual-goal-create-btn"
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Manual Goal</span>
        </button>
      </div>

      {/* AI Intention Decomposer Card */}
      <div className="relative rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 via-[#0d0d0d] to-[#0d0d0d] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <span>AI Goal Decomposer</span>
          </div>
          <span className="text-[10px] text-white/40 font-mono">
            Powered by Gemini 3.6 Flash
          </span>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          State your intention in plain natural language (e.g. <em>"Prepare for a Staff Engineer system design interview in 6 weeks"</em>).
          Gemini will formulate a structured title, category, timeframe, and breakdown of actionable steps for your review.
        </p>

        <form onSubmit={handleDecompose} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="ai-goal-intention-input"
              type="text"
              value={intentionInput}
              onChange={(e) => setIntentionInput(e.target.value)}
              placeholder="What do you want to accomplish?"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
            />
            <select
              id="ai-goal-category-select"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#161616] px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="Career & Leadership">Career & Leadership</option>
              <option value="Deep Work & Skills">Deep Work & Skills</option>
              <option value="Health & Vitality">Health & Vitality</option>
              <option value="Mindset & Clarity">Mindset & Clarity</option>
              <option value="Creative Projects">Creative Projects</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-white/40">
              ⚡ You review and approve every step before anything is saved.
            </div>
            <button
              id="ai-decompose-submit-btn"
              type="submit"
              disabled={isDecomposing || !intentionInput.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isDecomposing ? 'Decomposing...' : 'Decompose with AI'}</span>
            </button>
          </div>
        </form>

        {decomposeError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{decomposeError}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex gap-2">
          <button
            id="tab-active-goals"
            onClick={() => setFilterTab('active')}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer border ${
              filterTab === 'active'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Active Goals ({activeGoals.length})
          </button>
          <button
            id="tab-completed-goals"
            onClick={() => setFilterTab('completed')}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer border ${
              filterTab === 'completed'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Completed ({completedGoals.length})
          </button>
        </div>
      </div>

      {/* Goal Cards Grid */}
      {displayedGoals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-2">
          <Target className="h-8 w-8 text-white/20 mx-auto" />
          <p className="text-xs text-white/50">
            No {filterTab} goals found. Use the AI Decomposer above to formulate your next milestone.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGoals.map((goal) => {
            const completedCount = goal.actions.filter((a) => a.completed).length;
            const total = goal.actions.length;
            const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
            const isAllCompleted = total > 0 && completedCount === total;

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 sm:p-6 space-y-4 hover:border-white/20 transition-all"
              >
                {/* Goal Top Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-medium text-indigo-300">
                        {goal.category}
                      </span>
                      {goal.targetDate && (
                        <span className="flex items-center gap-1 text-[11px] text-white/40 font-mono">
                          <Calendar className="h-3 w-3" />
                          <span>{goal.targetDate}</span>
                        </span>
                      )}
                      {goal.status === 'completed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1.5">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-white">
                        {completedCount}/{total} Tasks
                      </span>
                      <span className="text-[10px] text-white/40 block">({percentage}%)</span>
                    </div>

                    <button
                      id={`delete-goal-${goal.id}`}
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAllCompleted
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Action Items List */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold block">
                    Action Steps
                  </span>
                  <div className="space-y-1.5">
                    {goal.actions.map((act) => (
                      <div
                        key={act.id}
                        id={`action-${act.id}`}
                        onClick={() => onToggleAction(goal.id, act.id)}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs transition-all cursor-pointer select-none ${
                          act.completed
                            ? 'border-emerald-500/20 bg-emerald-950/10 text-white/40'
                            : 'border-white/5 bg-white/[0.02] text-white/80 hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                      >
                        {act.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/30 hover:text-white/60 shrink-0" />
                        )}
                        <span className={`flex-1 ${act.completed ? 'line-through' : ''}`}>
                          {act.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add action input */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newActionText[goal.id] || ''}
                      onChange={(e) =>
                        setNewActionText((prev) => ({ ...prev, [goal.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActionToGoal(goal.id);
                        }
                      }}
                      placeholder="Add another concrete step..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddActionToGoal(goal.id)}
                      disabled={!(newActionText[goal.id] || '').trim()}
                      className="rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MANDATORY APPROVAL & REVIEW MODAL for AI Decomposed Goals */}
      {isReviewOpen && pendingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-[#0d0d0d] p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Review &amp; Approve AI Goal
                </h3>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-1 text-white/40 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-white/60">
              Verify and customize the AI's proposal before committing it to your private records:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={pendingGoal.title}
                  onChange={(e) =>
                    setPendingGoal({ ...pendingGoal, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={pendingGoal.category}
                    onChange={(e) =>
                      setPendingGoal({ ...pendingGoal, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                    Target Timeframe
                  </label>
                  <input
                    type="text"
                    value={pendingGoal.targetDate || ''}
                    onChange={(e) =>
                      setPendingGoal({ ...pendingGoal, targetDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                  Generated Action Items ({pendingGoal.actions.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pendingGoal.actions.map((act, idx) => (
                    <div key={act.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => {
                          const updated = [...pendingGoal.actions];
                          updated[idx].title = e.target.value;
                          setPendingGoal({ ...pendingGoal, actions: updated });
                        }}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = pendingGoal.actions.filter((_, i) => i !== idx);
                          setPendingGoal({ ...pendingGoal, actions: updated });
                        }}
                        className="p-1.5 text-white/30 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="approve-ai-goal-btn"
                type="button"
                onClick={handleApproveGoal}
                disabled={isSaving || !pendingGoal.title.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : 'Approve & Save Goal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Goal Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleSaveManualGoal}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                Create New Goal
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-white/40 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Publish Technical Deep-Dive on Distributed Systems"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                    Category
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Career & Leadership">Career & Leadership</option>
                    <option value="Deep Work & Skills">Deep Work & Skills</option>
                    <option value="Health & Vitality">Health & Vitality</option>
                    <option value="Mindset & Clarity">Mindset & Clarity</option>
                    <option value="Creative Projects">Creative Projects</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                    Target Timeframe
                  </label>
                  <input
                    type="text"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    placeholder="e.g. 30 Days"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-wider text-white/40">
                    Action Steps
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualActions([...manualActions, ''])}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {manualActions.map((act, i) => (
                    <input
                      key={i}
                      type="text"
                      value={act}
                      onChange={(e) => {
                        const updated = [...manualActions];
                        updated[i] = e.target.value;
                        setManualActions(updated);
                      }}
                      placeholder={`Step ${i + 1}`}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-manual-goal-btn"
                type="submit"
                disabled={isSaving || !manualTitle.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                {isSaving ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
