// firebaseErrorMap — maps Firebase auth error codes to user-friendly copy
// + signup field validation helper

const ERROR_MAP: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

/**
 * Convert a Firebase auth error into a friendly message.
 */
export function friendlyAuthError(err: any): string {
    const code: string | undefined = err?.code;
    if (code && ERROR_MAP[code]) {
        return ERROR_MAP[code];
    }
    // Fallback to the raw message if available
    return err?.message ?? 'Something went wrong. Please try again.';
}

/**
 * Validate signup fields and return the first error found, or null if valid.
 */
const ALLOWED_DOMAINS = ['student.ubc.ca', 'ubc.ca'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupFields(
    email: string,
    password: string,
    confirm: string,
): string | null {
    if (!email.trim()) {
        return 'Email is required.';
    }
    if (!EMAIL_RE.test(email.trim())) {
        return 'Please enter a valid email address.';
    }
    const domain = email.trim().split('@')[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.some((d) => domain === d)) {
        return 'Please use a @student.ubc.ca or @ubc.ca email.';
    }
    if (!password) {
        return 'Password is required.';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters.';
    }
    if (password !== confirm) {
        return 'Passwords do not match.';
    }
    return null;
}

/**
 * Validate login fields and return the first error found, or null if valid.
 */
export function validateLoginFields(email: string, password: string): string | null {
    if (!email.trim()) {
        return 'Email is required.';
    }
    if (!EMAIL_RE.test(email.trim())) {
        return 'Please enter a valid email address.';
    }
    if (!password) {
        return 'Password is required.';
    }
    return null;
}
