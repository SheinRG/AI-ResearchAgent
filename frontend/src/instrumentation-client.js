// Client-side Sentry init. Runs after the document loads and before React
// hydration (a native Next.js instrumentation hook). Gated on the public DSN:
// when NEXT_PUBLIC_SENTRY_DSN is unset, init never runs and this is a no-op,
// so behavior is unchanged until a DSN is configured.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
    // Errors only by default; raise these to sample performance/replay later.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Lets Sentry tie client-side navigations to traces. Safe no-op when Sentry
// is not initialized.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
