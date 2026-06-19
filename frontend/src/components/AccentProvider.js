"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Manages the selectable accent colour (blue / terracotta / green), persisted
 * to localStorage and reflected as a `data-accent` attribute on <html> so the
 * CSS token blocks in globals.css can swap the accent palette. Blue is the
 * default and is represented by the absence of the attribute.
 */

const ACCENTS = ["blue", "terracotta", "green"];
const STORAGE_KEY = "goon_accent";

const AccentContext = createContext({
  accent: "blue",
  setAccent: () => {},
  accents: ACCENTS,
});

export function AccentProvider({ children }) {
  const [accent, setAccentState] = useState("blue");

  // Resolve the saved accent after mount to avoid a hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ACCENTS.includes(saved)) setAccentState(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (accent === "blue") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
  }, [accent]);

  const setAccent = (next) => {
    if (!ACCENTS.includes(next)) return;
    setAccentState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  };

  return (
    <AccentContext.Provider value={{ accent, setAccent, accents: ACCENTS }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  return useContext(AccentContext);
}
