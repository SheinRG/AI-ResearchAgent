"use client";

import { useState } from "react";
import { motion } from "motion/react";
import SourcesList from "@/components/SourcesList";
import ImageGrid from "@/components/ImageGrid";

/**
 * Answer / Sources / Images tabs for a single research turn. Text-only tabs
 * with a sliding underline (motion layoutId), matching the goon.ai design.
 * The Answer panel is passed in as `children`; Sources and Images render from
 * the arrays here. The Images tab is hidden entirely when there are no images.
 */
export default function ResearchTabs({ sources = [], images = [], children }) {
  const [active, setActive] = useState("answer");
  const hasImages = (images || []).length > 0;

  // If images vanish (e.g. a re-run with none) while the Images tab is open,
  // fall back to Answer so we never show an orphaned empty panel.
  const current = active === "images" && !hasImages ? "answer" : active;

  const tabs = [
    { id: "answer", label: "Answer" },
    { id: "sources", label: "Sources", count: sources.length },
    ...(hasImages ? [{ id: "images", label: "Images" }] : []),
  ];

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
