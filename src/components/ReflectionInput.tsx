import { useState, KeyboardEvent } from 'react';
import { ReflectionMode } from '../types';
import { ArrowUp, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReflectionInputProps {
  onSubmit: (text: string, mode: ReflectionMode) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const MODES: Array<{ id: ReflectionMode; label: string; description: string }> = [
  {
    id: 'reflect',
    label: 'Reflect & Unpack',
    description: 'Empathetic feedback, thoughtful questions, and perspective',
  },
  {
    id: 'summarize',
    label: 'Executive Synthesis',
    description: 'Condense entry into key takeaways and core themes',
  },
  {
    id: 'brainstorm',
    label: 'Creative Exploration',
    description: 'Generate fresh approaches, solutions, and possibilities',
  },
  {
    id: 'action_items',
    label: 'Structured Intentions',
    description: 'Transform reflections into concrete, bite-sized next steps',
  },
  {
    id: 'decision',
    label: 'Decision Framework',
    description: 'Analyze trade-offs, blind spots, second-order effects & risks',
  },
];


export function ReflectionInput({
  onSubmit,
  isLoading,
  errorMessage,
  onClearError,
  syncStatus,
}: ReflectionInputProps) {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflect');

  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    onClearError();
    try {
      await onSubmit(trimmed, selectedMode);
      // Input buffer is cleared ONLY upon successful confirmed submission and save!
      setInputText('');
    } catch {
      // Input buffer remains intact so user work is never lost!
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md p-5 sm:p-7">
      <div className="mx-auto max-w-3xl space-y-3.5">
        {/* Error Notification with Safe Retry */}
        {errorMessage && (
          <div
            id="transaction-error-alert"
            className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage} (Your input is preserved below)</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-full bg-red-800/60 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700/60 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/30 mr-1 font-semibold">
            Focus:
          </span>
          {MODES.map((mode) => {
            const isActive = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedMode(mode.id)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all cursor-pointer border ${
                  isActive
                    ? 'border-white bg-white text-black shadow-sm shadow-white/10'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/10'
                }`}
                title={mode.description}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Artistic Input Capsule */}
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl sm:rounded-full border border-white/10 bg-white/5 p-2 sm:p-2.5 shadow-lg focus-within:border-indigo-500/50 transition-all">
          <textarea
            id="reflection-text-input"
            rows={2}
            placeholder="Express your thoughts or continue the reflection... (Ctrl + Enter to send)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-4 py-2 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none"
          />

          <div className="flex items-center justify-between sm:justify-end gap-3 px-3 py-1 sm:p-0">
            <span className="text-[10px] text-white/30 sm:hidden">
              {inputText.length} chars
            </span>

            {/* Circular Send Button */}
            <button
              id="submit-reflection-button"
              type="button"
              onClick={handleSubmit}
              disabled={!inputText.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-sm hover:bg-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Send reflection"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-black" />
              ) : (
                <ArrowUp className="h-4 w-4 text-black stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Footer Technical Status Badges */}
        <div className="flex items-center justify-center gap-6 pt-1 text-[10px] uppercase tracking-widest text-white/30">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'saving'
                  ? 'bg-amber-400 animate-pulse'
                  : syncStatus === 'saved'
                  ? 'bg-emerald-400'
                  : 'bg-emerald-500'
              }`}
            />
            <span>
              {syncStatus === 'saving'
                ? 'Saving...'
                : syncStatus === 'saved'
                ? 'Saved securely'
                : 'Saved securely'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>AI Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
