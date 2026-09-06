import { useState, useMemo } from 'react';
import { JournalInteraction } from '../types';
import { Plus, Search, Trash2, Calendar, MessageSquare, Tag } from 'lucide-react';

interface HistorySidebarProps {
  interactions: JournalInteraction[];
  activeInteractionId: string | null;
  onSelectInteraction: (id: string) => void;
  onNewReflection: () => void;
  onDeleteInteraction: (id: string) => void;
}

export function HistorySidebar({
  interactions,
  activeInteractionId,
  onSelectInteraction,
  onNewReflection,
  onDeleteInteraction,
}: HistorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInteractions = useMemo(() => {
    if (!searchTerm.trim()) return interactions;
    const term = searchTerm.toLowerCase();
    return interactions.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  }, [interactions, searchTerm]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const day = date.getDate().toString().padStart(2, '0');
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${month} ${day} — ${time}`;
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/5 bg-[#0a0a0a] text-[#e0e0e0]">
      {/* Action Header */}
      <div className="p-5 border-b border-white/5">
        <button
          id="new-reflection-button"
          onClick={onNewReflection}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black shadow-xs hover:bg-indigo-300 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Reflection</span>
        </button>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-white/30" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search reflections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Interactions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between px-2 text-[10px] uppercase tracking-[0.25em] text-white/30 font-semibold">
          <span>Past Reflections</span>
          <span>{interactions.length}</span>
        </div>

        {filteredInteractions.length === 0 ? (
          <div className="px-3 py-12 text-center text-xs text-white/30">
            {searchTerm ? (
              <p>No reflections matching "{searchTerm}".</p>
            ) : (
              <div>
                <MessageSquare className="mx-auto h-5 w-5 text-white/20 mb-2" />
                <p className="font-serif italic text-sm text-white/40">Silence precedes the thought.</p>
                <p className="mt-1 text-[11px] text-white/30">
                  Begin your first entry to record.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isActive = item.id === activeInteractionId;
            return (
              <div
                key={item.id}
                onClick={() => onSelectInteraction(item.id)}
                className={`group relative pl-4 py-2.5 pr-2 border-l transition-all cursor-pointer rounded-r-xl ${
                  isActive
                    ? 'border-indigo-400 bg-white/5 text-white shadow-2xs'
                    : 'border-white/10 hover:border-white/40 hover:bg-white/[0.02] text-white/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      {formatDate(item.createdAt)}
                    </div>
                    <h3 className="text-sm font-serif italic font-medium leading-snug line-clamp-1 text-white/90">
                      {item.title || 'The Architecture of Silence'}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this journal entry permanently?')) {
                        onDeleteInteraction(item.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-opacity"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-white/40 line-clamp-2 leading-relaxed font-sans">
                  {item.summary || (item.turns[0] ? item.turns[0].text : 'No summary recorded')}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/30">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {item.turns.length} {item.turns.length === 1 ? 'turn' : 'turns'}
                  </span>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-white/5 border border-white/10 px-1.5 py-0.2 text-[8px] uppercase tracking-wider text-white/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
