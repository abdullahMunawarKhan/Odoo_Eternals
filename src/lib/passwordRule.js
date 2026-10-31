// SPEC.md section 2: 9+ chars, at least one lowercase, one uppercase, one special character.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 9 characters and include an uppercase letter, a lowercase letter and a special character.'

export function validatePassword(pw) {
  const valid = typeof pw === 'string' && PASSWORD_REGEX.test(pw)
  return { valid, message: valid ? '' : PASSWORD_RULE_MESSAGE }
}
