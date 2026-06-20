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

// A wide pool of openers; the hero shows a rotating window of three so the
// page feels alive and nudges different directions on every visit.
const SUGGESTION_POOL = [
  "What are the latest breakthroughs in fusion energy?",
  "How does CRISPR base editing actually work?",
  "Why is the AI chip supply chain so concentrated?",
  "What's driving the surge in GLP-1 weight-loss drugs?",
  "How do large language models actually represent meaning?",
  "Is small modular nuclear finally becoming viable?",
  "How close are we to practical quantum error correction?",
  "What makes the new mRNA cancer vaccines different?",
  "How do solid-state batteries compare to lithium-ion?",
  "What's the scientific consensus on gut microbiome health?",
  "How are autonomous agents changing software engineering?",
  "What's the realistic timeline for commercial fusion power?",
  "Why are higher interest rates reshaping global startups?",
  "How does end-to-end encryption actually keep messages private?",
  "What's the state of room-temperature superconductor research?",
];

// Fisher-Yates shuffle — fresh order each mount so visits differ.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const VISIBLE_COUNT = 3;
const ROTATE_MS = 6000;

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Greeting depends on the client clock, so resolve after mount to avoid a
  // server/client hydration mismatch.
  const [greeting, setGreeting] = useState("");

  // Rotating suggestions: a shuffled pool resolved after mount (avoids a
  // hydration mismatch), advanced by a window of three on a timer with a
  // brief cross-fade.
  const [pool, setPool] = useState([]);
  const [start, setStart] = useState(0);
  const [chipsOpacity, setChipsOpacity] = useState(1);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
    setPool(shuffle(SUGGESTION_POOL));
  }, []);

  useEffect(() => {
    if (pool.length <= VISIBLE_COUNT) return;
    const id = setInterval(() => {
      setChipsOpacity(0);
      setTimeout(() => {
        setStart((s) => (s + VISIBLE_COUNT) % pool.length);
        setChipsOpacity(1);
      }, 250);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [pool.length]);

  const suggestions = pool.length
    ? Array.from({ length: VISIBLE_COUNT }, (_, i) => pool[(start + i) % pool.length])
    : [];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = (query) => {
    router.push(`/research?q=${encodeURIComponent(query)}`);
  };

  if (isLoading || !isAuthenticated) return null;

  // Prefer the user's personalized name; fall back to their first name.
  const name = user?.preferred_name?.trim() || user?.name?.split(" ")[0];

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

          <div
            className="suggestion-row"
            style={{ opacity: chipsOpacity, transition: "opacity 0.25s ease" }}
          >
            {suggestions.map((ex) => (
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
