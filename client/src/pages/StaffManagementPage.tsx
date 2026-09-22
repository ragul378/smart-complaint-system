import React, { useEffect, useState } from 'react';
import { Award, Building2, CheckCircle2, Clock, Star, UserCheck, Users } from 'lucide-react';
import { api } from '../services/api';

interface StaffItem {
  id: number;
  name: string;
  email: string;
  phone?: string;
  department_name?: string;
  assigned_complaints_count: number;
  resolved_complaints_count: number;
  avg_rating?: number;
}

export const StaffManagementPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ users: StaffItem[] }>('/users?role=STAFF');
      setStaffList(res.users || []);
    } catch (err) {
      console.error('Failed to load staff performance metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Staff Performance & Workload Monitoring
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Monitor staff workload, resolution volume, rating averages, and department assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-500">
            Loading staff performance data...
          </div>
        ) : staffList.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400">
            No staff members registered.
          </div>
        ) : (
          staffList.map((s) => {
            const resRate = s.assigned_complaints_count > 0
              ? Math.round((s.resolved_complaints_count / s.assigned_complaints_count) * 100)
              : 100;

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h3>
                      <p className="text-[11px] text-slate-400">{s.email}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {s.department_name || 'General'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[10px] text-slate-400 font-medium">Assigned</p>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                      {s.assigned_complaints_count}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Resolved</p>
                    <p className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                      {s.resolved_complaints_count}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Rating</p>
                    <p className="text-base font-extrabold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {s.avg_rating ? Number(s.avg_rating).toFixed(1) : '5.0'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
