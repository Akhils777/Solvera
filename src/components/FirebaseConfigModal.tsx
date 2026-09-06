import { X, ShieldCheck, Database, Key, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { getFirebaseConfig, isFirebaseConfigured } from '../lib/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseConfigModal({ isOpen, onClose }: FirebaseConfigModalProps) {
  const [copied, setCopied] = useState(false);
  const config = getFirebaseConfig();
  const configured = isFirebaseConfigured();

  if (!isOpen) return null;

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{allSubcollections=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(rulesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl text-[#e0e0e0]">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <h2 className="text-base font-serif italic text-white">
              Cloud Firestore &amp; Security Architecture
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-white/70">
          {/* Status Badge */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 p-3.5 border border-white/5">
            <span className="font-medium text-white/80">Active Persistence Engine</span>
            <span
              className={`rounded-full px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${
                configured
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {configured ? 'Cloud Firestore (Production)' : 'Firestore Isolated Engine'}
            </span>
          </div>

          {/* Config Keys Review */}
          <div className="space-y-1.5">
            <p className="font-semibold text-white/90 flex items-center gap-1.5 text-xs">
              <Key className="h-3.5 w-3.5 text-indigo-400" />
              <span>Environment Configuration Status</span>
            </p>
            <div className="rounded-xl border border-white/5 bg-[#050505] p-3.5 font-mono text-[11px] space-y-1.5 text-white/60">
              <div className="flex justify-between">
                <span>VITE_FIREBASE_PROJECT_ID:</span>
                <span className="text-white/80">{config.projectId || '(Configured runtime)'}</span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_AUTH_DOMAIN:</span>
                <span className="text-white/80">{config.authDomain || '(Configured runtime)'}</span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_API_KEY:</span>
                <span className="text-white/80">{config.apiKey ? '••••••••••••••••' : '(Managed)'}</span>
              </div>
            </div>
          </div>

          {/* Security Rules Verification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white/90 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enforced Security Rules (firestore.rules)</span>
              </p>
              <button
                onClick={copyRules}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy Rules'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-white/5 bg-[#050505] p-3.5 font-mono text-[11px] text-indigo-200 overflow-x-auto leading-relaxed">
              {rulesText}
            </pre>
            <p className="text-[11px] text-white/40">
              Isolates every document under <code className="font-mono bg-white/10 px-1 py-0.5 rounded text-white/70">/users/{'{userId}'}/**</code> to the owner's Firebase Auth UID.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-indigo-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
