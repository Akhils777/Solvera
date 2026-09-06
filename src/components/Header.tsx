import { AuthUser, AppView } from '../types';
import { LogOut, Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  user: AuthUser | null;
  currentView?: AppView;
  onSignOut: () => void;
  isFirebaseConfigured?: boolean;
  onOpenConfigModal?: () => void;
  onToggleMobileNav?: () => void;
}

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Workspace Dashboard',
  reflect: 'AI Reflection',
  goals: 'Goal & Action Architect',
  insights: 'AI Pattern Insights',
  search: 'Smart Personal Search',
  analytics: 'Personal Analytics',
  review: 'Weekly AI Review',
  history: 'Reflection History',
  privacy: 'Privacy & Data',
};

export function Header({
  user,
  currentView = 'dashboard',
  onSignOut,
  onToggleMobileNav,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Nav Toggle + Brand/Breadcrumb */}
        <div className="flex items-center gap-3">
          {user && onToggleMobileNav && (
            <button
              id="header-mobile-menu-btn"
              onClick={onToggleMobileNav}
              className="md:hidden p-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/20 shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">
                  Solvéra
                </span>
                {user && (
                  <span className="hidden sm:inline-block text-white/30 text-xs">/</span>
                )}
                {user && (
                  <span className="hidden sm:inline-block text-xs font-serif italic text-indigo-300">
                    {VIEW_TITLES[currentView]}
                  </span>
                )}
              </div>
              <p className="text-[10px] tracking-wider text-white/40 font-sans">
                Turn thoughts into clarity
              </p>
            </div>
          </div>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-2.5">
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-7 w-7 rounded-full object-cover border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white shrink-0">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:inline text-xs font-medium text-white/80 max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>

              <button
                id="header-sign-out-button"
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
