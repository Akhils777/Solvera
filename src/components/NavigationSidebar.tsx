import { AppView, AuthUser } from '../types';
import {
  LayoutDashboard,
  Sparkles,
  Target,
  Lightbulb,
  Search,
  BarChart3,
  CalendarCheck,
  Clock,
  ShieldCheck,
  Plus,
  LogOut,
} from 'lucide-react';

interface NavigationSidebarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onNewReflection: () => void;
  user: AuthUser | null;
  onSignOut: () => void;
  activeGoalCount: number;
  totalReflections: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number | string;
}

export function NavigationSidebar({
  currentView,
  onSelectView,
  onNewReflection,
  user,
  onSignOut,
  activeGoalCount,
  totalReflections,
  isMobileOpen,
  onCloseMobile,
}: NavigationSidebarProps) {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reflect', label: 'AI Reflection', icon: Sparkles },
    { id: 'goals', label: 'Goal Tracker', icon: Target, badge: activeGoalCount || undefined },
    { id: 'insights', label: 'AI Insights', icon: Lightbulb },
    { id: 'search', label: 'Smart Search', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'review', label: 'Weekly Review', icon: CalendarCheck },
    { id: 'history', label: 'History', icon: Clock, badge: totalReflections || undefined },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  ];

  const handleNavClick = (view: AppView) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewClick = () => {
    onNewReflection();
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#0a0a0a] text-[#e0e0e0] transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-white block">
              Solvéra
            </span>
            <span className="text-[10px] tracking-wider text-white/40 font-sans">
              Turn thoughts into clarity
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4 pb-2">
        <button
          id="nav-new-reflection-button"
          onClick={handleNewClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer active:scale-98"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.25em] text-white/40 font-semibold">
          Platform Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-button`}
              onClick={() => handleNavClick(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white shadow-xs border border-white/10'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-indigo-400' : 'text-white/40'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    isActive
                      ? 'bg-indigo-500/30 text-indigo-300'
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Card & Sign Out */}
      {user && (
        <div className="border-t border-white/5 p-3.5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/90 truncate">
                  {user.displayName || 'Personal Explorer'}
                </p>
                <p className="text-[10px] text-white/40 truncate">
                  {user.email || 'UID: ' + user.uid.slice(0, 8)}
                </p>
              </div>
            </div>

            <button
              id="sidebar-sign-out-button"
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
