import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, User, Wrench } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface HistoryItem {
  id?: number;
  old_status?: string | null;
  new_status: string;
  remarks?: string;
  created_at: string;
  changed_by_name?: string;
  changed_by_role?: string;
}

interface TimelineProps {
  history: HistoryItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-500 italic">No activity recorded yet.</p>;
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 rounded font-semibold">ADMIN</span>;
      case 'STAFF':
        return <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">STAFF</span>;
      default:
        return <span className="text-[10px] bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded font-semibold">USER</span>;
    }
  };

  const getIcon = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'ESCALATED') return <ShieldAlert className="w-4 h-4 text-red-600" />;
    if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return <Wrench className="w-4 h-4 text-amber-600" />;
    return <Clock className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
      {history.map((item, idx) => (
        <div key={item.id || idx} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs">
            {getIcon(item.new_status)}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={item.new_status as any} size="sm" />
                {item.changed_by_name && (
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {item.changed_by_name} {getRoleBadge(item.changed_by_role)}
                  </span>
                )}
              </div>

              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>

            {item.remarks && (
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                {item.remarks}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
