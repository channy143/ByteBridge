import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import { Bell, Check, CheckCheck, Megaphone, FileText, BookOpen, Video, Star, Loader2 } from 'lucide-react';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      
      // Subscribe to realtime notifications
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Bell className="w-6 h-6 mr-2 text-primary-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-3 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-slate-600 text-sm mt-1">Stay updated on your courses and activities.</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
            <p className="text-slate-500 mt-1">You have no notifications right now.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start p-4 transition-colors cursor-pointer ${
                  notification.is_read 
                    ? 'bg-white hover:bg-slate-50' 
                    : 'bg-primary-50/50 hover:bg-primary-50'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.title)}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className={`text-sm font-medium ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-slate-400 ml-4 flex-shrink-0 whitespace-nowrap">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 ${notification.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="ml-3 flex-shrink-0 mt-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
