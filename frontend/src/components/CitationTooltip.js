"use client";

import { motion } from "motion/react";

export default function CitationTooltip({ source }) {
  if (!source) return null;

  return (
    <motion.span
      className="citation-tooltip"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      style={{ display: "block", textAlign: "left" }}
    >
      <span className="citation-tooltip-header" style={{ display: "flex" }}>
        <img
          src={source.favicon || `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
          alt=""
          className="citation-tooltip-favicon"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <span className="citation-tooltip-domain">{source.domain}</span>
      </span>
      <span className="citation-tooltip-title" style={{ display: "block" }}>{source.title}</span>
      {source.snippet && (
        <span className="citation-tooltip-snippet" style={{ display: "block" }}>{source.snippet}</span>
      )}
    </motion.span>
  );
}
