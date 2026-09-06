import { useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (profile: UserProfile) => Promise<void>;
}

const FOCUS_AREAS = [
  { id: 'Career & Leadership', label: 'Career & Leadership', icon: '💼' },
  { id: 'Deep Work & Skills', label: 'Deep Work & Skills', icon: '⚡' },
  { id: 'Decision Making & Strategy', label: 'Decision Making & Strategy', icon: '🎯' },
  { id: 'Mindfulness & Clarity', label: 'Mindfulness & Clarity', icon: '🧘' },
  { id: 'Health & Vitality', label: 'Health & Vitality', icon: '🌱' },
  { id: 'Creative Projects', label: 'Creative Projects', icon: '🎨' },
];

export function OnboardingModal({ isOpen, userId, onComplete }: OnboardingModalProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    'Career & Leadership',
    'Decision Making & Strategy',
  ]);
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'flexible'>('daily');
  const [intention, setIntention] = useState('Build deliberate habits and gain clarity on key decisions.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleArea = (id: string) => {
    if (selectedAreas.includes(id)) {
      if (selectedAreas.length > 1) {
        setSelectedAreas(selectedAreas.filter((a) => a !== id));
      }
    } else {
      setSelectedAreas([...selectedAreas, id]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const profile: UserProfile = {
        userId,
        focusAreas: selectedAreas,
        cadence,
        primaryIntention: intention.trim() || 'Reflect purposefully and track growth.',
        onboardingCompleted: true,
        updatedAt: Date.now(),
      };
      await onComplete(profile);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-8 text-white shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-white">
              Welcome to Solvéra
            </h2>
            <p className="mt-1 text-xs text-white/50 leading-relaxed">
              Personalize your workspace. Solvéra uses these focus areas to ground its reflective inquiries and goal decompositions.
            </p>
          </div>
        </div>

        {/* Step 1: Focus Areas */}
        <div className="space-y-2.5">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold block">
            Select Your Core Focus Areas (Pick at least 1)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_AREAS.map((area) => {
              const isSelected = selectedAreas.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium transition-all text-left cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-xs'
                      : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{area.icon}</span>
                    <span className="line-clamp-1">{area.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Cadence */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold block">
            Intended Reflection Cadence
          </label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'flexible'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCadence(mode)}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-medium capitalize transition-all cursor-pointer border ${
                  cadence === mode
                    ? 'border-white bg-white text-black font-semibold'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Core Intention */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold block">
            Primary Life or Career Intention
          </label>
          <input
            type="text"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="e.g. Master system design, reduce cognitive overload, build daily deep work"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button
            id="onboarding-complete-button"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedAreas.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{isSubmitting ? 'Personalizing Workspace...' : 'Enter Your Workspace'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
