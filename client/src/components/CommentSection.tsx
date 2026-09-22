import React, { useState } from 'react';
import { Send, User } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface CommentItem {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface CommentSectionProps {
  complaintId: number;
  comments: CommentItem[];
  onCommentAdded: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  complaintId,
  comments,
  onCommentAdded,
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/complaints/${complaintId}/comments`, { message });
      setMessage('');
      onCommentAdded();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.2 rounded font-bold">ADMIN</span>;
      case 'STAFF':
        return <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold">STAFF</span>;
      default:
        return <span className="text-[10px] bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-1.5 py-0.2 rounded font-bold">USER</span>;
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
        <span>Communication & Progress Notes</span>
        <span className="text-xs text-slate-400 font-normal">{comments.length} messages</span>
      </h4>

      {/* Messages Feed */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            No communication history yet. Send a message below.
          </p>
        ) : (
          comments.map((c) => {
            const isMe = c.user_id === user?.id;
            return (
              <div
                key={c.id}
                className={`flex gap-3 text-xs ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                  {c.user_name.charAt(0).toUpperCase()}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl p-3 border ${
                    isMe
                      ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${isMe ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                      {c.user_name}
                    </span>
                    {getRoleBadge(c.user_role)}
                    <span className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message or progress update..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};
