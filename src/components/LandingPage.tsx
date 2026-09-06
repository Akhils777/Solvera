import { useState } from 'react';
import {
  Shield,
  Sparkles,
  Target,
  Lightbulb,
  CalendarCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function LandingPage({
  onSignIn,
  isLoading,
  error,
}: LandingPageProps) {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = error?.toLowerCase().includes('unauthorized-domain');

  const copyHostname = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#080808] text-[#e0e0e0] relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-5xl text-center relative z-10">
        {/* Tracked Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-indigo-300 backdrop-blur-sm mb-6">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span>Solvéra • Turn thoughts into clarity</span>
        </div>

        {/* Hero Title in Literary Serif */}
        <h1 className="text-4xl sm:text-6xl font-serif italic tracking-tight text-white leading-[1.12] max-w-4xl mx-auto">
          Turn scattered thoughts into clarity, deliberate decisions, and unstoppable momentum.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-white/60 font-serif leading-relaxed max-w-2xl mx-auto">
          An intelligent personal space where you reflect, understand recurring patterns, decompose ambitious goals into bite-sized actions, and synthesize weekly progress.
        </p>

        {/* Error Banner */}
        {error && (
          <div className="mt-6 mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-950/40 backdrop-blur-sm p-4 sm:p-5 text-left text-xs text-red-200 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <p className="font-semibold text-red-100">
                {isUnauthorizedDomain
                  ? 'Sign-in Domain Authorization Required'
                  : 'Authentication Notice'}
              </p>
            </div>

            {isUnauthorizedDomain ? (
              <div className="mt-2.5 space-y-3 text-red-200/90 leading-relaxed">
                <p>
                  Google Sign-In is not yet authorized for this domain. Please authorize this preview domain in your sign-in configuration.
                </p>

                <div className="rounded-xl border border-red-500/20 bg-black/50 p-3">
                  <div className="text-[11px] text-white/60 mb-1">Domain to authorize:</div>
                  <div className="flex items-center justify-between gap-2 font-mono text-xs text-emerald-400 bg-black/80 px-3 py-2 rounded-lg border border-white/10">
                    <span className="truncate select-all">{currentHostname}</span>
                    <button
                      type="button"
                      onClick={copyHostname}
                      className="shrink-0 flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-red-300">{error}</p>
            )}
          </div>
        )}

        {/* Authentication Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="google-sign-in-button"
            onClick={onSignIn}
            disabled={isLoading}
            className="flex items-center gap-3.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-lg shadow-white/10 hover:bg-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#080808] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Authenticating...</span>
              </div>
            ) : (
              <>
                {/* Google "G" Icon */}
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="h-4 w-4 text-black/60" />
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-[11px] text-white/40 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <Lock className="h-3 w-3 text-white/30" />
          <span>Private and secure • Your data is always yours</span>
        </p>

        {/* 5 Core Feature Pillars */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Pillar 1: AI Reflection */}
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 hover:border-white/10 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              AI-Powered Personal Reflection
            </h2>
            <p className="mt-2 text-xs text-white/50 leading-relaxed">
              Multi-turn reflective dialogue with dedicated modes for deep inquiry, executive summaries, brainstorming, and high-stakes decision frameworks.
            </p>
          </div>

          {/* Pillar 2: Goal & Action Tracker */}
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 hover:border-white/10 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
              <Target className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Goal &amp; Action Tracker
            </h2>
            <p className="mt-2 text-xs text-white/50 leading-relaxed">
              Decompose plain-English intentions into structured, measurable goals with verifiable action steps that you inspect and approve before saving.
            </p>
          </div>

          {/* Pillar 3: AI Insight Engine */}
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 hover:border-white/10 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
              <Lightbulb className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Personal AI Insights
            </h2>
            <p className="mt-2 text-xs text-white/50 leading-relaxed">
              Synthesize cross-journal patterns to detect recurring bottlenecks, cognitive strengths, emotional themes, and high-leverage growth levers.
            </p>
          </div>

          {/* Pillar 4: Weekly Reviews */}
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 hover:border-white/10 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Weekly AI Reviews
            </h2>
            <p className="mt-2 text-xs text-white/50 leading-relaxed">
              Automatic weekly reviews highlighting key wins, carried-forward tasks, mindset shifts, and 3 high-impact priorities for the coming week.
            </p>
          </div>

          {/* Pillar 5: Private & Dedicated */}
          <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 hover:border-white/10 transition-colors md:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
              <Shield className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Private, Secure &amp; Always Yours
            </h2>
            <p className="mt-2 text-xs text-white/50 leading-relaxed">
              Your reflections, goals, and thoughts are kept completely private to your account. Solvéra ensures complete confidentiality with dedicated data isolation, no third-party tracking, and full export sovereignty at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
