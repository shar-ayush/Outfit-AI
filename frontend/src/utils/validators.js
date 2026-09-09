const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value).trim());
}

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

export const passwordRules = {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
};

export const loginPasswordRules = {
  required: 'Password is required',
};

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
