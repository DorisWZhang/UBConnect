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
