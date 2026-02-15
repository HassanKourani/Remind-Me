export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

// Reminder validations

export function validateReminderTitle(title: string): string | null {
  if (!title.trim()) return 'Title is required';
  if (title.trim().length > 200) return 'Title must be under 200 characters';
  return null;
}

export function validateDateTime(dateTime: Date): string | null {
  if (dateTime <= new Date()) return 'Date and time must be in the future';
  return null;
}

export function validateLocation(
  lat: number | null,
  lng: number | null,
): string | null {
  if (lat == null || lng == null) return 'Please select a location';
  return null;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}
