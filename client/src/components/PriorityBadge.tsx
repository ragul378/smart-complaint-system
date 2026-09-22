import React from 'react';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md', showIcon = true }) => {
  const getStyles = () => {
    switch (priority) {
      case 'LOW':
        return {
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
        };
      case 'MEDIUM':
        return {
          badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        };
      case 'CRITICAL':
        return {
          badge: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-800 font-bold',
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
        };
    }
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${style.badge} ${sizeStyles[size]}`}
    >
      {showIcon && style.icon}
      {priority}
    </span>
  );
};
