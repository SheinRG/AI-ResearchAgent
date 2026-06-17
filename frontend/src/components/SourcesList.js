"use client";

import { motion } from "motion/react";
import { safeUrl } from "@/lib/safeUrl";

/**
 * Full, readable list of sources for the Sources tab — one row per source with
 * its citation index, favicon, domain, title, and snippet (when available).
 * Index i maps to the [i+1] citation marker in the answer.
 */
export default function SourcesList({ sources = [] }) {
  if (!sources || sources.length === 0) {
    return <div className="tab-empty">No sources found</div>;
  }

  return (
    <div className="sources-list">
      {sources.map((source, index) => (
        <motion.a
          key={source.url || index}
          href={safeUrl(source.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="source-row"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
        >
          <span className="source-row-index">{index + 1}</span>
          <div className="source-row-body">
            <div className="source-row-meta">
              <img
                src={
                  source.favicon ||
                  `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`
                }
                alt=""
                className="source-favicon"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <span className="source-domain">{source.domain}</span>
            </div>
            <div className="source-row-title">{source.title}</div>
            {source.snippet && (
              <div className="source-row-snippet">{source.snippet}</div>
            )}
          </div>
        </motion.a>
      ))}
    </div>
  );
}
