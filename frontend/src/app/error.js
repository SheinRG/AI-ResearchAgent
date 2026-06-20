"use client";

// Route-level error boundary. Next.js renders this when a Server/Client
// Component in this segment throws — instead of a blank screen or the raw
// dev overlay. `reset()` re-attempts rendering the segment.
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Surface the error for debugging / future error-tracking (e.g. Sentry).
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "2.5rem" }}>⚠️</div>
      <h1 style={{ fontSize: "1.4rem", color: "var(--text-primary)", margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: "32rem", margin: 0 }}>
        An unexpected error interrupted this page. You can try again — if it keeps
        happening, the issue is on our side.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button className="btn-accent" onClick={() => reset()}>
          Try again
        </button>
        <a className="btn-ghost" href="/" style={{ textDecoration: "none" }}>
          Go home
        </a>
      </div>
    </div>
  );
}
