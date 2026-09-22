import React, { useEffect, useState } from 'react';
import { Clock, Search, Shield, ShieldCheck, User } from 'lucide-react';
import { api } from '../services/api';

interface AuditLog {
  id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  target: string;
  details?: string;
  created_at: string;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ logs: AuditLog[] }>(`/audit?search=${encodeURIComponent(searchTerm)}`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            System Security & Action Audit Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of system events, administrative changes, status updates, and user activities.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user, or target..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No audit logs found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Target Record</th>
                  <th className="p-3.5 pr-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 pl-6 text-slate-400 text-[11px]">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-sans">
                      <p className="font-bold text-slate-900 dark:text-white">{l.user_name}</p>
                      <span className="text-[10px] text-slate-400">{l.user_role}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {l.target}
                    </td>
                    <td className="p-3.5 pr-6 font-sans text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {l.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
