"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/Icons";

/**
 * Compact light/dark switch. Uses `resolvedTheme` so it does the right thing
 * even when the active appearance is "system". Set `showLabel` for the labeled
 * pill (login screen); otherwise it renders icon-only.
 */
export default function ThemeToggle({ showLabel = false }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="theme-toggle" style={{ minWidth: 40, minHeight: 40 }} />;
  }

  const isDark = resolvedTheme === "dark";
  const nextLabel = isDark ? "Light mode" : "Dark mode";

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={nextLabel}
    >
      {isDark ? <SunIcon width={15} height={15} /> : <MoonIcon width={15} height={15} />}
      {showLabel && <span className="theme-toggle-label">{nextLabel}</span>}
    </button>
  );
}
