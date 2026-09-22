import React, { useState } from 'react';
import { LogOut, Moon, Search, Sun, User as UserIcon, Shield, LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onNavigate: (page: string, params?: any) => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [trackInput, setTrackInput] = useState('');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackInput.trim()) {
      onNavigate('track', { complaintNumber: trackInput.trim() });
      setTrackInput('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 shadow-xs">
      {/* Brand & Track Search */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Resolv<span className="text-blue-600 dark:text-blue-400">IQ</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded">
              v2.5
            </span>
          </div>
        </div>

        {/* Quick Public Track Bar */}
        <form onSubmit={handleTrackSubmit} className="hidden md:flex items-center relative ml-4">
          <Search className="absolute left-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Track Complaint ID (e.g. CMP-2026-000001)..."
            value={trackInput}
            onChange={(e) => setTrackInput(e.target.value)}
            className="h-9 w-72 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {user ? (
          <>
            {/* Notification Bell */}
            <NotificationDropdown
              onSelectNotification={(complaintId) => onNavigate('complaint-details', { id: complaintId })}
            />

            {/* User Avatar Menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                    {user.role} {user.department_name ? `• ${user.department_name}` : ''}
                  </p>
                </div>
              </button>

              <button
                onClick={logout}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('login')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
