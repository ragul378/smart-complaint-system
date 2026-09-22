import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ComplaintItem {
  id: number;
  complaint_number: string;
  title: string;
  category_name: string;
  user_name: string;
  priority: any;
  status: any;
  sla_deadline?: string;
  created_at: string;
}

interface StaffDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStaffWorkload = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ complaints: ComplaintItem[] }>('/complaints');
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Failed to load staff workload');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffWorkload();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) ||
      c.status === statusFilter;

    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;

    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Calculate Metrics
  const totalAssigned = complaints.length;
  const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const escalated = complaints.filter((c) => c.status === 'ESCALATED').length;
  const overdueCount = complaints.filter(
    (c) =>
      !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status) &&
      c.sla_deadline &&
      new Date(c.sla_deadline).getTime() < new Date().getTime()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Staff Workload Workspace
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full">
              Dept: {user?.department_name || 'General'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accept assigned complaints, post progress updates, upload evidence, and ensure SLA compliance.
          </p>
        </div>

        <button
          onClick={fetchStaffWorkload}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Assigned Workload"
          value={totalAssigned}
          icon={FileText}
          color="blue"
          onClick={() => setStatusFilter('ALL')}
        />
        <StatCard
          title="In Progress"
          value={inProgress}
          icon={Wrench}
          color="amber"
          onClick={() => setStatusFilter('IN_PROGRESS')}
        />
        <StatCard
          title="Resolved Rate"
          value={totalAssigned > 0 ? `${Math.round((resolved / totalAssigned) * 100)}%` : '100%'}
          subtitle={`${resolved} of ${totalAssigned} resolved`}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => setStatusFilter('RESOLVED')}
        />
        <StatCard
          title="Escalated Alerts"
          value={escalated}
          icon={ShieldAlert}
          color="red"
          onClick={() => setStatusFilter('ESCALATED')}
        />
        <StatCard
          title="Overdue SLA"
          value={overdueCount}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Workload Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REOPENED">Reopened</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, title or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Workload List */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading staff workload...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No complaints in queue matching selected filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">ID & Title</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">SLA Target</th>
                  <th className="p-3.5 pr-6 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredComplaints.map((c) => {
                  const isOverdue =
                    !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status) &&
                    c.sla_deadline &&
                    new Date(c.sla_deadline).getTime() < new Date().getTime();

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onNavigate('complaint-details', { id: c.id })}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isOverdue ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-6">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {c.complaint_number}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                          {c.title}
                        </p>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {c.user_name}
                      </td>
                      <td className="p-3.5">
                        <PriorityBadge priority={c.priority} size="sm" />
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="p-3.5">
                        {c.sla_deadline ? (
                          <span
                            className={`font-mono text-[11px] font-semibold ${
                              isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isOverdue ? 'OVERDUE' : new Date(c.sla_deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('complaint-details', { id: c.id });
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                        >
                          Work on Issue
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
