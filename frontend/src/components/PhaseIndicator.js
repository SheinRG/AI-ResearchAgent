"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  SearchIcon,
  GlobeIcon,
  BookIcon,
  PenIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/Icons";

const PHASE_CONFIG = {
  planning: { Icon: SearchIcon, label: "Planning" },
  searching: { Icon: GlobeIcon, label: "Searching" },
  reading: { Icon: BookIcon, label: "Reading" },
  writing: { Icon: PenIcon, label: "Writing" },
  reflecting: { Icon: SparklesIcon, label: "Reflecting" },
  done: { Icon: CheckCircleIcon, label: "Done" },
};

export default function PhaseIndicator({ phase, message }) {
  if (!phase) return null;

  const config = PHASE_CONFIG[phase] || { Icon: ClockIcon, label: phase };
  const isDone = phase === "done";
  const { Icon } = config;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        className={`phase-indicator ${isDone ? "phase-done" : ""}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <motion.span
          className="phase-icon"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <Icon width={18} height={18} />
        </motion.span>
        <span className="phase-text">{message || config.label}</span>
        <span className="phase-label">{config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
