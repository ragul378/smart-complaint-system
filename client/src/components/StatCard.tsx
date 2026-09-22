import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'indigo' | 'gray';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  onClick,
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-100 dark:border-amber-900',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-100 dark:border-red-900',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900',
    gray: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-5 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-3 border ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};
