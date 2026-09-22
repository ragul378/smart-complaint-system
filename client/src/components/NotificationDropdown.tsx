import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { api } from '../services/api';

export interface NotificationItem {
  id: number;
  complaint_id?: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

interface NotificationDropdownProps {
  onSelectNotification?: (complaintId: number) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onSelectNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Auto poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read');
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      api.patch(`/notifications/${item.id}/read`).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (item.complaint_id && onSelectNotification) {
      onSelectNotification(item.complaint_id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    !n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h5 className={`text-xs font-semibold ${!n.is_read ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {n.title}
                    </h5>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
