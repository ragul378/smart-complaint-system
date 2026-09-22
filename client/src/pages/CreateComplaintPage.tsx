import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  MapPin,
  Paperclip,
  Shield,
  Sparkles,
} from 'lucide-react';
import { FileUploader } from '../components/FileUploader';
import { PriorityBadge, PriorityLevel } from '../components/PriorityBadge';
import { api } from '../services/api';

interface Category {
  id: number;
  name: string;
  description: string;
  default_sla: number;
}

interface Department {
  id: number;
  name: string;
}

interface DuplicateComplaint {
  id: number;
  complaint_number: string;
  title: string;
  category_name: string;
  status: string;
}

interface CreateComplaintPageProps {
  onNavigate: (page: string, params?: any) => void;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Internet / Network', description: 'Wi-Fi connectivity, LAN ports, and router outages', default_sla: 12 },
  { id: 2, name: 'Electrical', description: 'Short circuits, power trips, broken lights, and socket issues', default_sla: 12 },
  { id: 3, name: 'Plumbing', description: 'Water leaks, clogged drains, tap repairs, and tank overflow', default_sla: 24 },
  { id: 4, name: 'Infrastructure', description: 'Cracked walls, broken furniture, doors, windows, and ceiling', default_sla: 48 },
  { id: 5, name: 'Cleaning & Sanitation', description: 'Unclean washrooms, garbage accumulation, and pest control', default_sla: 24 },
  { id: 6, name: 'Security & Safety', description: 'Unauthorized entry, missing equipment, broken gates, hazards', default_sla: 4 },
  { id: 7, name: 'Canteen / Food', description: 'Food quality, hygiene in mess, drinking water dispensers', default_sla: 12 },
  { id: 8, name: 'Transportation', description: 'Bus delays, parking space blockage, shuttle service issues', default_sla: 24 },
  { id: 9, name: 'Hostel / Accommodation', description: 'Bed allotment, hot water availability, quiet hours compliance', default_sla: 24 },
  { id: 10, name: 'Academic & Administration', description: 'Classroom projectors, fee receipts, certificate issuance', default_sla: 48 },
];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 1, name: 'IT Support' },
  { id: 2, name: 'Electrical' },
  { id: 3, name: 'Maintenance' },
  { id: 4, name: 'Security' },
  { id: 5, name: 'Housekeeping' },
  { id: 6, name: 'Transport' },
  { id: 7, name: 'Hostel' },
  { id: 8, name: 'Administration' },
];

