import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import Avatar from '../ui/Avatar';

export default function Topbar({ onOpenSidebar }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    const loadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      if (!error) setUnreadCount(count || 0);
    };
    loadCount();

    const channel = supabase
      .channel('topbar-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => setUnreadCount((c) => c + 1))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 hidden sm:block">
          BTLED ICT Workspace
        </span>
      </div>

      <div className="flex items-center gap-1.5 relative" ref={menuRef}>
        <Link
          to="/notifications"
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Avatar name={profile?.full_name} size={28} />
          <span className="hidden md:block text-left">
            <span className="block text-[13px] font-semibold text-slate-800 leading-tight">
              {profile?.full_name || user?.email}
            </span>
            <span className="block text-[10.5px] text-slate-400 capitalize leading-tight">
              {profile?.role || '—'}
            </span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {menuOpen && (
          <div className="absolute top-13 right-2 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-[13px] font-semibold text-slate-900">{profile?.full_name}</p>
              <p className="text-[11.5px] text-slate-400 capitalize">{profile?.role} account</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <User className="w-4 h-4 text-slate-400" /> Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
