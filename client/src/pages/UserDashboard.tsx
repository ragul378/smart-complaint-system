import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  PlusCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';

interface ComplaintItem {
  id: number;
  complaint_number: string;
  title: string;
  category_name: string;
  department_name?: string;
  priority: any;
  status: any;
  created_at: string;
  updated_at: string;
}

interface UserDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ complaints: ComplaintItem[] }>('/complaints');
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Failed to load user complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) ||
      c.status === statusFilter;

    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const total = complaints.length;
  const active = complaints.filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
  const closed = complaints.filter((c) => c.status === 'CLOSED').length;
  const reopened = complaints.filter((c) => c.status === 'REOPENED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            User Complaint Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit, track, and monitor resolution progress for your institutional complaints.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-complaint')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          Submit New Complaint
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Submitted"
          value={total}
          icon={FileText}
          color="blue"
          onClick={() => setStatusFilter('ALL')}
        />
        <StatCard
          title="Active Issues"
          value={active}
          icon={Clock}
          color="amber"
          onClick={() => setStatusFilter('ACTIVE')}
        />
        <StatCard
          title="Resolved"
          value={resolved}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => setStatusFilter('RESOLVED')}
        />
        <StatCard
          title="Closed"
          value={closed}
          icon={CheckCircle2}
          color="indigo"
          onClick={() => setStatusFilter('CLOSED')}
        />
        <StatCard
          title="Reopened"
          value={reopened}
          icon={RefreshCw}
          color="red"
          onClick={() => setStatusFilter('REOPENED')}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
            </span>
            <div className="flex flex-wrap gap-1">
              {['ALL', 'ACTIVE', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, title or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading complaints...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No complaints found
              </p>
              <p className="text-xs text-slate-400">
                You haven't submitted any complaints matching this criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">Complaint ID</th>
                  <th className="p-3.5">Title & Category</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Submitted</th>
                  <th className="p-3.5 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredComplaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onNavigate('complaint-details', { id: c.id })}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 pl-6 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {c.complaint_number}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {c.title}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {c.category_name}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {c.department_name || 'Unassigned'}
                    </td>
                    <td className="p-3.5">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('complaint-details', { id: c.id });
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View Details
                      </button>
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
