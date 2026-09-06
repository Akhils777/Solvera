import { useState } from 'react';
import { AuthUser } from '../types';
import { exportAllUserData } from '../lib/firebase';
import {
  ShieldCheck,
  Lock,
  Download,
  KeyRound,
  Database,
  ExternalLink,
  CheckCircle2,
  Settings,
} from 'lucide-react';

interface PrivacySecurityViewProps {
  user: AuthUser;
  onOpenConfigModal: () => void;
}

export function PrivacySecurityView({ user, onOpenConfigModal }: PrivacySecurityViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const data = await exportAllUserData(user.uid);
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solvera_export_${user.uid.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Data export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
          Privacy &amp; Security Architecture
        </h1>
        <p className="mt-1 text-xs text-white/50">
          Industry-grade data isolation, zero password liabilities, and full cryptographic sovereignty over your journal.
        </p>
      </div>

      {/* Security Guarantees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Owner-Bound Isolation */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Database className="h-4 w-4" />
            <span>Owner-Bound Firestore Isolation</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            All documents, reflections, goals, and insights are partitioned under <code className="text-indigo-300 font-mono text-[11px]">/users/{'{userId}'}/**</code>. Firestore security rules strictly require <code className="text-indigo-300 font-mono text-[11px]">request.auth.uid == userId</code>, cryptographically barring other users from reading or mutating your data.
          </p>
          <div className="rounded-xl bg-white/5 p-3 font-mono text-[10px] text-emerald-300/80 border border-white/5">
            match /users/{'{userId}'}/{'{allSubcollections=**}'} {'{'}
            <br />
            &nbsp;&nbsp;allow read, write: if request.auth != null &amp;&amp; request.auth.uid == userId;
            <br />
            {'}'}
          </div>
        </div>

        {/* 2. Server-Side Proxy & Zero Hardcoded Keys */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Lock className="h-4 w-4" />
            <span>Server-Side Gemini API Proxy</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Your browser never touches the <code className="text-indigo-300 font-mono text-[11px]">GEMINI_API_KEY</code>. All reflection, insight, and decomposition requests proxy through an Express server configured with an automated 4-tier fallback ladder (Gemini 3.6 Flash → 3.1 Flash Lite → Flash Latest → 3.7 Flash).
          </p>
          <div className="flex items-center gap-2 text-xs text-white/50 pt-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Zero hardcoded API secrets in frontend bundles</span>
          </div>
        </div>

        {/* 3. Federated Google Authentication */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <KeyRound className="h-4 w-4" />
            <span>Passwordless Federated Identity</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Authentication is outsourced to Google Sign-In via Firebase Auth. The application never collects, handles, hashes, or stores raw user passwords, preventing credential-stuffing and database leak vulnerabilities.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/50">
            <span>Current Authenticated UID:</span>
            <span className="font-mono text-indigo-300 text-[11px]">{user.uid}</span>
          </div>
        </div>

        {/* 4. Data Sovereignty & Portability */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Download className="h-4 w-4" />
            <span>Full Data Sovereignty &amp; Export</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            You own your thoughts and plans. Download a complete JSON snapshot of all your journal interactions, active goals, AI insights, and weekly reviews at any time.
          </p>
          <button
            id="export-all-data-btn"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-medium text-white hover:bg-white/15 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>{isExporting ? 'Compiling Export...' : 'Export All Data (JSON)'}</span>
          </button>
          {exportSuccess && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Full user data export completed successfully.</span>
            </div>
          )}
        </div>
      </div>

      {/* Cloud & Configuration Inspector */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Firebase &amp; Cloud Run Configuration</h3>
          <p className="text-xs text-white/50 mt-0.5">
            Inspect active environment variables, project IDs, and connection diagnostics.
          </p>
        </div>

        <button
          id="open-security-config-modal-btn"
          onClick={onOpenConfigModal}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5 text-indigo-400" />
          <span>Inspect Cloud Config</span>
        </button>
      </div>
    </div>
  );
}
