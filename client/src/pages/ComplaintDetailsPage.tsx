import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Shield,
  ShieldAlert,
  Star,
  User as UserIcon,
  UserCheck,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { CommentItem, CommentSection } from '../components/CommentSection';
import { Modal } from '../components/Modal';
import { PriorityBadge, PriorityLevel } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { HistoryItem, Timeline } from '../components/Timeline';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface ComplaintDetails {
  id: number;
  complaint_number: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  title: string;
  description: string;
  category_name: string;
  priority: PriorityLevel;
  status: any;
  location?: string;
  department_id?: number;
  department_name?: string;
  assigned_staff_id?: number;
  assigned_staff_name?: string;
  assigned_staff_email?: string;
  sla_deadline?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploader_name: string;
  created_at: string;
}

interface FeedbackItem {
  id: number;
  rating: number;
  comment?: string;
  user_name: string;
  created_at: string;
}

interface StaffUser {
  id: number;
  name: string;
  department_id?: number;
}

interface Department {
  id: number;
  name: string;
}

interface ComplaintDetailsPageProps {
  complaintId: number;
  onNavigate: (page: string, params?: any) => void;
}

export const ComplaintDetailsPage: React.FC<ComplaintDetailsPageProps> = ({ complaintId, onNavigate }) => {
  const { user, isAdmin, isStaff } = useAuth();

  const [data, setData] = useState<{
    complaint: ComplaintDetails;
    attachments: Attachment[];
    history: HistoryItem[];
    comments: CommentItem[];
    feedback?: FeedbackItem | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Form inputs for modals
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [selectedDept, setSelectedDept] = useState<number | ''>('');
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('');
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isResolvedConfirmed, setIsResolvedConfirmed] = useState(true);

  // Gemini AI Resolution Guide States
  const [aiAdviceModalOpen, setAiAdviceModalOpen] = useState(false);
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<{
    rootCauseAnalysis: string;
    actionSteps: string[];
    estimatedResolutionHours?: number;
    safetyPrecautions?: string;
    resolutionNoteTemplate: string;
  } | null>(null);

  // Lists for dropdowns
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [deptList, setDeptList] = useState<Department[]>([]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        complaint: ComplaintDetails;
        attachments: Attachment[];
        history: HistoryItem[];
        comments: CommentItem[];
        feedback?: FeedbackItem;
      }>(`/complaints/${complaintId}`);

      setData(res);
      setNewStatus(res.complaint.status);
      setSelectedDept(res.complaint.department_id || '');
      setSelectedStaff(res.complaint.assigned_staff_id || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  useEffect(() => {
    if (isAdmin || isStaff) {
      Promise.all([
        api.get<{ users: StaffUser[] }>('/users?role=STAFF'),
        api.get<{ departments: Department[] }>('/departments'),
      ])
        .then(([usersRes, deptRes]) => {
          setStaffList(usersRes.users || []);
          setDeptList(deptRes.departments || []);
        })
        .catch(() => {});
    }
  }, [isAdmin, isStaff]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading complaint details...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error || 'Complaint not found'}</p>
        <button
          onClick={() => onNavigate('user-dashboard')}
          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { complaint, attachments, history, comments, feedback } = data;

  const calculateSlaRemaining = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diffMs = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diffMs < 0) {
      const overHours = Math.abs(Math.floor(diffMs / (3600 * 1000)));
      const overMins = Math.abs(Math.floor((diffMs % (3600 * 1000)) / (60 * 1000)));
      return { isOverdue: true, text: `OVERDUE by ${overHours}h ${overMins}m` };
    }
    const remHours = Math.floor(diffMs / (3600 * 1000));
    const remMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return { isOverdue: false, text: `SLA Deadline: ${remHours}h ${remMins}m remaining` };
  };

  const handleStatusUpdate = async () => {
    try {
      await api.patch(`/complaints/${complaint.id}/status`, {
        status: newStatus,
        remarks: statusRemarks,
      });
      setStatusModalOpen(false);
      setStatusRemarks('');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleAssignment = async () => {
    try {
      await api.patch(`/complaints/${complaint.id}/assign`, {
        department_id: selectedDept || undefined,
        assigned_staff_id: selectedStaff || undefined,
      });
      setAssignModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to assign complaint');
    }
  };

  const handleReopen = async () => {
    try {
      await api.post(`/complaints/${complaint.id}/reopen`, {
        remarks: reopenRemarks,
      });
      setReopenModalOpen(false);
      setReopenRemarks('');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen complaint');
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await api.post(`/complaints/${complaint.id}/feedback`, {
        rating,
        comment: feedbackComment,
        is_resolved: isResolvedConfirmed,
      });
      setFeedbackModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    }
  };

  const fetchAiAdvice = async () => {
    setAiAdviceModalOpen(true);
    if (aiAdvice) return;
    setAiAdviceLoading(true);
    try {
      const res = await api.post<{
        advice: {
          rootCauseAnalysis: string;
          actionSteps: string[];
          estimatedResolutionHours?: number;
          safetyPrecautions?: string;
          resolutionNoteTemplate: string;
        };
      }>(`/complaints/${complaint.id}/ai-resolution-advice`, {});
      setAiAdvice(res.advice);
    } catch (err: any) {
      alert(err.message || 'Failed to load AI resolution guide');
    } finally {
      setAiAdviceLoading(false);
    }
  };

  const slaInfo = calculateSlaRemaining(complaint.sla_deadline);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
              {complaint.complaint_number}
            </span>
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {complaint.title}
          </h1>
        </div>

        {/* Action Controls based on Role */}
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isStaff) && (
            <>
              <button
                onClick={() => setStatusModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" /> Update Status
              </button>

              <button
                onClick={() => setAssignModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" /> Assign Staff
              </button>

              <button
                onClick={fetchAiAdvice}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-200" /> ✨ AI Resolution Guide
              </button>
            </>
          )}

          {/* User Actions */}
          {complaint.user_id === user?.id && ['RESOLVED'].includes(complaint.status) && (
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Star className="w-3.5 h-3.5 fill-current" /> Confirm Resolution & Rating
            </button>
          )}

          {complaint.user_id === user?.id && ['RESOLVED', 'CLOSED'].includes(complaint.status) && (
            <button
              onClick={() => setReopenModalOpen(true)}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Issue Unresolved? Reopen
            </button>
          )}
        </div>
      </div>

      {/* SLA Status Bar */}
      {complaint.sla_deadline && !['RESOLVED', 'CLOSED'].includes(complaint.status) && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            slaInfo?.isOverdue
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 font-bold'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{slaInfo?.text}</span>
          </div>
          <span className="font-mono text-[11px] opacity-80">
            Target SLA: {new Date(complaint.sla_deadline).toLocaleString()}
          </span>
        </div>
      )}

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Details, Attachments, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Complaint Description
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* Attachments Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> Evidence Attachments ({attachments.length})
            </h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No attachments provided.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => {
                  const isImg = att.file_type.startsWith('image/');
                  return (
                    <a
                      key={att.id}
                      href={att.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isImg ? (
                          <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{att.file_name}</p>
                          <p className="text-[10px] text-slate-400">
                            by {att.uploader_name} • {(att.file_size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Feedback Card (if submitted) */}
          {feedback && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  User Rating & Feedback
                </h3>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                    />
                  ))}
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 ml-1">
                    {feedback.rating}/5
                  </span>
                </div>
              </div>
              {feedback.comment && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300 italic">
                  "{feedback.comment}"
                </p>
              )}
            </div>
          )}

          {/* In-App Chat / Comments */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <CommentSection
              complaintId={complaint.id}
              comments={comments}
              onCommentAdded={fetchDetails}
            />
          </div>
        </div>

        {/* Right Column (1/3): Assignment, Metadata & Timeline */}
        <div className="space-y-6">
          {/* Metadata Sidebar Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Assignment & Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">Department</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {complaint.department_name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">Assigned Staff</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {complaint.assigned_staff_name || 'Pending assignment'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">Submitted By</span>
                  <p className="font-bold text-slate-900 dark:text-white">{complaint.user_name}</p>
                  <p className="text-[10px] text-slate-400">{complaint.user_email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">Location</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {complaint.location || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">Created Date</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {new Date(complaint.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Timeline
            </h3>
            <Timeline history={history} />
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Complaint Status"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white"
            >
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Progress Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add explanation for status update..."
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusUpdate}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs"
            >
              Save Status
            </button>
          </div>
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Department & Staff"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(Number(e.target.value) || '')}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Unassigned --</option>
              {deptList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Staff Member
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(Number(e.target.value) || '')}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Select Staff --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignment}
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs"
            >
              Save Assignment
            </button>
          </div>
        </div>
      </Modal>

      {/* Reopen Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title="Reopen Complaint"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            If your issue was not properly fixed, you can reopen this complaint to notify staff and administrators.
          </p>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Reopening <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explain why the issue persists..."
              value={reopenRemarks}
              onChange={(e) => setReopenRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setReopenModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleReopen}
              className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-xs"
            >
              Confirm Reopen
            </button>
          </div>
        </div>
      </Modal>

      {/* Feedback & Confirmation Modal */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Confirm Resolution & Leave Feedback"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl">
            <label className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isResolvedConfirmed}
                onChange={(e) => setIsResolvedConfirmed(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              Yes, my issue has been completely resolved.
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Rate Service Quality
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Feedback Comment (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Share your experience..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setFeedbackModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleFeedbackSubmit}
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </Modal>

      {/* Gemini AI Resolution Advisor Modal */}
      <Modal
        isOpen={aiAdviceModalOpen}
        onClose={() => setAiAdviceModalOpen(false)}
        title="✨ Gemini AI Resolution & Engineering Advisor"
      >
        <div className="space-y-4 text-xs">
          {aiAdviceLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Sparkles className="w-8 h-8 text-purple-600 animate-spin" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Gemini 2.5 is analyzing incident context & engineering blueprints...
              </p>
            </div>
          ) : aiAdvice ? (
            <>
              {/* Root cause */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  Potential Root Cause
                </h4>
                <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                  {aiAdvice.rootCauseAnalysis}
                </p>
              </div>

              {/* Action Steps */}
              {aiAdvice.actionSteps && aiAdvice.actionSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Recommended Action Steps
                  </h4>
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {aiAdvice.actionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiAdvice.safetyPrecautions && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                    <p className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1 mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Safety Precautions
                    </p>
                    <p className="text-[11px] text-red-800 dark:text-red-300">{aiAdvice.safetyPrecautions}</p>
                  </div>
                )}
                {aiAdvice.estimatedResolutionHours && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Estimated Resolution Time
                    </p>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      ~ {aiAdvice.estimatedResolutionHours} hours to diagnose & resolve
                    </p>
                  </div>
                )}
              </div>

              {/* Resolution Message Template */}
              {aiAdvice.resolutionNoteTemplate && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Suggested Resolution Note for Complainant
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusRemarks(aiAdvice.resolutionNoteTemplate);
                        setNewStatus('RESOLVED');
                        setAiAdviceModalOpen(false);
                        setStatusModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors"
                    >
                      Use as Resolution Note →
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic text-[11px]">
                    "{aiAdvice.resolutionNoteTemplate}"
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 py-4 text-center">No guidance generated yet.</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setAiAdviceModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
