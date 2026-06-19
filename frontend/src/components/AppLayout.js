"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useAccent } from "@/components/AccentProvider";
import useResearchStore from "@/stores/researchStore";
import useToast from "@/stores/toastStore";

import {
  LogoMark,
  PlusIcon,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  PanelLeftIcon,
  NoteIcon,
  FileTextIcon,
  ClockIcon,
  ChevronRightIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  SwatchIcon,
  CheckIcon,
} from "@/components/Icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatAgo(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const ACCENT_LABELS = { blue: "Blue", terracotta: "Terracotta", green: "Green" };

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, token, logout } = useAuth();
  const { notes, addNote, updateNote, deleteNote, sessionsNonce } =
    useResearchStore();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const showToast = useToast((s) => s.show);

  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  // DB-backed session history for the sidebar.
  const [dbSessions, setDbSessions] = useState([]);

  // Note modal: { id } where id=null means a new note.
  const [noteModal, setNoteModal] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    setMounted(true);
    setIsCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
  }, []);

  /**
   * Fetch the thread list from GET /api/sessions whenever:
   *   - the user logs in (token changes)
   *   - a research turn finishes (sessionsNonce bumps)
   *   - the user navigates back to "/" (pathname changes to "/")
   *
   * Failures are silently swallowed so the sidebar degrades gracefully.
   */
  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbSessions(Array.isArray(data) ? data : []);
    } catch {
      // Network error — keep the last-known list visible.
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, sessionsNonce, pathname]);

  const toggleCollapse = () =>
    setIsCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });

  const isLoginPage = pathname === "/login";
  const showSidebar = isAuthenticated && !isLoginPage;

  const handleNewThread = () => {
    router.push("/");
    setIsMobileOpen(false);
  };

  /** Navigate to a stored session thread (loads stored results, no re-run). */
  const openSession = (sessionId) => {
    router.push(`/research?session=${encodeURIComponent(sessionId)}`);
    setIsMobileOpen(false);
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setAppearanceOpen(false);
  };

  // --- Notes ---
  const openNewNote = () => {
    setNoteModal({ id: null });
    setNoteDraft("");
    setProfileOpen(false);
  };
  const openExistingNote = (note) => {
    setNoteModal({ id: note.id });
    setNoteDraft(note.text);
  };
  const saveNote = () => {
    const text = noteDraft.trim();
    if (!text) {
      setNoteModal(null);
      return;
    }
    if (noteModal?.id) updateNote(noteModal.id, text);
    else addNote(text);
    setNoteModal(null);
    showToast("Note saved");
  };
  const removeNote = () => {
    if (noteModal?.id) deleteNote(noteModal.id);
    setNoteModal(null);
    showToast("Note deleted");
  };

  // --- Appearance ---
  const appearanceLabel = !mounted
    ? ""
    : theme === "system"
    ? `System (${resolvedTheme === "dark" ? "Dark" : "Light"})`
    : theme === "dark"
    ? "Dark"
    : "Light";

  const AppearanceModeIcon =
    theme === "system" ? MonitorIcon : resolvedTheme === "dark" ? MoonIcon : SunIcon;

  if (!showSidebar) {
    return <div className="app-main-wrapper">{children}</div>;
  }

  const userInitial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className={`layout-container ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Desktop reopen button — shown only when collapsed */}
      {isCollapsed && (
        <button
          className="sidebar-reopen-btn"
          onClick={toggleCollapse}
          aria-label="Open goon.ai"
          title="Open goon.ai"
        >
          <LogoMark size={26} />
        </button>
      )}

      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="navbar-brand">
          <LogoMark size={22} />
          <span className="brand-text">
            goon<span className="wordmark-accent">.ai</span>
          </span>
        </Link>
      </header>

      {/* Sidebar */}
      <div className={`sidebar-shell ${isMobileOpen ? "mobile-open" : ""}`}>
        <aside className="sidebar-container">
          <div className="sidebar-brand">
            <Link href="/" className="navbar-brand">
              <LogoMark size={22} />
              <span className="brand-text">
                goon<span className="wordmark-accent">.ai</span>
              </span>
            </Link>
            <button
              className="sidebar-icon-btn"
              onClick={toggleCollapse}
              title="Collapse"
              aria-label="Collapse sidebar"
            >
              <PanelLeftIcon width={17} height={17} />
            </button>
            <button
              className="mobile-close-btn"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>

          <button className="sidebar-new-btn" onClick={handleNewThread}>
            <PlusIcon width={16} height={16} />
            New thread
          </button>

          <button className="sidebar-ghost-btn" onClick={openNewNote}>
            <NoteIcon width={15} height={15} />
            Add note
          </button>

          <div className="sidebar-nav">
            {notes.length > 0 && (
              <>
                <div className="sidebar-section-label">
                  <FileTextIcon width={12} height={12} />
                  Notes
                </div>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    className="sidebar-list-item"
                    onClick={() => openExistingNote(note)}
                  >
                    <span className="sidebar-list-title">
                      {note.text.split("\n")[0].slice(0, 42) || "Untitled note"}
                    </span>
                    <span className="sidebar-list-time">{formatAgo(note.timestamp)}</span>
                  </button>
                ))}
                <div className="sidebar-section-divider" />
              </>
            )}

            <div className="sidebar-section-label">
              <ClockIcon width={12} height={12} />
              History
            </div>
            {dbSessions.length === 0 ? (
              <div className="sidebar-empty">
                No history yet. Ask something to get started.
              </div>
            ) : (
              dbSessions.map((session) => (
                <button
                  key={session.id}
                  className="sidebar-list-item"
                  onClick={() => openSession(session.id)}
                >
                  <span className="sidebar-list-title">{session.title || session.query}</span>
                  <span className="sidebar-list-time">
                    {/* updated_at is an ISO string; convert to ms for formatAgo */}
                    {session.updated_at
                      ? formatAgo(new Date(session.updated_at).getTime())
                      : formatAgo(new Date(session.created_at).getTime())}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Profile footer */}
          <div className="sidebar-footer">
            <button
              className="profile-trigger"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="user-avatar">{userInitial}</span>
              <span className="user-info">
                <span className="user-name">{user?.name || "Researcher"}</span>
                <span className="user-email">{user?.email}</span>
              </span>
              <ChevronRightIcon
                width={15}
                height={15}
                style={{ transform: "rotate(-90deg)", color: "var(--text-tertiary)" }}
              />
            </button>

            {profileOpen && (
              <>
                <div className="menu-backdrop" onClick={closeProfile} />
                <div className="popup-menu profile-menu">
                  <div className="profile-menu-head">
                    <span className="user-avatar">{userInitial}</span>
                    <span className="user-info">
                      <span className="user-name">{user?.name || "Researcher"}</span>
                      <span className="user-email">{user?.email}</span>
                    </span>
                  </div>
                  <div className="menu-divider" />

                  <button
                    className="menu-item"
                    onClick={() => setAppearanceOpen((v) => !v)}
                  >
                    <AppearanceModeIcon width={16} height={16} />
                    <span className="menu-item-grow">
                      Appearance
                      <span className="menu-item-sub">{appearanceLabel}</span>
                    </span>
                    <ChevronRightIcon
                      width={14}
                      height={14}
                      className="menu-item-chevron"
                      style={{
                        transform: appearanceOpen ? "rotate(90deg)" : "none",
                      }}
                    />
                  </button>

                  {appearanceOpen && (
                    <>
                      {[
                        { id: "light", label: "Light", Icon: SunIcon },
                        { id: "dark", label: "Dark", Icon: MoonIcon },
                        { id: "system", label: "System", Icon: MonitorIcon },
                      ].map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          className="menu-item"
                          style={{ paddingLeft: 18 }}
                          onClick={() => setTheme(id)}
                        >
                          <Icon width={15} height={15} />
                          <span className="menu-item-grow">{label}</span>
                          {theme === id && (
                            <CheckIcon
                              width={15}
                              height={15}
                              className="menu-item-check"
                            />
                          )}
                        </button>
                      ))}

                      <div className="accent-row" style={{ paddingLeft: 18 }}>
                        <SwatchIcon
                          width={15}
                          height={15}
                          style={{ color: "var(--text-secondary)", marginRight: 4 }}
                        />
                        {["blue", "terracotta", "green"].map((a) => (
                          <button
                            key={a}
                            className={`accent-swatch accent-${a} ${
                              accent === a ? "is-active" : ""
                            }`}
                            onClick={() => setAccent(a)}
                            title={ACCENT_LABELS[a]}
                            aria-label={`${ACCENT_LABELS[a]} accent`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    className="menu-item"
                    onClick={() => {
                      closeProfile();
                      showToast("Language: coming soon");
                    }}
                  >
                    <LanguageIcon width={16} height={16} />
                    <span className="menu-item-grow">Language</span>
                    <span className="menu-item-value">Default</span>
                  </button>

                  <div className="menu-divider" />
                  <button
                    className="menu-item"
                    onClick={() => {
                      closeProfile();
                      logout();
                    }}
                  >
                    <LogoutIcon width={16} height={16} />
                    <span className="menu-item-grow">Sign out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="layout-content-viewport">{children}</main>

      {/* Note modal */}
      {noteModal && (
        <div className="modal-backdrop" onClick={() => setNoteModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">
                {noteModal.id ? "Edit note" : "New note"}
              </span>
              <button
                className="msg-action-btn"
                onClick={() => setNoteModal(null)}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>
            <textarea
              className="modal-textarea"
              rows={6}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Jot down a thought, a finding, a to-do…"
              autoFocus
            />
            <div className="modal-foot">
              {noteModal.id && (
                <button className="btn-danger-text" onClick={removeNote}>
                  Delete
                </button>
              )}
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setNoteModal(null)}>
                  Cancel
                </button>
                <button className="btn-accent" onClick={saveNote}>
                  Save note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
