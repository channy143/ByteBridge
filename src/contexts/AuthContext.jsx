import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { formatAuthError } from '../utils/formatError';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Once the app has booted (session + profile resolved), auth background
  // events -- token refresh when a tab regains focus, session sync across
  // tabs, USER_UPDATED, etc. -- must never flip `loading` back to true.
  // Doing so unmounts/remounts the whole app and looks like a page refresh.
  const bootedRef = useRef(false);

  // Derived state: email confirmation is disabled, so accounts are created activated.
  const emailConfirmed = !!user?.email_confirmed_at;

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Keep the app in the loading state until the profile is fetched,
        // otherwise ProtectedRoute would bounce to /login mid-login.
        setLoading(true);
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
        bootedRef.current = true;
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;

      if (currentUser) {
        // A silent token refresh fires whenever a tab regains focus. The user
        // identity is identical, so ignore it entirely -- setting a new user
        // object here hands every page a fresh identity and re-renders them.
        if (event === 'TOKEN_REFRESHED') return;

        setUser(currentUser);
        if (!bootedRef.current) {
          // Initial boot (or a sign-in racing it): hold the loading state until
          // the profile is fetched so the login page never flashes mid-login.
          setLoading(true);
          fetchProfile(currentUser.id, currentUser);
        } else if (event === 'SIGNED_IN') {
          // A real sign-in while already booted: reload the profile in the
          // background without flashing the loading screen.
          fetchProfile(currentUser.id, currentUser);
        }
        // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION while booted:
        // the user is already synced above; nothing that remounts the app.
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, sessionUser = null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        // PGRST116 means no rows returned (profile doesn't exist yet)
        if (error.code === 'PGRST116' && sessionUser?.user_metadata) {
          const meta = sessionUser.user_metadata;

          // Teacher accounts are provisioned by the administrator
          // (admin_create_teacher); there is no teacher self-registration.
          if (meta.role === 'teacher') {
            console.error('Teacher profile is missing. Teacher accounts must be created by the administrator.');
            setProfile(null);
            return;
          }

          if (meta.student_id) {
            console.log('Profile missing, auto-creating from metadata using RPC...');
            const { error: rpcError } = await supabase.rpc('register_new_student', {
              p_auth_id: userId,
              p_student_id: meta.student_id,
              p_full_name: meta.full_name,
              p_birthdate: meta.birthdate,
              p_email: sessionUser.email,
              p_course_year_section: meta.course_year_section || null,
              p_program: meta.program || null,
              p_year_level: meta.year_level || null,
              p_section: meta.section || null,
            });

            if (!rpcError) {
              // Fetch the newly created profile
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              setProfile(newProfile);
              return;
            }
            console.error('Failed to auto-create profile:', rpcError);
          }
        }
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Exception fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
      bootedRef.current = true;
    }
  };

  // Standard email/password sign in
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign up with email/password and save metadata for profile creation
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  };

  // Send a password reset link
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { data, error };
  };

  // Teacher sign in via full name, subject code, and course year
  const signInAsTeacher = async (name, subjectCode, courseYear) => {
    // 1. Try 3-argument RPC (full_name, subject_code, course_year)
    let { data, error: rpcError } = await supabase.rpc('login_teacher', {
      p_full_name: (name || '').trim(),
      p_subject_code: (subjectCode || '').trim(),
      p_course_year: (courseYear || '').trim(),
    });

    // Fallback to 2-argument RPC if 3-argument version is not in schema cache
    if (rpcError && (rpcError.message?.includes('schema cache') || rpcError.message?.includes('function') || rpcError.code === 'PGRST202')) {
      const fallbackRes = await supabase.rpc('login_teacher', {
        p_full_name: (name || '').trim(),
        p_subject_code: (subjectCode || '').trim(),
      });
      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        rpcError = null;
      }
    }

    if (rpcError) throw new Error(formatAuthError(rpcError, 'teacher_login'));
    if (!data?.success) throw new Error(formatAuthError(data?.error || 'Login failed.', 'teacher_login'));

    // 2. Sign in with the account email + derived session token
    const signRes = await signIn(data.email, data.session_token);
    if (signRes.error) {
      throw new Error(formatAuthError(signRes.error, 'teacher_login'));
    }
    return signRes;
  };

  // Teacher self-registration (from the Login page)
  const registerTeacher = async (fullName, email, subjectCode, courseYear, password = null) => {
    let { data, error } = await supabase.rpc('register_teacher_account', {
      p_full_name: (fullName || '').trim(),
      p_email: (email || '').trim(),
      p_subject_code: (subjectCode || '').trim(),
      p_course_year: (courseYear || '').trim(),
      p_password: password || null,
    });

    // Fallback if course_year parameter is not in older RPC
    if (error && (error.message?.includes('schema cache') || error.message?.includes('function') || error.code === 'PGRST202')) {
      const fallbackRes = await supabase.rpc('register_teacher_account', {
        p_full_name: (fullName || '').trim(),
        p_email: (email || '').trim(),
        p_subject_code: (subjectCode || '').trim(),
        p_password: password || null,
      });
      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error) throw new Error(formatAuthError(error, 'teacher_register'));
    if (!data?.success) throw new Error(formatAuthError(data?.error || 'Registration failed.', 'teacher_register'));
    return data;
  };

  // Student sign in via student ID, birthday, and course year & section
  const signInAsStudent = async (studentId, birthdate, courseYearSection) => {
    // 1. Try modern 3-argument RPC (student_id, birthdate, course_year_section)
    let { data, error: rpcError } = await supabase.rpc('login_student', {
      p_student_id: (studentId || '').trim(),
      p_birthdate: birthdate,
      p_course_year_section: (courseYearSection || '').trim(),
    });

    // Fallback to 2-argument RPC if database hasn't applied the 3-argument migration yet
    if (rpcError && (rpcError.message?.includes('schema cache') || rpcError.message?.includes('function') || rpcError.code === 'PGRST202')) {
      const fallbackRes = await supabase.rpc('login_student', {
        p_student_id: (studentId || '').trim(),
        p_birthdate: birthdate,
      });
      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        rpcError = null;
      }
    }

    if (rpcError) throw new Error(formatAuthError(rpcError, 'student_login'));
    if (!data?.success) throw new Error(formatAuthError(data?.error || 'Login failed.', 'student_login'));

    // 2. Sign in with the email + birthdate as password
    const signRes = await signIn(data.email, birthdate);
    if (signRes.error) {
      throw new Error(formatAuthError(signRes.error, 'student_login'));
    }
    return signRes;
  };

  // Admin sign in via real email/password credentials
  const signInAsAdmin = async (email, password) => {
    const { data, error } = await signIn(email.trim(), password);
    if (error) return { data, error };

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      await supabase.auth.signOut();
      setProfile(null);
      return {
        data: null,
        error: { message: 'Access denied. This account does not have administrator privileges.' },
      };
    }

    return { data, error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      emailConfirmed,
      signIn,
      signUp,
      signOut,
      signInAsTeacher,
      signInAsStudent,
      signInAsAdmin,
      registerTeacher,
      resetPassword,
      refreshProfile: () => user ? fetchProfile(user.id, user) : Promise.resolve(),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
