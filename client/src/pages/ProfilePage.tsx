import React, { useState } from 'react';
import { KeyRound, Mail, Phone, Save, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [passMsg, setPassMsg] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', { name, phone });
      await refreshUser();
      setMsg('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPassMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Manage your contact details and account security.</p>
      </div>

      {/* Profile Info */}
      <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Personal Information
        </h3>

        {msg && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{msg}</p>}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email (Read Only)</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-3 text-xs opacity-75 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save Profile
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Security & Password
        </h3>

        {passMsg && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{passMsg}</p>}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Update Password
          </button>
        </div>
      </form>
    </div>
  );
};
