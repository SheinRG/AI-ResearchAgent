"use client";

import { useState } from "react";
import { motion } from "motion/react";
import SourcesList from "@/components/SourcesList";
import ImageGrid from "@/components/ImageGrid";

/**
 * Answer / Sources / Images tabs for a single research turn. Text-only tabs
 * with a sliding underline (motion layoutId), matching the goon.ai design.
 * The Answer panel is passed in as `children`; Sources and Images render from
 * the arrays here. The Sources and Images tabs are each hidden when empty, and
 * the whole tab bar is hidden for a plain reply (e.g. a chat answer) so it reads
 * like a normal message instead of a research result.
 */
export default function ResearchTabs({ sources = [], images = [], children }) {
  const [active, setActive] = useState("answer");
  const hasImages = (images || []).length > 0;
  const hasSources = (sources || []).length > 0;

  // If sources/images vanish (e.g. a chat reply, or a re-run with none) while
  // that tab is open, fall back to Answer so we never show an empty panel.
  let current = active;
  if (current === "images" && !hasImages) current = "answer";
  if (current === "sources" && !hasSources) current = "answer";

  const tabs = [
    { id: "answer", label: "Answer" },
    ...(hasSources ? [{ id: "sources", label: "Sources", count: sources.length }] : []),
    ...(hasImages ? [{ id: "images", label: "Images" }] : []),
  ];

  // Plain reply with nothing to tab between — render just the answer, no tab bar.
  if (tabs.length === 1) {
    return (
      <div className="research-tabs">
        <div className="tab-panel" role="tabpanel">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="research-tabs">
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={current === tab.id}
            className={`tab-btn ${current === tab.id ? "tab-btn-active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span className="tab-count">{tab.count}</span>
            )}
            {current === tab.id && (
              <motion.span
                className="tab-underline"
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {current === "answer" && children}
        {current === "sources" && <SourcesList sources={sources} />}
        {current === "images" && <ImageGrid images={images} />}
      </div>
    </div>
  );
}
