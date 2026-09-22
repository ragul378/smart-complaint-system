import React, { useState } from 'react';
import { ArrowRight, KeyRound, LifeBuoy, Mail, Shield, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') onNavigate('admin-dashboard');
      else if (user.role === 'STAFF') onNavigate('staff-dashboard');
      else onNavigate('user-dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome Back
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to access your ResolvIQ complaint portal
          </p>
        </div>

        {/* Demo Credentials Quick Fill */}
        <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-2">
          <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 text-center">
            ⚡ Quick Demo Accounts (Click to Autofill):
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@example.com', 'admin123')}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1 text-[11px] transition-colors"
            >
              <Shield className="w-3 h-3 text-red-500" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('staff@example.com', 'staff123')}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1 text-[11px] transition-colors"
            >
              <UserCheck className="w-3 h-3 text-blue-500" />
              Staff
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('user@example.com', 'user123')}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1 text-[11px] transition-colors"
            >
              <Users className="w-3 h-3 text-emerald-500" />
              User
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have an account yet?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Register Now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