export const CreateComplaintPage: React.FC<CreateComplaintPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [priority, setPriority] = useState<PriorityLevel>('LOW');
  const [location, setLocation] = useState('');
  const [contactMethod, setContactMethod] = useState('IN_APP');
  const [files, setFiles] = useState<File[]>([]);

  // Smart Engine States
  const [suggestedPriority, setSuggestedPriority] = useState<{
    priority: PriorityLevel;
    reason: string;
    aiPowered?: boolean;
    suggestedCategoryId?: number;
  } | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateComplaint[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load categories & departments
    Promise.all([
      api.get<{ categories: Category[] }>('/categories'),
      api.get<{ departments: Department[] }>('/departments'),
    ])
      .then(([catRes, deptRes]) => {
        setCategories(catRes.categories || []);
        setDepartments(deptRes.departments || []);
      })
      .catch(() => console.error('Failed to load form dropdowns'));
  }, []);

  // Smart Priority Evaluation Trigger (powered by Gemini AI)
  useEffect(() => {
    if (title.length > 5 || description.length > 10) {
      const timer = setTimeout(() => {
        api
          .post<{
            suggestedPriority: PriorityLevel;
            reason: string;
            aiPowered?: boolean;
            suggestedCategoryId?: number;
          }>('/complaints/suggest-priority', {
            title,
            description,
            category_id: categoryId || undefined,
          })
          .then((res) => {
            if (res.suggestedPriority !== 'LOW' && res.suggestedPriority !== priority) {
              setSuggestedPriority({
                priority: res.suggestedPriority,
                reason: res.reason,
                aiPowered: res.aiPowered,
                suggestedCategoryId: res.suggestedCategoryId,
              });
            } else {
              setSuggestedPriority(null);
            }
          })
          .catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSuggestedPriority(null);
    }
  }, [title, description, categoryId]);

  const handleAiEnhance = async () => {
    if (!title && !description) return;
    setIsEnhancing(true);
    setAiTip(null);
    try {
      const res = await api.post<{
        enhancedTitle: string;
        enhancedDescription: string;
        tips?: string;
      }>('/complaints/ai-enhance', {
        title: title || 'Maintenance issue report',
        description: description || title,
        category_id: categoryId || undefined,
      });

      if (res.enhancedTitle) setTitle(res.enhancedTitle);
      if (res.enhancedDescription) setDescription(res.enhancedDescription);
      if (res.tips) setAiTip(res.tips);
    } catch (err: any) {
      console.error('AI Enhance error:', err);
      alert('Could not enhance description right now: ' + (err.message || 'Please check API key'));
    } finally {
      setIsEnhancing(false);
    }
  };

  // Duplicate Check Trigger
  useEffect(() => {
    if (title.length > 6 && categoryId) {
      const timer = setTimeout(() => {
        api
          .post<{ duplicates: DuplicateComplaint[] }>('/complaints/check-duplicates', {
            title,
            category_id: categoryId,
            location,
          })
          .then((res) => setDuplicates(res.duplicates || []))
          .catch(() => setDuplicates([]));
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setDuplicates([]);
    }
  }, [title, categoryId, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !categoryId) {
      setError('Please fill in all required fields (Title, Category, and Description).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category_id', String(categoryId));
      formData.append('priority', priority);
      if (departmentId) formData.append('department_id', String(departmentId));
      if (location) formData.append('location', location);
      formData.append('contact_method', contactMethod);

      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post<{ message: string; complaint: any }>('/complaints', formData);
      onNavigate('complaint-details', { id: res.complaint.id });
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Submit New Complaint
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Provide complete details to route your issue directly to the appropriate department.
        </p>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicates.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Potential Duplicate Complaints Detected ({duplicates.length} matching)</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-400">
            Similar complaints already exist in this category. You may track existing issues instead of creating a duplicate:
          </p>
          <div className="space-y-1.5 pt-1">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                onClick={() => onNavigate('complaint-details', { id: dup.id })}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 cursor-pointer hover:bg-amber-100/50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {dup.complaint_number}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">{dup.title}</span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                  View Issue →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5"
      >
        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 font-medium">
            {error}
          </div>
        )}

        {/* Category & Department row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value) || '')}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (SLA: {c.default_sla}h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Department (Optional)
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(Number(e.target.value) || '')}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Auto Route / System Choice --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Complaint Title / Summary <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Internet connection unavailable in Lab 204"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              disabled={isEnhancing || (!title && !description)}
              onClick={handleAiEnhance}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isEnhancing ? 'animate-spin' : ''}`} />
              {isEnhancing ? 'Gemini AI Enhancing...' : '✨ Enhance with Gemini AI'}
            </button>
          </div>
          <textarea
            required
            rows={4}
            placeholder="Describe what happened, equipment involved, frequency, and severity..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          {aiTip && (
            <div className="mt-1.5 p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-800 dark:text-purple-300 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>AI Tip:</strong> {aiTip}</span>
            </div>
          )}
        </div>

        {/* Priority & Smart Suggestion Banner */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Priority Level
            </label>
            <div className="flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as PriorityLevel[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    priority === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {suggestedPriority && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-start sm:items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-indigo-900 dark:text-indigo-200">
                      Smart Priority Recommendation: <span className="underline">{suggestedPriority.priority}</span>
                    </p>
                    {suggestedPriority.aiPowered && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full">
                        ✨ Gemini AI
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">{suggestedPriority.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPriority(suggestedPriority.priority);
                    if (suggestedPriority.suggestedCategoryId && !categoryId) {
                      setCategoryId(suggestedPriority.suggestedCategoryId);
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Apply {suggestedPriority.priority}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Location & Preferred Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Location / Room / Area
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Block B, 2nd Floor, Room 204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Preferred Contact Method
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="IN_APP">In-App Notification & Chat</option>
              <option value="EMAIL">Email Update</option>
              <option value="PHONE">Phone Call</option>
            </select>
          </div>
        </div>

        {/* File Attachments */}
        <FileUploader onFilesSelected={setFiles} maxFiles={5} />

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            {submitting ? 'Submitting...' : 'Register Complaint'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
