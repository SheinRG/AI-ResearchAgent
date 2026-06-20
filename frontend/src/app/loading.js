// Shown during route segment loading (Suspense fallback) so navigation never
// flashes a blank screen. Self-contained spinner using the app's accent color.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        aria-label="Loading"
        role="status"
        style={{
          width: "28px",
          height: "28px",
          border: "3px solid var(--border-subtle)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "routeSpin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes routeSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
