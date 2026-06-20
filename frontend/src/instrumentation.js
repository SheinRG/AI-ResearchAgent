// Server/edge Sentry init via Next.js's native instrumentation hook. `register`
// runs once per server instance; `onRequestError` forwards server-side errors
// (Server Components, Route Handlers, Server Actions) to Sentry. Both are gated
// on NEXT_PUBLIC_SENTRY_DSN, so they are no-ops until a DSN is set.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
      tracesSampleRate: 0,
    });
  }
}

// No-op when Sentry is not initialized.
export const onRequestError = Sentry.captureRequestError;
