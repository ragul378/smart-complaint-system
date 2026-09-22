import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface ChartData {
  statusDist: { status: string; count: number }[];
  categoryDist: { category: string; count: number }[];
  priorityDist: { priority: string; count: number }[];
  deptWorkload: { department: string; total: number; resolved: number; pending: number }[];
}

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCharts = async () => {
    setLoading(true);
    try {
      const res = await api.get<ChartData>('/analytics/charts');
      setData(res);
    } catch (err) {
      console.error('Failed to load chart analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const exportCSV = async () => {
    try {
      const res = await api.get<{ complaints: any[] }>('/analytics/reports');
      const complaints = res.complaints || [];

      let csv = 'Complaint ID,Title,Category,Department,Priority,Status,Submitted,Resolved\n';
      complaints.forEach((c) => {
        csv += `"${c.complaint_number}","${c.title.replace(/"/g, '""')}","${c.category_name}","${c.department_name || ''}","${c.priority}","${c.status}","${c.created_at}","${c.resolved_at || ''}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `complaint_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to generate CSV report');
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            System Analytics & Export Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive chart visualizations, status trends, department workload breakdown, and exportable reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV Report
          </button>
          <button
            onClick={printReport}
            className="px-3.5 py-2 bg-slate-800 text-white hover:bg-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading interactive analytics visualizations...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Donut */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Complaints by Status Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categories Distribution Bar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Complaints Volume by Category
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryDist}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Workload Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Department Workload (Resolved vs Pending)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.deptWorkload}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Complaints Severity Breakdown (Priority)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.priorityDist}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ priority, count }) => `${priority}: ${count}`}
                  >
                    {data.priorityDist.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          entry.priority === 'CRITICAL'
                            ? '#ef4444'
                            : entry.priority === 'HIGH'
                            ? '#f59e0b'
                            : entry.priority === 'MEDIUM'
                            ? '#3b82f6'
                            : '#64748b'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
