import { JournalInteraction, TurnMessage } from '../types';
import { Sparkles, Copy, Check, Calendar, FileText, Tag } from 'lucide-react';
import { useState } from 'react';

interface ReflectionFeedProps {
  interaction: JournalInteraction | null;
  onGenerateSummary?: () => void;
  isSummarizing?: boolean;
}

export function ReflectionFeed({
  interaction,
  onGenerateSummary,
  isSummarizing,
}: ReflectionFeedProps) {
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);

  if (!interaction) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#080808] text-[#e0e0e0]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366f1]/20 to-[#a855f7]/20 text-white mb-4 border border-white/10">
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>
        <h2 className="text-xl font-serif italic text-white">
          Begin the Inquiry
        </h2>
        <p className="mt-2 text-xs text-white/40 max-w-md font-sans">
          Select a previous contemplation from your history or express your thoughts below to engage with Gemini 3.6 Flash.
        </p>
      </div>
    );
  }

  const handleCopy = (text: string, turnId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(turnId);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const getModeLabel = (mode?: string) => {
    switch (mode) {
      case 'summarize':
        return 'Executive Synthesis';
      case 'brainstorm':
        return 'Creative Exploration';
      case 'action_items':
        return 'Structured Intentions';
      case 'reflect':
      default:
        return 'Gemini 3.6 Synthesis';
    }
  };

  return (
    <div className="relative flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-10 space-y-10 bg-[#080808] text-[#e0e0e0]">
      {/* Top subtle vignette fade */}
      <div className="sticky top-0 left-0 -mt-10 mb-2 w-full h-8 bg-gradient-to-b from-[#080808] to-transparent z-10 pointer-events-none" />

      {/* Reflection Header Card */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-bold block mb-1">
              Active Dialogue
            </span>
            <h2 className="text-xl sm:text-2xl font-serif italic text-white leading-tight">
              {interaction.title || 'Untitled Reflection'}
            </h2>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-white/30" />
                {new Date(interaction.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span>{interaction.turns.length} messages</span>
            </div>
          </div>

          {onGenerateSummary && (
            <button
              onClick={onGenerateSummary}
              disabled={isSummarizing || interaction.turns.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 self-start sm:self-auto cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isSummarizing ? 'Synthesizing...' : 'Synthesize Entry'}</span>
            </button>
          )}
        </div>

        {/* Executive Summary Snippet */}
        {interaction.summary && (
          <div className="mt-4 border-l-2 border-indigo-400/50 pl-4 py-1">
            <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">
              Core Essence
            </span>
            <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
              {interaction.summary}
            </p>
          </div>
        )}

        {/* Thematic Tags */}
        {interaction.tags && interaction.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {interaction.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[10px] uppercase tracking-wider text-white/50"
              >
                <Tag className="h-2.5 w-2.5 text-indigo-400" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages Feed in Literary Artistic Layout */}
      <div className="space-y-12 max-w-4xl">
        {interaction.turns.map((turn: TurnMessage) => {
          const isUser = turn.role === 'user';
          const isCopied = copiedTurnId === turn.id;

          if (isUser) {
            // User Prompt section
            return (
              <div key={turn.id} className="flex flex-col space-y-2.5 group">
                <div className="flex items-center justify-between max-w-3xl">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                    The Prompt
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/30">
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopy(turn.text, turn.id)}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Copy prompt"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-serif leading-snug text-white/90 break-words">
                  {turn.text}
                </div>
              </div>
            );
          }

          // Gemini Synthesis section with stylish indent and border
          return (
            <div
              key={turn.id}
              className="flex flex-col space-y-4 ml-4 sm:ml-8 border-l-2 border-indigo-500/20 pl-6 sm:pl-10 py-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">
                    {getModeLabel(turn.mode)}
                  </span>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white/30">
                    {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleCopy(turn.text, turn.id)}
                    className="p-1 text-white/40 hover:text-white transition-colors"
                    title="Copy synthesis"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Formatted Content in Literary Italic Serif */}
              <div className="space-y-4">
                {turn.text.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
                    const items = paragraph.split('\n').filter((l) => l.trim().length > 0);
                    return (
                      <ul key={pIdx} className="space-y-2 my-2 font-serif text-base sm:text-lg text-white/70 italic">
                        {items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2.5">
                            <span className="text-indigo-400 text-sm mt-1">•</span>
                            <span className="leading-relaxed">{item.replace(/^[-*]\s+/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p
                      key={pIdx}
                      className="text-base sm:text-lg font-serif italic leading-relaxed text-white/75"
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
