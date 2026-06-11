"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import SearchBar from "@/components/SearchBar";
import useResearchStore from "@/stores/researchStore";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  AtomIcon,
  DnaIcon,
  TrendingIcon,
  CodeIcon,
  ClockIcon,
} from "@/components/Icons";

const SUGGESTIONS = [
  { icon: AtomIcon, label: "Breakthroughs in quantum computing" },
  { icon: DnaIcon, label: "How mRNA vaccine technology works" },
  { icon: TrendingIcon, label: "Top AI chip makers compared" },
  { icon: CodeIcon, label: "Transformer architecture, explained" },
];

export default function HomePage() {
  const router = useRouter();
  const { recentSearches } = useResearchStore();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = (query) => {
    const encoded = encodeURIComponent(query);
    router.push(`/research?q=${encoded}`);
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <main className="main-content">
      <div className="hero">
        <motion.h1
          className="hero-wordmark"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          goon<span className="wordmark-accent">.ai</span>
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          Research, with receipts. Every answer backed by sources you can check.
        </motion.p>

        <SearchBar onSearch={handleSearch} mode="large" />

        <motion.div
          className="suggestion-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.4 }}
        >
          {SUGGESTIONS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="suggestion-chip"
              onClick={() => handleSearch(label)}
            >
              <Icon width={15} height={15} />
              {label}
            </button>
          ))}
        </motion.div>

        {recentSearches.length > 0 && (
          <motion.div
            className="recent-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="recent-label">Recent</div>
            <div className="recent-list">
              {recentSearches.slice(0, 4).map((search) => (
                <a
                  key={search.timestamp}
                  className="recent-item"
                  onClick={() => handleSearch(search.query)}
                >
                  <span className="recent-item-icon">
                    <ClockIcon width={15} height={15} />
                  </span>
                  <span className="recent-item-text">{search.query}</span>
                  <span className="recent-item-time">
                    {formatTime(search.timestamp)}
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
