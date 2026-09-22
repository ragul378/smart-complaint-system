import React from 'react';
import { Bell, Moon, Shield, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System & Portal Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Configure theme preferences and system defaults.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Appearance Theme
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode Toggle</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Switch between Light and Dark SaaS interface themes.</p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>
    </div>
  );
};
