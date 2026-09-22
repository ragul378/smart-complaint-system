import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
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
  user_name: string;
  assigned_staff_name?: string;
  priority: any;
  status: any;
  sla_deadline?: string;
  created_at: string;
}

interface KpiData {
  total: number;
  newCount: number;
  inProgress: number;
  resolved: number;
  closed: number;
  escalated: number;
  overdue: number;
  slaCompliance: number;
  avgResolutionHours: number;
}

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [kpiRes, cmpRes] = await Promise.all([
        api.get<{ kpis: KpiData }>('/analytics/dashboard'),
        api.get<{ complaints: ComplaintItem[] }>('/complaints'),
      ]);
      setKpis(kpiRes.kpis);
      setComplaints(cmpRes.complaints || []);
    } catch (err) {
      console.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'OVERDUE' &&
        !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status) &&
        c.sla_deadline &&
        new Date(c.sla_deadline).getTime() < new Date().getTime()) ||
      c.status === statusFilter;

    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;

    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category_name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Administrator Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            System-wide complaint monitoring, SLA compliance, department assignments, and analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('analytics')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <BarChart3 className="w-4 h-4" /> Full Analytics
          </button>
          <button
            onClick={fetchAdminData}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Complaints"
            value={kpis.total}
            icon={FileText}
            color="blue"
            onClick={() => setStatusFilter('ALL')}
          />
          <StatCard
            title="New Submissions"
            value={kpis.newCount}
            icon={PlusCircle}
            color="indigo"
            onClick={() => setStatusFilter('NEW')}
          />
          <StatCard
            title="In Progress"
            value={kpis.inProgress}
            icon={Wrench}
            color="amber"
            onClick={() => setStatusFilter('IN_PROGRESS')}
          />
          <StatCard
            title="Resolved & Closed"
            value={kpis.resolved + kpis.closed}
            subtitle={`Avg resolution: ${kpis.avgResolutionHours} hrs`}
            icon={CheckCircle2}
            color="emerald"
            onClick={() => setStatusFilter('RESOLVED')}
          />
          <StatCard
            title="SLA Compliance %"
            value={`${kpis.slaCompliance}%`}
            subtitle={`${kpis.overdue} SLA breaches`}
            icon={Clock}
            color={kpis.slaCompliance < 80 ? 'red' : 'emerald'}
          />
          <StatCard
            title="Escalated Alerts"
            value={kpis.escalated}
            icon={ShieldAlert}
            color="red"
            onClick={() => setStatusFilter('ESCALATED')}
          />
          <StatCard
            title="Overdue SLA Issues"
            value={kpis.overdue}
            icon={AlertTriangle}
            color="purple"
            onClick={() => setStatusFilter('OVERDUE')}
          />
          <StatCard
            title="Reports & Audit"
            value="View Logs"
            icon={FileSpreadsheet}
            color="gray"
            onClick={() => onNavigate('audit-logs')}
          />
        </div>
      )}

      {/* Master Complaints Activity Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
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
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
                <option value="OVERDUE">Overdue SLA</option>
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
              placeholder="Search ID, title, category, user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading master complaint registry...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No complaints match the selected filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">Complaint ID</th>
                  <th className="p-3.5">Title & Category</th>
                  <th className="p-3.5">Submitted By</th>
                  <th className="p-3.5">Assigned Dept & Staff</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
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
                      <span className="text-[10px] text-slate-400">{c.category_name}</span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {c.user_name}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      <p className="font-semibold">{c.department_name || 'Unassigned'}</p>
                      <p className="text-[10px] text-slate-400">
                        {c.assigned_staff_name ? `Staff: ${c.assigned_staff_name}` : 'No staff assigned'}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('complaint-details', { id: c.id });
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        Manage
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
