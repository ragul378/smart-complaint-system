import React from 'react';
import { Shield, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DemoSwitcher: React.FC = () => {
  const { login, user } = useAuth();

  const handleQuickLogin = async (email: string, pass: string) => {
    try {
      await login(email, pass);
    } catch (err: any) {
      alert(err.message || 'Login failed');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2 text-xs animate-slide-up">
      <span className="font-bold text-slate-400 hidden sm:inline mr-1">Demo Quick Login:</span>
      
      <button
        onClick={() => handleQuickLogin('admin@example.com', 'admin123')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          user?.role === 'ADMIN'
            ? 'bg-red-600 text-white font-bold ring-2 ring-red-400'
            : 'bg-slate-800 hover:bg-red-600/80 text-slate-200'
        }`}
        title="Admin: admin@example.com / admin123"
      >
        <Shield className="w-3.5 h-3.5 text-red-400" />
        Admin
      </button>

      <button
        onClick={() => handleQuickLogin('staff@example.com', 'staff123')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          user?.role === 'STAFF'
            ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400'
            : 'bg-slate-800 hover:bg-blue-600/80 text-slate-200'
        }`}
        title="Staff: staff@example.com / staff123"
      >
        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
        Staff
      </button>

      <button
        onClick={() => handleQuickLogin('user@example.com', 'user123')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          user?.role === 'USER'
            ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400'
            : 'bg-slate-800 hover:bg-emerald-600/80 text-slate-200'
        }`}
        title="User: user@example.com / user123"
      >
        <Users className="w-3.5 h-3.5 text-emerald-400" />
        User
      </button>
    </div>
  );
};
