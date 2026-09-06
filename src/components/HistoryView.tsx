import { useState, MouseEvent } from 'react';
import { JournalInteraction } from '../types';
import { Clock, MessageSquare, Trash2, ArrowRight, Tag } from 'lucide-react';

interface HistoryViewProps {
  interactions: JournalInteraction[];
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewReflection: () => void;
}

export function HistoryView({
  interactions,
  onSelectInteraction,
  onDeleteInteraction,
  onNewReflection,
}: HistoryViewProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = interactions.filter((item) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.summary || '').toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this reflection? This action cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDeleteInteraction(id);
      } catch (err) {
        console.error('Failed to delete interaction:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
            Reflection History Archive
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Browse, search, and continue all past multi-turn dialogues and executive decisions.
          </p>
        </div>

        <button
          onClick={onNewReflection}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>Start New Entry</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter history by title, tag, or topic..."
          className="flex-1 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
        />
        <span className="text-xs text-white/40 font-mono">
          {filtered.length} of {interactions.length}
        </span>
      </div>

      {/* Items Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-xs text-white/50">
          No entries found matching your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectInteraction(item)}
              className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 sm:p-6 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
                    <Clock className="h-3 w-3 text-indigo-400" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {item.turns.length} turns
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1.5 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="hidden sm:flex items-center gap-1 text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                {item.summary || (item.turns[0]?.text || '').slice(0, 160)}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(item.tags || []).map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/50 font-mono"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
