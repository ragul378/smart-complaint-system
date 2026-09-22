import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'STAFF' | 'ADMIN';
  department_id?: number;
  department_name?: string;
  status: 'ACTIVE' | 'INACTIVE';
  user_complaints_count: number;
  created_at: string;
}

interface Department {
  id: number;
  name: string;
}

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'USER' | 'STAFF' | 'ADMIN'>('USER');
  const [addDept, setAddDept] = useState<number | ''>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        api.get<{ users: UserRecord[] }>(`/users?role=${roleFilter}&search=${encodeURIComponent(searchTerm)}`),
        api.get<{ departments: Department[] }>('/departments'),
      ]);
      setUsers(uRes.users || []);
      setDepartments(dRes.departments || []);
    } catch (err) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        name: addName,
        email: addEmail,
        phone: addPhone,
        password: addPassword,
        role: addRole,
        department_id: addDept || undefined,
      });

      setIsAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (user: UserRecord) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/users/${user.id}`, {
        ...user,
        status: newStatus,
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            User Management Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View, add, activate/deactivate system accounts and assign user roles.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* User Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading user directory...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">Name & Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Complaints</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 pl-6">
                      <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : u.role === 'STAFF'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {u.department_name || '-'}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {u.user_complaints_count || 0}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-right space-x-2">
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add System User">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              >
                <option value="USER">USER</option>
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={addDept}
                onChange={(e) => setAddDept(Number(e.target.value) || '')}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              >
                <option value="">None / General</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
