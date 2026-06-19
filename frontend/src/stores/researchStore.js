"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Zustand store for research session state.
 *
 * Persisted (localStorage): recentSearches, notes.
 * Transient (in-memory only): sessionsNonce — incremented whenever a research
 * turn completes so AppLayout knows to re-fetch the sessions list from the DB.
 */
const useResearchStore = create(
  persist(
    (set, get) => ({
      // -----------------------------------------------------------------------
      // Persisted state
      // -----------------------------------------------------------------------

      /** Recent searches (local fallback; sidebar now prefers the DB list). */
      recentSearches: [],

      /** Quick notes — jotted thoughts shown in the sidebar. */
      notes: [],

      addNote: (text) => {
        const trimmed = (text || "").trim();
        if (!trimmed) return;
        const note = { id: `n${Date.now()}`, text: trimmed, timestamp: Date.now() };
        set({ notes: [note, ...get().notes] });
      },

      updateNote: (id, text) => {
        const trimmed = (text || "").trim();
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, text: trimmed, timestamp: Date.now() } : n
          ),
        });
      },

      deleteNote: (id) => {
        set({ notes: get().notes.filter((n) => n.id !== id) });
      },

      /** Add a search to local recent-history (deduped, max 10). */
      addRecentSearch: (query) => {
        const { recentSearches } = get();
        const filtered = recentSearches.filter(
          (s) => s.query.toLowerCase() !== query.toLowerCase()
        );
        const updated = [
          { query, timestamp: Date.now() },
          ...filtered,
        ].slice(0, 10);
        set({ recentSearches: updated });
      },

      /** Wipe the local recent-search list. */
      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },

      // -----------------------------------------------------------------------
      // Transient state (NOT persisted — see partialize below)
      // -----------------------------------------------------------------------

      /**
       * Monotonically-incrementing counter.  AppLayout watches this value; when
       * it changes the sidebar re-fetches GET /api/sessions so a freshly-saved
       * thread appears without a full page reload.
       */
      sessionsNonce: 0,

      /** Call this after every completed research turn to refresh the sidebar. */
      bumpSessions: () => set({ sessionsNonce: get().sessionsNonce + 1 }),
    }),
    {
      name: "research-store",
      // sessionsNonce is intentionally excluded so it resets to 0 on every
      // page load and always triggers an initial fetch in AppLayout.
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        notes: state.notes,
      }),
    }
  )
);

export default useResearchStore;
