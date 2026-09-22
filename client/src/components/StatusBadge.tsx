import React from 'react';

export type ComplaintStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'ESCALATED'
  | 'REJECTED';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyles = () => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'ACKNOWLEDGED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'ASSIGNED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'ON_HOLD':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'CLOSED':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'REOPENED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs transition-colors ${getStyles()} ${sizeStyles[size]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace('_', ' ')}
    </span>
  );
};
