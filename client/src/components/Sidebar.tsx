import React from 'react';
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  FolderKanban,
  Home,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  const navItems = [];

  if (role === 'USER') {
    navItems.push(
      { id: 'user-dashboard', label: 'My Complaints', icon: Home },
      { id: 'create-complaint', label: 'Submit Complaint', icon: PlusCircle },
      { id: 'track-public', label: 'Track Complaint', icon: Search }
    );
  } else if (role === 'STAFF') {
    navItems.push(
      { id: 'staff-dashboard', label: 'Assigned Workload', icon: FolderKanban },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'track-public', label: 'Public Track', icon: Search }
    );
  } else if (role === 'ADMIN') {
    navItems.push(
      { id: 'admin-dashboard', label: 'Overview Dashboard', icon: Home },
      { id: 'user-dashboard', label: 'All Complaints Master', icon: FolderKanban },
      { id: 'create-complaint', label: 'Log Complaint', icon: PlusCircle },
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'staff-management', label: 'Staff Management', icon: UserCheck },
      { id: 'department-management', label: 'Departments', icon: Building2 },
      { id: 'category-management', label: 'Categories & SLA', icon: FileSpreadsheet },
      { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
      { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck }
    );
  }

  // Common item
  navItems.push({ id: 'settings', label: 'Account Settings', icon: Settings });

  return (
    <aside className="w-64 shrink-0 hidden md:block bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-[calc(100vh-4rem)] p-4">
      {/* Role Badge */}
      <div className="mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/80 p-3 border border-slate-200/80 dark:border-slate-700/60">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Signed In As
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {user.name}
        </p>
        <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          ROLE: {role}
        </span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
