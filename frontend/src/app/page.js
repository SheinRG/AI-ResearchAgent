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

const QUICK_ACTIONS = [
  {
    icon: AtomIcon,
    label: "Latest breakthroughs in quantum computing",
  },
  {
    icon: DnaIcon,
    label: "How does mRNA vaccine technology work?",
  },
  {
    icon: TrendingIcon,
    label: "Compare the top AI chip makers in 2026",
  },
  {
    icon: CodeIcon,
    label: "Explain transformer architecture in AI",
  },
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          aura<span className="wordmark-accent">.ai</span>
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          Deep, cited research on anything. Ask and watch the answer assemble
          itself.
        </motion.p>

        <SearchBar onSearch={handleSearch} mode="large" />

        <motion.div
          className="quick-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <div className="quick-panel-label">Try deep research</div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map(({ icon: Icon, label }, i) => (
              <motion.button
                key={label}
                className="quick-card"
                onClick={() => handleSearch(label)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.07 }}
              >
                <span className="quick-card-icon">
                  <Icon width={18} height={18} />
                </span>
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {recentSearches.length > 0 && (
          <motion.div
            className="recent-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="recent-label">Recent Research</div>
            <div className="recent-list">
              {recentSearches.slice(0, 3).map((search, i) => (
                <motion.a
                  key={search.timestamp}
                  className="recent-item"
                  onClick={() => handleSearch(search.query)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.05 }}
                >
                  <span className="recent-item-icon">
                    <ClockIcon width={16} height={16} />
                  </span>
                  <span className="recent-item-text">{search.query}</span>
                  <span className="recent-item-time">
                    {formatTime(search.timestamp)}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
