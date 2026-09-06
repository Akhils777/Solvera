import { useState } from 'react';
import { AuthUser } from '../types';
import { exportAllUserData } from '../lib/firebase';
import {
  Lock,
  Download,
  CheckCircle2,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface PrivacySecurityViewProps {
  user: AuthUser;
  onOpenConfigModal?: () => void;
}

export function PrivacySecurityView({ user }: PrivacySecurityViewProps) {
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
      link.download = `solvera_export_${new Date().toISOString().split('T')[0]}.json`;
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
          Privacy &amp; Data
        </h1>
        <p className="mt-1 text-xs text-white/50">
          Your reflections, goals, and personal entries are private to your account and always in your control.
        </p>
      </div>

      {/* Core Privacy Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Complete Confidentiality */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Lock className="h-4 w-4" />
            <span>Private &amp; Confidential</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Your reflections, conversations, and personal goals are strictly accessible only by your authenticated account. No other users can view your entries.
          </p>
        </div>

        {/* 2. No Third-Party Tracking */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <EyeOff className="h-4 w-4" />
            <span>No Ads or Tracking</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Solvéra does not sell your thoughts or personal entries, nor are they used for third-party advertising or commercial profiling.
          </p>
        </div>

        {/* 3. Secure Sign-In */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <UserCheck className="h-4 w-4" />
            <span>Secure Authentication</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Account access is secured with Google Sign-In, ensuring strong protection without storing or managing sensitive passwords.
          </p>
        </div>
      </div>

      {/* Data Sovereignty & Portability (User-facing feature) */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Download className="h-4 w-4" />
          <span>Full Data Sovereignty &amp; Export</span>
        </div>
        <p className="text-xs text-white/70 leading-relaxed max-w-2xl">
          You own everything you write. You can download a complete, readable JSON copy of all your journal interactions, active goals, AI insights, and weekly reviews at any time.
        </p>

        <div className="pt-2">
          <button
            id="export-all-data-btn"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>{isExporting ? 'Compiling Export...' : 'Export All Data (JSON)'}</span>
          </button>
        </div>

        {exportSuccess && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Your complete data archive has been exported successfully.</span>
          </div>
        )}
      </div>
    </div>
  );
}
