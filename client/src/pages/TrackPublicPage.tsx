import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, Calendar, Clock, MapPin, Search, ShieldCheck } from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { HistoryItem, Timeline } from '../components/Timeline';
import { api } from '../services/api';

interface TrackPublicPageProps {
  initialComplaintNumber?: string;
  onNavigate: (page: string, params?: any) => void;
}

export const TrackPublicPage: React.FC<TrackPublicPageProps> = ({ initialComplaintNumber = '', onNavigate }) => {
  const [complaintNumber, setComplaintNumber] = useState(initialComplaintNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ complaint: any; history: HistoryItem[] } | null>(null);

  const fetchTrackData = async (num: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ complaint: any; history: HistoryItem[] }>(`/complaints/track/${encodeURIComponent(num.trim())}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Complaint not found. Please check Complaint ID format (e.g. CMP-2026-000001).');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialComplaintNumber) {
      fetchTrackData(initialComplaintNumber);
    }
  }, [initialComplaintNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackData(complaintNumber);
  };

  const calculateSlaRemaining = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diffMs = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diffMs < 0) {
      const overHours = Math.abs(Math.floor(diffMs / (3600 * 1000)));
      const overMins = Math.abs(Math.floor((diffMs % (3600 * 1000)) / (60 * 1000)));
      return { isOverdue: true, text: `OVERDUE by ${overHours}h ${overMins}m` };
    }
    const remHours = Math.floor(diffMs / (3600 * 1000));
    const remMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return { isOverdue: false, text: `SLA Target: ${remHours}h ${remMins}m remaining` };
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-1">
          <Search className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Public Complaint Progress Tracker
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Enter your unique Complaint ID (e.g., CMP-2026-000001) to view real-time status updates and department progress timeline.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            placeholder="e.g. CMP-2026-000001"
            value={complaintNumber}
            onChange={(e) => setComplaintNumber(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-900 text-xs font-medium text-center">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {data.complaint.complaint_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {data.complaint.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <PriorityBadge priority={data.complaint.priority} />
                <StatusBadge status={data.complaint.status} />
              </div>
            </div>

            {/* Grid Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Department & Category
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {data.complaint.department_name || 'Unassigned'} • {data.complaint.category_name}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {data.complaint.location || 'Not specified'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Submitted Date
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(data.complaint.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* SLA Banner */}
            {data.complaint.sla_deadline && !['RESOLVED', 'CLOSED'].includes(data.complaint.status) && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  calculateSlaRemaining(data.complaint.sla_deadline)?.isOverdue
                    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 font-bold'
                    : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 font-semibold'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>{calculateSlaRemaining(data.complaint.sla_deadline)?.text}</span>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {data.complaint.description}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Official Resolution Timeline
            </h4>
            <Timeline history={data.history} />
          </div>
        </div>
      )}
    </div>
  );
};
