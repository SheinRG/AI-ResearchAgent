"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Zustand store for research session state.
 * Persists recent searches to localStorage.
 */
const useResearchStore = create(
  persist(
    (set, get) => ({
      // Recent searches (persisted)
      recentSearches: [],

      // Quick notes (persisted) — jotted thoughts shown in the sidebar
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

      // Add a search to recent history
      addRecentSearch: (query) => {
        const { recentSearches } = get();
        // Remove duplicate if exists
        const filtered = recentSearches.filter(
          (s) => s.query.toLowerCase() !== query.toLowerCase()
        );
        // Add to front, limit to 10
        const updated = [
          { query, timestamp: Date.now() },
          ...filtered,
        ].slice(0, 10);
        set({ recentSearches: updated });
      },

      // Clear recent searches
      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },
    }),
    {
      name: "research-store",
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        notes: state.notes,
      }),
    }
  )
);

export default useResearchStore;
