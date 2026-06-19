"use client";

import useToast from "@/stores/toastStore";

export default function Toast() {
  const message = useToast((s) => s.message);
  const visible = useToast((s) => s.visible);

  return (
    <div className={`toast ${visible ? "is-visible" : ""}`} aria-live="polite">
      <span className="toast-inner">{message}</span>
    </div>
  );
}
