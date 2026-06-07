"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import useResearchStore from "@/stores/researchStore";
import ThemeToggle from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { recentSearches, clearRecentSearches } = useResearchStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Don't render sidebar on login page or if not authenticated
  const isLoginPage = pathname === "/login";
  const showSidebar = isAuthenticated && !isLoginPage;

  const handleNewResearch = () => {
    router.push("/");
    setIsMobileOpen(false);
  };

  const handleHistoryClick = (query) => {
    const encoded = encodeURIComponent(query);
    router.push(`/research?q=${encoded}`);
    setIsMobileOpen(false);
  };

  const formatHistoryTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (!showSidebar) {
    return <div className="app-main-wrapper">{children}</div>;
  }

  return (
    <div className="layout-container">
      {/* Mobile Header Toggle */}
      <header className="mobile-header">
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Navigation Menu"
        >
          ☰
        </button>
        <a href="/" className="navbar-brand">
          <span className="navbar-brand-icon">🔬</span>
          <span className="brand-text">Research Agent</span>
        </a>
        <div style={{ marginLeft: "auto" }}>
          <ThemeToggle />
        </div>
      </header>

      {/* Persistent Left Sidebar for Desktop */}
      <aside className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <a href="/" className="navbar-brand">
            <span className="navbar-brand-icon">🔬</span>
            <span className="brand-text">Research Agent</span>
          </a>
          <button
            className="mobile-close-btn"
            onClick={() => setIsMobileOpen(false)}
          >
            ✕
          </button>
        </div>

        <button className="sidebar-new-btn" onClick={handleNewResearch}>
          <span className="plus-icon">+</span> New Thread
        </button>

        <nav className="sidebar-nav">
          <div className="history-section">
            <div className="history-header">
              <span className="history-title">Recent Threads</span>
              {recentSearches.length > 0 && (
                <button
                  className="clear-history-btn"
                  onClick={clearRecentSearches}
                  title="Clear all history"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="history-list-scroll">
              {recentSearches.length === 0 ? (
                <div className="history-empty">No recent research</div>
              ) : (
                recentSearches.map((search) => (
                  <button
                    key={search.timestamp}
                    className="history-item-btn"
                    onClick={() => handleHistoryClick(search.query)}
                  >
                    <span className="history-item-text">{search.query}</span>
                    <span className="history-item-time">
                      {formatHistoryTime(search.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-profile-card">
              <div className="user-avatar">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name || "Researcher"}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <div className="sidebar-actions-row">
            <ThemeToggle />
            <button className="sidebar-logout-btn" onClick={logout}>
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {isMobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content Viewport */}
      <main className="layout-content-viewport">{children}</main>
    </div>
  );
}
