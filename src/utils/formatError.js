/**
 * User-friendly error message formatter for ByteBridge.
 * Sanitizes and transforms raw database errors, PostgREST schema cache warnings,
 * RPC missing function notices, and network exceptions into clear, professional messages.
 */

const TECHNICAL_PATTERNS = [
  /schema cache/i,
  /could not find the function/i,
  /function .* does not exist/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /violates .* constraint/i,
  /row-level security/i,
  /syntax error/i,
  /pgrst\d+/i,
  /42[a-z0-9]{3}/i,
  /public\./i,
  /uuid/i,
  /pgcrypto/i,
  /plpgsql/i,
];

/**
 * Checks if a string contains internal database or developer jargon.
 */
export function isTechnicalError(text) {
  if (!text || typeof text !== 'string') return false;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Formats any authentication or system error into a user-appropriate message.
 *
 * @param {Error|Object|string} err - The error caught
 * @param {'student_login'|'teacher_login'|'admin_login'|'student_register'|'teacher_register'|'general'} context
 * @returns {string} Clean, friendly user-facing message
 */
export function formatAuthError(err, context = 'general') {
  if (!err) {
    return 'An unexpected issue occurred. Please try again.';
  }

  // Extract raw message string
  const raw =
    typeof err === 'string'
      ? err
      : err?.message || err?.error_description || err?.details || err?.error || '';

  const clean = raw.trim();

  // 1. Missing RPC or Schema Cache
  if (
    /schema cache/i.test(clean) ||
    /could not find the function/i.test(clean) ||
    /function .* does not exist/i.test(clean)
  ) {
    if (context === 'student_login') {
      return 'Unable to sign in at this time. Please verify your Student ID, Birthday, and Course Year & Section, or contact your campus administrator.';
    }
    if (context === 'teacher_login') {
      return 'Unable to sign in at this time. Please verify your Full Name, Subject Code, and Course Year, or contact your campus administrator.';
    }
    if (context === 'student_register' || context === 'teacher_register') {
      return 'Account registration is currently updating. Please try again shortly or contact your campus administrator.';
    }
    return 'The system service is currently updating. Please try again shortly.';
  }

  // 2. Invalid Credentials / Wrong Password / Bad Grant
  if (
    /invalid login credentials/i.test(clean) ||
    /invalid_grant/i.test(clean) ||
    /invalid credentials/i.test(clean)
  ) {
    if (context === 'student_login') {
      return 'Invalid login details. Please double-check your Student ID, Birthday, and Course Year & Section.';
    }
    if (context === 'teacher_login') {
      return 'Invalid teacher credentials. Please double-check your Full Name, Subject Code, and Course Year.';
    }
    if (context === 'admin_login') {
      return 'Invalid email or password. Please verify your credentials and try again.';
    }
    return 'Incorrect login details. Please check your information and try again.';
  }

  // 3. User / Account Not Found
  if (
    /student id not found/i.test(clean) ||
    /no account found/i.test(clean) ||
    /user not found/i.test(clean) ||
    /teacher .* not found/i.test(clean)
  ) {
    if (context === 'student_login') {
      return 'No student record found with these details. Please verify your Student ID and Course Year & Section, or register an account.';
    }
    if (context === 'teacher_login') {
      return 'No teacher profile found with this name and subject code. Please verify your details or register.';
    }
    return 'Account not found. Please check your credentials or create a new account.';
  }

  // 4. Duplicate / Already Registered
  if (
    /already registered/i.test(clean) ||
    /already been registered/i.test(clean) ||
    /duplicate key/i.test(clean) ||
    /unique constraint/i.test(clean)
  ) {
    if (context === 'student_register') {
      return 'This email address or Student ID is already registered. Please log in instead.';
    }
    if (context === 'teacher_register') {
      return 'A teacher account with this email address or name already exists. Please log in instead.';
    }
    return 'An account with this information already exists. Please log in instead.';
  }

  // 5. Email Confirmation Required
  if (/email not confirmed/i.test(clean) || /email_not_confirmed/i.test(clean)) {
    return 'Please confirm your email address before signing in, or contact your administrator.';
  }

  // 6. Network / Connection Errors
  if (
    /failed to fetch/i.test(clean) ||
    /networkerror/i.test(clean) ||
    /err_network_changed/i.test(clean) ||
    /network changed/i.test(clean) ||
    /connection refused/i.test(clean) ||
    /timeout/i.test(clean)
  ) {
    return 'Unable to reach the ByteBridge server. Please check your internet connection and try again.';
  }

  // 7. Rate Limiting / Too Many Attempts
  if (
    /too many requests/i.test(clean) ||
    /rate limit/i.test(clean) ||
    /over_email_send_rate_limit/i.test(clean)
  ) {
    return 'Too many login attempts. Please wait a few moments before trying again.';
  }

  // 8. Password Requirements
  if (/password should be at least/i.test(clean)) {
    return 'Password must be at least 6 characters long.';
  }

  // 9. Generic Database/Internal Jargon
  if (isTechnicalError(clean)) {
    return 'Our authentication service is currently updating. Please try again shortly or contact your system administrator.';
  }

  // 10. If the message is already clean, friendly, and non-technical, return it
  if (clean.length > 0 && clean.length < 160 && !clean.includes('p_') && !clean.includes('public.')) {
    return clean;
  }

  // Fallback
  return 'Login failed. Please check your details and try again.';
}
