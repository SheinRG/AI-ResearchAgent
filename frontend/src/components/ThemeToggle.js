"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SunIcon, MoonIcon } from "@/components/Icons";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="theme-toggle" />;
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      id="theme-toggle-button"
    >
      <motion.span
        key={theme}
        style={{ display: "flex" }}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
      >
        {isDark ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
      </motion.span>
    </motion.button>
  );
}
