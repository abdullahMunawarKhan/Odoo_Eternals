/**
 * Password validation meeting requirement:
 * "Password must be longer than 8 characters and contain uppercase, lowercase and special characters."
 */
export function validatePassword(password = '') {
  const rules = {
    minLength: password.length > 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    specialChar: /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\`~;']/.test(password),
  };

  const errors = [];
  if (!rules.minLength) {
    errors.push('Must be longer than 8 characters (at least 9 characters)');
  }
  if (!rules.uppercase) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  }
  if (!rules.lowercase) {
    errors.push('Must contain at least one lowercase letter (a-z)');
  }
  if (!rules.specialChar) {
    errors.push('Must contain at least one special character (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    rules,
  };
}

/**
 * Basic email format validator
 */
export function validateEmail(email = '') {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
