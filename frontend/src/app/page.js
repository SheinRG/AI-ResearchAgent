"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import { useAuth } from "@/hooks/useAuth";

// Time-aware openers, framed for someone here to *work* — late hours nudge
// ("Working late") rather than sign off. Phrased so a ", Name" appends cleanly.
function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

const EXAMPLES = [
  "What are the latest breakthroughs in fusion energy?",
  "How does CRISPR base editing actually work?",
  "Why is the AI chip supply chain so concentrated?",
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Greeting depends on the client clock, so resolve after mount to avoid a
  // server/client hydration mismatch.
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = (query) => {
    router.push(`/research?q=${encodeURIComponent(query)}`);
  };

  if (isLoading || !isAuthenticated) return null;

  const name = user?.name?.split(" ")[0];

  return (
    <main className="home-hero">
      <div className="home-hero-inner">
        <div className="home-greeting">
          <h1 className="home-greeting-title">
            {greeting}
            {name ? <span className="home-greeting-name">, {name}</span> : null}
            <span className="home-greeting-dot">.</span>
          </h1>
          <p className="home-greeting-sub">
            What do you want to understand today?
          </p>
        </div>

        <div className="home-search">
          <SearchBar onSearch={handleSearch} mode="large" />

          <div className="suggestion-row">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="suggestion-chip"
                onClick={() => handleSearch(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
