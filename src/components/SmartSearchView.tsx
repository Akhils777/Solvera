import { useState, useMemo } from 'react';
import { JournalInteraction } from '../types';
import { Search, Tag, Calendar, MessageSquare, ArrowRight } from 'lucide-react';

interface SmartSearchViewProps {
  interactions: JournalInteraction[];
  onSelectInteraction: (interaction: JournalInteraction) => void;
}

export function SmartSearchView({ interactions, onSelectInteraction }: SmartSearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');

  // Collect all unique tags across entries
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    interactions.forEach((i) => {
      (i.tags || []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [interactions]);

  // Filtered entries
  const filteredInteractions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const now = Date.now();
    const cutoff =
      dateFilter === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : dateFilter === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

    return interactions.filter((item) => {
      // Date filter
      if (dateFilter !== 'all' && item.createdAt < cutoff) {
        return false;
      }

      // Tag filter
      if (selectedTag && !(item.tags || []).includes(selectedTag)) {
        return false;
      }

      // Query filter
      if (!query) return true;

      const titleMatch = (item.title || '').toLowerCase().includes(query);
      const summaryMatch = (item.summary || '').toLowerCase().includes(query);
      const tagMatch = (item.tags || []).some((t) => t.toLowerCase().includes(query));
      const turnMatch = (item.turns || []).some((turn) =>
        (turn.text || '').toLowerCase().includes(query)
      );

      return titleMatch || summaryMatch || tagMatch || turnMatch;
    });
  }, [interactions, searchQuery, selectedTag, dateFilter]);

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
          Smart Personal Search
        </h1>
        <p className="mt-1 text-xs text-white/50">
          Query your private reflections, past decisions, and AI analyses with instant filtering.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          id="smart-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by keywords, decisions, topics, feelings, or tag..."
          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0d] pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none shadow-xl"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Bars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 text-white/40 mr-1" />
          {(['all', '7d', '30d'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-all cursor-pointer ${
                dateFilter === filter
                  ? 'bg-white/10 text-white font-medium border border-white/20'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter === '7d' ? 'Past 7 Days' : 'Past 30 Days'}
            </button>
          ))}
        </div>

        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Tag className="h-3.5 w-3.5 text-white/40 mr-1" />
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-mono cursor-pointer ${
                selectedTag === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              All Tags
            </button>
            {allTags.slice(0, 6).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-mono cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-white/40 px-1">
          <span>
            {filteredInteractions.length}{' '}
            {filteredInteractions.length === 1 ? 'result' : 'results'} found
          </span>
          {searchQuery && <span>Matching "{searchQuery}"</span>}
        </div>

        {filteredInteractions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-xs text-white/50">
            No entries match your search criteria. Try modifying your query or clearing active filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInteractions.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectInteraction(item)}
                className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer group space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white/30 font-mono">
                      <MessageSquare className="h-3 w-3" />
                      {item.turns.length} turns
                    </span>
                  </div>

                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                    <span>Open Session</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                  {item.summary || (item.turns[0]?.text || '').slice(0, 150)}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(item.tags || []).map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/50 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
