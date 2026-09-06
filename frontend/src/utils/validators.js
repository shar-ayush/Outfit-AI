// src/utils/validators.js
//
// Shared validation used by React Hook Form `rules={}` props across the
// auth screens (and later, item-edit / onboarding forms).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value).trim());
}

// React Hook Form rule objects — spread directly into <Controller rules={...}>
export const emailRules = {
  required: 'Email is required',
  validate: (value) => isValidEmail(value) || 'Enter a valid email address',
};

export const usernameRules = {
  required: 'Username is required',
  minLength: { value: 3, message: 'Username must be at least 3 characters' },
  pattern: {
    value: /^[a-zA-Z0-9_.]+$/,
    message: 'Only letters, numbers, underscores and periods',
  },
};

// Matches backend's `password.length < 8` check exactly (authController.js)
export const passwordRules = {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
};

export const loginPasswordRules = {
  required: 'Password is required',
};

// ─────────────────────────────────────────────
// Password strength — client-side only, cosmetic (matches register_screen
// mock's strength bar). Backend only enforces the 8-char minimum; this is
// purely to guide the user toward a stronger password.
// ─────────────────────────────────────────────

const STRENGTH_LEVELS = [
  { label: 'Weak', color: 'error' },
  { label: 'Fair', color: 'warning' },
  { label: 'Good', color: 'info' },
  { label: 'Strong', color: 'success' },
];

export function calculatePasswordStrength(password = '') {
  if (!password) return { score: 0, ratio: 0, label: '', color: 'error' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(score, STRENGTH_LEVELS.length - 1);
  const level = STRENGTH_LEVELS[clamped];

  return {
    score: clamped,
    ratio: (clamped + 1) / STRENGTH_LEVELS.length,
    label: level.label,
    color: level.color,
  };
}
