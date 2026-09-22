import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Clock,
  FileCheck,
  LifeBuoy,
  Search,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [trackId, setTrackId] = useState('');

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      onNavigate('track', { complaintNumber: trackId.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-500 selection:text-white">
      {/* Background Decorator */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Shield className="w-3.5 h-3.5" />
          Centralized Digital Complaint & SLA Management Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Report. Track. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Resolve.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          A smarter, accountable way to handle institutional complaints, eliminate lost requests, monitor SLAs, and boost resolution speeds.
        </p>

        {/* Quick Public Track Box */}
        <div className="mt-10 max-w-xl mx-auto bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Complaint ID (e.g. CMP-2026-000001)..."
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="w-full h-11 bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 bg-blue-600 hover:bg-blue-500 font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              Track Issue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {user ? (
            <button
              onClick={() => onNavigate(user.role === 'ADMIN' ? 'admin-dashboard' : user.role === 'STAFF' ? 'staff-dashboard' : 'user-dashboard')}
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-sm rounded-xl transition-all shadow-xl shadow-blue-500/25 flex items-center gap-2"
            >
              Go to Workspace Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('register')}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-sm rounded-xl transition-all shadow-xl shadow-blue-500/25 flex items-center gap-2"
              >
                Submit a Complaint
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-200 border border-slate-700 rounded-xl transition-all"
              >
                Sign In to Portal
              </button>
            </>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 text-center mb-2">
          Enterprise Features
        </h2>
        <p className="text-2xl sm:text-3xl font-extrabold text-center mb-12">
          Built for Institutions, Campuses & Organizations
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-blue-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Smart Priority Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Analyzes hazard keywords like fire, gas leak, or electrical fault to suggest high/critical priorities and prevent delays.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">SLA Countdown & Escalation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Configurable SLA target hours per category. Automated escalations notify admins and department leads when target times breach.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Interactive Analytics</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time KPI metrics, department workload distribution, staff resolution rate, and downloadable CSV/PDF reports.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 text-center mb-2">
          End-to-End Workflow
        </h2>
        <p className="text-2xl sm:text-3xl font-extrabold text-center mb-12">
          How ResolvIQ Works
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { step: '1', title: 'Submit', desc: 'User logs complaint with photos, location & category' },
            { step: '2', title: 'Assign', desc: 'Routed to specific department & staff' },
            { step: '3', title: 'Track', desc: 'Monitor live progress timeline & SLA countdown' },
            { step: '4', title: 'Resolve', desc: 'Staff updates notes and resolution proof' },
            { step: '5', title: 'Verify & Rating', desc: 'User confirms, rates service, or reopens' },
          ].map((item) => (
            <div key={item.step} className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 text-center relative">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                {item.step}
              </div>
              <h4 className="font-bold text-base mb-1">{item.title}</h4>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
