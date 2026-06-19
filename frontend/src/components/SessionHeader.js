"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useToast from "@/stores/toastStore";
import {
  MoreIcon,
  ShareIcon,
  DownloadIcon,
  PenIcon,
  FileTextIcon,
  BookIcon,
  TrashIcon,
} from "@/components/Icons";
import {
  exportMarkdown,
  exportPdf,
  exportDocx,
} from "@/lib/exportSession";

/**
 * Sticky thread header: editorial session title with a rename affordance, a
 * "more" menu (rename / export / delete), and Share + Download actions.
 * The Download button and "Export as PDF" both produce a real PDF file;
 * "Export as Markdown" produces a .md file; "Export as DOCX" a .docx file.
 * Share copies the current URL to the clipboard.
 *
 * @param {object}   props
 * @param {string}   props.title       Session title shown in the header.
 * @param {Function} [props.onRename]  Called with the new title string on rename.
 * @param {string}   [props.createdBy] Attribution label (defaults to "Researcher (You)").
 * @param {Array}    [props.turns]     Full conversation turns array for export.
 */
export default function SessionHeader({
  title,
  onRename,
  createdBy = "Researcher (You)",
  turns = [],
}) {
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");

  const lastUpdated = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const beginRename = () => {
    setDraft(title || "");
    setRenaming(true);
    setMenuOpen(false);
  };

  const commitRename = () => {
    setRenaming(false);
    const next = draft.trim();
    if (next && next !== title) onRename?.(next);
  };

  const share = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
    showToast("Share link copied");
  };

  /** Build the session object passed to every export function. */
  const buildSession = () => ({
    title: title || "Session",
    createdBy,
    turns,
  });

  /**
   * Guard-wrapped export runner. Shows an "Exporting…" toast, calls the
   * export function, then shows a success or error toast.
   *
   * @param {string}   label   Human label used in toasts (e.g. "PDF").
   * @param {Function} fn      Async export function (exportPdf etc.)
   */
  const runExport = async (label, fn) => {
    setMenuOpen(false);

    if (!turns || turns.length === 0) {
      showToast("Nothing to export yet");
      return;
    }

    showToast(`Exporting as ${label}…`);
    try {
      await fn(buildSession());
      showToast(`${label} downloaded`);
    } catch (err) {
      console.error(`[exportSession] ${label} export failed`, err);
      showToast(`Export failed — please try again`);
    }
  };

  return (
    <div className="session-header">
      {renaming ? (
        <input
          className="session-rename-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            }
            if (e.key === "Escape") setRenaming(false);
          }}
        />
      ) : (
        <div className="session-title">{title || "Untitled session"}</div>
      )}

      <div className="session-actions">
        <button
          className="session-icon-btn"
          onClick={() => setMenuOpen((v) => !v)}
          title="More"
          aria-label="More options"
        >
          <MoreIcon width={17} height={17} />
        </button>

        <button className="session-btn" onClick={share}>
          <ShareIcon width={14} height={14} />
          <span>Share</span>
        </button>

        <button
          className="session-btn session-btn-primary"
          onClick={() => runExport("PDF", exportPdf)}
        >
          <DownloadIcon width={14} height={14} />
          <span>Download</span>
        </button>

        {menuOpen && (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="popup-menu session-menu">
              <div className="menu-meta">
                <div className="menu-meta-title">{title || "Untitled session"}</div>
                <div className="menu-meta-row">
                  <span>Created by</span>
                  <span>{createdBy}</span>
                </div>
                <div className="menu-meta-row">
                  <span>Last updated</span>
                  <span>{lastUpdated}</span>
                </div>
              </div>
              <div className="menu-divider" />
              <button className="menu-item" onClick={beginRename}>
                <PenIcon width={16} height={16} />
                <span className="menu-item-grow">Rename session</span>
              </button>
              <div className="menu-divider" />
              <button
                className="menu-item"
                onClick={() => runExport("PDF", exportPdf)}
              >
                <FileTextIcon width={16} height={16} />
                <span className="menu-item-grow">Export as PDF</span>
              </button>
              <button
                className="menu-item"
                onClick={() => runExport("Markdown", exportMarkdown)}
              >
                <BookIcon width={16} height={16} />
                <span className="menu-item-grow">Export as Markdown</span>
              </button>
              <button
                className="menu-item"
                onClick={() => runExport("DOCX", exportDocx)}
              >
                <FileTextIcon width={16} height={16} />
                <span className="menu-item-grow">Export as DOCX</span>
              </button>
              <div className="menu-divider" />
              <button
                className="menu-item menu-item-danger"
                onClick={() => {
                  setMenuOpen(false);
                  showToast("Session deleted");
                  router.push("/");
                }}
              >
                <TrashIcon width={16} height={16} />
                <span className="menu-item-grow">Delete</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
