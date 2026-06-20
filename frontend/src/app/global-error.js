"use client";

// Root error boundary — catches errors in the root layout/template that the
// segment-level error.js cannot. It must render its own <html>/<body>. We
// report the error to Sentry (a no-op when Sentry isn't initialized).
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "1rem",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#666", maxWidth: "32rem", margin: 0 }}>
          A critical error interrupted the app. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            padding: "8px 18px",
            border: "none",
            borderRadius: "9px",
            background: "#111",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
