import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton, SkeletonCircle } from '../components/ui/Skeleton';
import { Bell, CheckCheck, Megaphone, FileText, BookOpen, Video, Star } from 'lucide-react';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchNotifications();

      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationIcon = (title) => {
    const t = (title || '').toLowerCase();
    if (t.includes('announcement')) return <Megaphone className="w-5 h-5 text-blue-500" />;
    if (t.includes('activity') || t.includes('assignment')) return <FileText className="w-5 h-5 text-amber-500" />;
    if (t.includes('grade') || t.includes('graded')) return <Star className="w-5 h-5 text-green-500" />;
    if (t.includes('material') || t.includes('module')) return <BookOpen className="w-5 h-5 text-purple-500" />;
    if (t.includes('class') || t.includes('meeting')) return <Video className="w-5 h-5 text-red-500" />;
    return <Bell className="w-5 h-5 text-slate-400" />;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on your subjects and activities."
        action={unreadCount > 0 ? (
          <button onClick={markAllAsRead} className="flex items-center text-[13px] font-medium text-primary-600 hover:text-primary-700 transition-colors">
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all read
          </button>
        ) : null}
      />

      {loading ? (
        <div className="ws-card overflow-hidden divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start px-5 py-4">
              <SkeletonCircle size={36} className="mt-0.5" />
              <div className="ml-3.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-1/2 rounded" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded mt-2" />
                <Skeleton className="h-3 w-3/4 rounded mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="ws-card">
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="All caught up!"
            description="You have no notifications right now."
          />
        </div>
      ) : (
        <div className="ws-card overflow-hidden divide-y divide-slate-100">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start px-5 py-4 transition-colors cursor-pointer ${
                notification.is_read
                  ? 'bg-white hover:bg-slate-50/60'
                  : 'bg-primary-50/40 hover:bg-primary-50'
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <span className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                {getNotificationIcon(notification.title)}
              </span>
              <div className="ml-3.5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h4 className={`text-[13.5px] font-medium truncate ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-[11.5px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                <p className={`text-[12.5px] mt-0.5 ${notification.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                  {notification.message}
                </p>
              </div>
              {!notification.is_read && (
                <span className="ml-3 flex-shrink-0 mt-2">
                  <span className="block w-2 h-2 rounded-full bg-primary-500"></span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
