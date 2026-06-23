"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FileTextIcon, DownloadIcon, CloseIcon } from "@/components/Icons";

/**
 * Slide-in document viewer panel. Renders a PDF in an iframe (with native
 * browser controls) or falls back to the extracted plain text. Closes on
 * backdrop click or Escape key.
 *
 * Props:
 *   document – { name, text, file, mime, size } | null
 *   onClose  – () => void
 */
export default function DocumentViewer({ document, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);

  const isPdf =
    document &&
    ((document.mime || "").includes("pdf") ||
      /\.pdf$/i.test(document.name || ""));

  // Create / revoke an object URL for the raw File so the iframe can load it.
  useEffect(() => {
    if (!document?.file || !isPdf) return;
    const url = URL.createObjectURL(document.file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [document, isPdf]);

  // Close on Escape.
  useEffect(() => {
    if (!document) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [document, onClose]);

  if (!document) return null;

  // ---- Download handler ------------------------------------------------
  const handleDownload = () => {
    try {
      if (document.file) {
        // Use the already-created objectUrl for PDFs, or create a fresh one.
        const url = objectUrl || URL.createObjectURL(document.file);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.name;
        a.click();
        // If we created a fresh url (non-PDF), revoke after a tick.
        if (!objectUrl) setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (document.text) {
        const blob = new Blob([document.text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = `${document.name}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      /* ignore download errors */
    }
  };

  // ---- Size formatting -------------------------------------------------
  const sizeLabel =
    document.size > 0
      ? `${(document.size / 1024).toFixed(1)} KB`
      : null;

  // ---- Text paragraphs -------------------------------------------------
  const paragraphs = document.text
    ? document.text.split(/\n{2,}/).filter(Boolean)
    : [];

  return (
    <>
      {/* Backdrop — only visible (and interactive) on narrow screens via CSS */}
      <div className="doc-viewer-backdrop" onClick={onClose} />

      <motion.aside
        className="doc-viewer"
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="doc-viewer-header">
          <FileTextIcon width={16} height={16} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="doc-viewer-title" title={document.name}>
              {document.name}
            </div>
            {sizeLabel && (
              <div className="doc-viewer-meta">{sizeLabel}</div>
            )}
          </div>
          <div className="doc-viewer-actions">
            <a
              role="button"
              className="doc-viewer-btn"
              onClick={handleDownload}
              title="Download"
              aria-label="Download file"
              style={{ cursor: "pointer" }}
            >
              <DownloadIcon width={15} height={15} />
            </a>
            <button
              type="button"
              className="doc-viewer-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close viewer"
            >
              <CloseIcon width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="doc-viewer-body">
          {isPdf && objectUrl ? (
            <iframe
              className="doc-viewer-frame"
              src={objectUrl}
              title={document.name}
            />
          ) : paragraphs.length > 0 ? (
            <article className="doc-viewer-text">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </article>
          ) : (
            <article className="doc-viewer-text">
              <p style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                No preview available for this file.
              </p>
            </article>
          )}
        </div>
      </motion.aside>
    </>
  );
}
