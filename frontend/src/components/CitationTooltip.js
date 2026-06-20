"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

const GAP = 9; // gap between the badge and the tooltip

export default function CitationTooltip({ source, anchorRect }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  // Measure the rendered tooltip and place it relative to the badge.
  // Rendered through a portal with fixed positioning, so the table's
  // `overflow-x: auto` (or any scroll container) can't clip it.
  useLayoutEffect(() => {
    if (!ref.current || !anchorRect) return;
    const tip = ref.current.getBoundingClientRect();
    const margin = 8;

    let left = anchorRect.left + anchorRect.width / 2 - tip.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tip.width - margin));

    // Prefer above the badge; flip below when there isn't room.
    const placeBelow = anchorRect.top - tip.height - GAP < margin;
    const top = placeBelow
      ? anchorRect.bottom + GAP
      : anchorRect.top - GAP - tip.height;

    setPos({ left, top });
  }, [anchorRect]);

  if (!source || !anchorRect || typeof document === "undefined") return null;

  return createPortal(
    <motion.span
      ref={ref}
      className="citation-tooltip"
      initial={{ opacity: 0 }}
      animate={{ opacity: pos ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed",
        // Render off-screen until measured so there's no flash at (0,0).
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        bottom: "auto",
        right: "auto",
        margin: 0,
        transform: "none",
        display: "block",
        textAlign: "left",
        visibility: pos ? "visible" : "hidden",
      }}
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
    </motion.span>,
    document.body
  );
}
