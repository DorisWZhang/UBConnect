// Lightweight telemetry — console by default, Sentry when DSN provided.

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let Sentry: any = null;

// Lazy-init Sentry only when a DSN is configured
async function getSentry() {
    if (Sentry !== null) return Sentry;
    if (!SENTRY_DSN) {
        Sentry = false; // mark as "don't retry"
        return false;
    }
    try {
        const mod = await import('@sentry/react-native');
        mod.init({ dsn: SENTRY_DSN });
        Sentry = mod;
        return Sentry;
    } catch {
        console.warn('[telemetry] @sentry/react-native not installed — telemetry is console-only');
        Sentry = false;
        return false;
    }
}

/**
 * Capture an exception. Always logs to console; forwards to Sentry when available.
 */
export async function captureException(
    error: unknown,
    context?: Record<string, any>,
): Promise<void> {
    console.error('[UBConnect Error]', error, context ?? '');
    const s = await getSentry();
    if (s) {
        s.captureException(error, { extra: context });
    }
}

/**
 * Log a named event with optional properties.
 */
export async function logEvent(
    name: string,
    props?: Record<string, any>,
): Promise<void> {
    if (__DEV__) {
        console.log(`[UBConnect Event] ${name}`, props ?? '');
    }
    const s = await getSentry();
    if (s) {
        s.addBreadcrumb({ category: 'app', message: name, data: props });
    }
}

// ---------------------------------------------------------------------------
// Firestore-specific helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Firebase/Firestore error and return a structured code string.
 * Useful for detecting 'permission-denied' and 'unauthenticated'.
 */
export function parseFirebaseErrorCode(error: unknown): string {
    if (error && typeof error === 'object') {
        const e = error as any;
        // Firebase JS SDK errors have a `code` property like 'permission-denied'
        if (typeof e.code === 'string') return e.code;
        // Some Firebase errors wrap the code in message
        if (typeof e.message === 'string') {
            if (e.message.includes('permission-denied')) return 'permission-denied';
            if (e.message.includes('unauthenticated')) return 'unauthenticated';
            if (e.message.includes('not-found')) return 'not-found';
        }
    }
    return 'unknown';
}

/**
 * Log a Firestore error with screen/operation context and detect permission errors.
 */
export async function logFirestoreError(
    error: unknown,
    context: { screen: string; operation: string; uid?: string; verified?: boolean },
): Promise<void> {
    const code = parseFirebaseErrorCode(error);
    await logEvent('firestore_error', { ...context, code });
    await captureException(error, { ...context, firestoreErrorCode: code });
}

/**
 * Check if a Firebase error is a permission-denied error.
 */
export function isPermissionDenied(error: unknown): boolean {
    const code = parseFirebaseErrorCode(error);
    return code === 'permission-denied' || code === 'unauthenticated';
}
