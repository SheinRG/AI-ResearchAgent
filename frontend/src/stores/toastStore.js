"use client";

import { create } from "zustand";

/**
 * Tiny global toast: any component calls `useToast.getState().show("…")` (or the
 * `useToast` hook) and the single <Toast /> mounted in the layout renders it.
 * Auto-dismisses; a monotonically increasing id retriggers the enter animation
 * even when the same message fires twice in a row.
 */
const useToast = create((set, get) => ({
  message: "",
  id: 0,
  visible: false,
  _timer: null,

  show: (message) => {
    const prev = get()._timer;
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => set({ visible: false }), 1900);
    set((s) => ({ message, id: s.id + 1, visible: true, _timer: timer }));
  },
}));

export default useToast;
