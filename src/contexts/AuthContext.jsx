import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derived state: email confirmation is disabled, so accounts are created activated.
  const emailConfirmed = !!user?.email_confirmed_at;

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
      } else {
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

          if (meta.role === 'teacher' && meta.full_name) {
            console.log('Profile missing, auto-creating teacher profile using RPC...');
            const { error: rpcError } = await supabase.rpc('register_new_teacher', {
              p_auth_id: userId,
              p_full_name: meta.full_name,
              p_subject_code: meta.subject_code || 'ICT 101',
              p_email: sessionUser.email
            });

            if (!rpcError) {
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              setProfile(newProfile);
              return;
            }
            console.error('Failed to auto-create teacher profile:', rpcError);
          } else if (meta.student_id) {
            console.log('Profile missing, auto-creating from metadata using RPC...');
            const { error: rpcError } = await supabase.rpc('register_new_student', {
              p_auth_id: userId,
              p_student_id: meta.student_id,
              p_full_name: meta.full_name,
              p_birthdate: meta.birthdate,
              p_email: sessionUser.email
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

  // Teacher sign in (keeping existing synthetic email approach)
  const signInAsTeacher = async (name, subjectCode) => {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanName}@teacher.bytebridge.local`;
    const password = subjectCode.trim().toLowerCase().replace(/\s+/g, '');
    return await signIn(email, password);
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
      resetPassword,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
