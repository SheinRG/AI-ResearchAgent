"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { safeUrl } from "@/lib/safeUrl";

/**
 * Responsive grid of image thumbnails for the Images tab. Each tile links to
 * its originating page in a new tab. Defensive about the contract: shows
 * `thumbnail || url`, opens `source || url`, restricts both to http(s) URLs,
 * lazy-loads, and drops any tile whose image fails to load so the grid never
 * shows broken thumbnails.
 */
export default function ImageGrid({ images = [] }) {
  // Track failed images by their src URL (not array index) so a re-run with a
  // different image set can never hide the wrong tiles.
  const [broken, setBroken] = useState(() => new Set());

  const tiles = (images || [])
    .map((img) => ({
      src: safeUrl(img?.thumbnail) || safeUrl(img?.url),
      href: safeUrl(img?.source) || safeUrl(img?.url),
      title: img?.title || "",
      domain: img?.domain || "",
    }))
    .filter((t) => t.src && !broken.has(t.src));

  if (tiles.length === 0) {
    return <div className="tab-empty">No images found</div>;
  }

  return (
    <div className="image-grid">
      {tiles.map((tile, index) => (
        <motion.a
          key={tile.src}
          href={tile.href}
          target="_blank"
          rel="noopener noreferrer"
          className="image-tile"
          title={tile.title || tile.domain || ""}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
        >
          <img
            src={tile.src}
            alt={tile.title}
            loading="lazy"
            className="image-tile-img"
            onError={() =>
              setBroken((prev) => {
                const next = new Set(prev);
                next.add(tile.src);
                return next;
              })
            }
          />
          {(tile.title || tile.domain) && (
            <span className="image-tile-caption">
              {tile.title || tile.domain}
            </span>
          )}
        </motion.a>
      ))}
    </div>
  );
}
