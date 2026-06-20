// Rendered for unmatched routes (404) instead of a blank page.
export default function NotFound() {
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
      <div
        style={{
          fontSize: "3rem",
          fontWeight: 700,
          color: "var(--accent)",
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: "1.4rem", color: "var(--text-primary)", margin: 0 }}>
        Page not found
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: "32rem", margin: 0 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <a
        className="btn-accent"
        href="/"
        style={{ textDecoration: "none", marginTop: "0.5rem" }}
      >
        Back to home
      </a>
    </div>
  );
}
