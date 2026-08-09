import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { LogOut, Layout, Bell, Menu, X } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/dashboard', label: 'Home' },
  { to: '/profile', label: 'Profile' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/roster', label: 'Roster & Dockets' },
  { to: '/materials', label: 'Materials' },
  { to: '/classroom', label: 'Virtual Classroom' },
];

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchUnreadCount();

      const channel = supabase
        .channel('navbar-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (!error) setUnreadCount(count || 0);
    } catch (err) {
      // silent
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo + Desktop Links */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <Layout className="h-6 w-6 text-primary-600 mr-2" />
                <span className="font-bold text-xl text-slate-900 tracking-tight">ByteBridge</span>
              </Link>

              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Notifications + User + Sign Out */}
            <div className="flex items-center space-x-3">
              <Link
                to="/notifications"
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="text-sm text-slate-700 hidden sm:block">
                <span className="font-semibold">{profile?.full_name || user?.email}</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-xs font-medium capitalize">
                  {profile?.role || '...'}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="hidden sm:flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden lg:inline">Sign out</span>
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-16 w-64 bg-white shadow-xl border-l border-slate-200 h-[calc(100vh-64px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="font-semibold text-sm text-slate-900">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
            </div>
            <div className="py-2">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/notifications"
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === '/notifications'
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Notifications {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount}</span>}
              </Link>
            </div>
            <div className="px-4 py-4 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
