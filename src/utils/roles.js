export const homePathFor = (profile) => {
  if (!profile) return '/login';
  if (profile.role === 'admin') return '/admin';
  if (profile.role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
};
