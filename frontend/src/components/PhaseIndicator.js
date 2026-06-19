"use client";

import { motion, AnimatePresence } from "motion/react";

const PHASE_LABELS = {
  planning: ["Planning", "Breaking the question into parts"],
  searching: ["Searching", "Querying the web for sources"],
  reading: ["Reading", "Ranking the most relevant sources"],
  writing: ["Writing", "Synthesizing a cited answer"],
  reflecting: ["Reflecting", "Checking the answer holds up"],
  done: ["Done", ""],
};

export default function PhaseIndicator({ phase, message }) {
  if (!phase) return null;

  const [label, fallbackMsg] = PHASE_LABELS[phase] || [phase, ""];

  return (
    <div className="phase-indicator">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className="phase-head"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <span className="phase-dot" />
          <span className="phase-label">{label}</span>
          <span className="phase-text">{message || fallbackMsg}</span>
        </motion.div>
      </AnimatePresence>
      <div className="phase-track" />
    </div>
  );
}
