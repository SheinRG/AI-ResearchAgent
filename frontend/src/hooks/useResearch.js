"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Dev-only: when the backend is unreachable on localhost, stream a simulated
// answer so the UI can be developed offline. MUST stay gated to development —
// in production this would show fabricated "research" with fake sources.
const IS_DEV = process.env.NODE_ENV === "development";

const isNetworkError = (error) =>
  error.message?.includes("fetch") ||
  error.message?.includes("Failed") ||
  error.message?.includes("NetworkError");

/**
 * Custom hook for SSE-based research.
 * Posts to /api/research, parses streaming SSE events for
 * phase updates, sources, tokens, follow-ups, and done signals.
 */
export default function useResearch() {
  const { logout } = useAuth();
  const [phase, setPhase] = useState(null);
  const [phaseMessage, setPhaseMessage] = useState("");
  const [subQueries, setSubQueries] = useState([]);
  const [sources, setSources] = useState([]);
  const [answer, setAnswer] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [doneData, setDoneData] = useState(null);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const handleEvent = useCallback((type, data) => {
    switch (type) {
      case "phase":
        setPhase(data.phase);
        setPhaseMessage(data.message || "");
        break;

      case "sub_queries":
        setSubQueries(data.queries || []);
        break;

      case "sources":
        // `replace` carries the authoritative, citation-ordered list: index i
        // here is exactly the [i] marker in the answer, so swap it in wholesale.
        if (data.replace) {
          setSources(data.sources || []);
        } else {
          setSources((prev) => {
            const existing = new Set(prev.map((s) => s.url));
            const newSources = (data.sources || []).filter(
              (s) => !existing.has(s.url)
            );
            return [...prev, ...newSources];
          });
        }
        break;

      case "token":
        setAnswer((prev) => prev + (data.token || ""));
        break;

      case "follow_up":
        setFollowUps(data.suggestions || []);
        break;

      case "done":
        setIsDone(true);
        setDoneData(data);
        setPhase("done");
        setPhaseMessage("Research complete");
        break;

      case "error":
        setError(data.message || "An error occurred during research");
        break;

      default:
        break;
    }
  }, []);

  const runSimulation = useCallback(async (query, signal) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    if (signal.aborted) return;
    
    // Step 1: Planning
    handleEvent("phase", { phase: "planning", message: `Analyzing query: "${query}"...` });
    await sleep(800);
    if (signal.aborted) return;
    
    // Step 2: Sub-queries
    handleEvent("sub_queries", { 
      queries: [
        `${query} latest breakthroughs 2026`,
        `explain ${query} definition and guides`,
        `pros and cons of ${query}`
      ] 
    });
    handleEvent("phase", { phase: "searching", message: "Searching web sources..." });
    await sleep(1500);
    if (signal.aborted) return;
    
    // Step 3: Sources
    handleEvent("sources", {
      sources: [
        { url: `https://wikipedia.org/wiki/${encodeURIComponent(query)}`, title: `${query} - Wikipedia`, domain: "wikipedia.org", favicon: "https://wikipedia.org/favicon.ico", snippet: `Detailed encyclopedia article about ${query} history, definitions, and applications.` },
        { url: `https://techcrunch.com/search/${encodeURIComponent(query)}`, title: `Latest updates on ${query} - TechCrunch`, domain: "techcrunch.com", favicon: "https://techcrunch.com/favicon.ico", snippet: `Tech Crunch reporting on industry adoption, funding rounds, and emerging tools for ${query}.` },
        { url: `https://github.com/search?q=${encodeURIComponent(query)}`, title: `Open-source repositories for ${query} - GitHub`, domain: "github.com", favicon: "https://github.com/favicon.ico", snippet: `Discover open-source implementations, library bindings, and developers building with ${query}.` }
      ]
    });
    handleEvent("phase", { phase: "reading", message: "Extracting content from 3 gold-standard sources..." });
    await sleep(1200);
    if (signal.aborted) return;
    
    // Step 4: Writing / Synthesizing
    handleEvent("phase", { phase: "writing", message: "Synthesizing cited answer..." });
    await sleep(500);
    if (signal.aborted) return;
    
    const mockAnswer = `Here is a comprehensive research summary on **${query}** based on our gold-standard sources:

### 1. Overview & Context
Research on **${query}** indicates that it is rapidly transforming technical architectures [1]. Early definitions highlights its role as a key driver for efficiency and modular growth in modern application designs [2].

### 2. Industry Trends
Several leading open-source repositories and packages on GitHub show high developer adoption rates [3]. Furthermore, current market reports indicate rising venture interest and corporate deployments globally [2].

### 3. Key Takeaways
*   **Modular scalability**: Decoupling components enables faster iteration cycles.
*   **Resource efficiency**: Minimizes memory usage and local execution overhead [1].
*   **Active Ecosystem**: High density of community plugins and libraries are emerging [3].

In conclusion, scaling **${query}** remains a top priority for teams looking to stay ahead in 2026.`;

    // Stream tokens
    const words = mockAnswer.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      if (signal.aborted) return;
      handleEvent("token", { token: words[i] });
      await sleep(15 + Math.random() * 20); // variable streaming speed
    }
    
    if (signal.aborted) return;
    await sleep(400);
    
    // Step 5: Follow-up Suggestions
    handleEvent("follow_up", {
      suggestions: [
        `What are the security considerations when deploying ${query}?`,
        `Can you show an example implementation of ${query}?`,
        `What is the timeline for widespread adoption of ${query}?`
      ]
    });
    
    // Step 6: Done
    handleEvent("done", { session_id: "mock-session-id", total_sources: 3, iterations: 1, confidence: 0.95 });
  }, [handleEvent]);

  const startResearch = useCallback(async (query, maxIterations = 1, token = null) => {
    // Reset state
    setPhase(null);
    setPhaseMessage("");
    setSubQueries([]);
    setSources([]);
    setAnswer("");
    setFollowUps([]);
    setIsStreaming(true);
    setIsDone(false);
    setDoneData(null);
    setError(null);

    // Abort any previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE}/api/research`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, max_iterations: maxIterations }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Surface a friendly, specific message for known statuses.
        let detail = "";
        try {
          const body = await response.json();
          detail = body?.detail || "";
        } catch {
          // non-JSON body; ignore
        }
        if (response.status === 401) {
          // Invalid/expired/stale token (e.g. a leftover dev-mock token).
          // Clear the session and bounce to login so the user can get a
          // fresh, valid token instead of looping on the same 401.
          setError("Your session has expired. Please sign in again.");
          logout();
          return;
        }
        if (response.status === 429) {
          throw new Error(detail || "You've hit the hourly query limit. Please try again later.");
        }
        throw new Error(detail || `The server responded with an error (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        let eventType = null;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent(eventType, data);
            } catch {
              // Ignore malformed JSON
            }
            eventType = null;
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        if (IS_DEV && isNetworkError(err)) {
          console.warn("[dev] Backend offline — simulating research stream.");
          await runSimulation(query, controller.signal);
        } else if (isNetworkError(err)) {
          setError("Can't reach the research server. Please try again shortly.");
        } else {
          console.error("Research error:", err);
          setError(err.message || "An unexpected error occurred");
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, [handleEvent, runSimulation, logout]);

  const stopResearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    // State
    phase,
    phaseMessage,
    subQueries,
    sources,
    answer,
    followUps,
    isStreaming,
    isDone,
    doneData,
    error,
    // Actions
    startResearch,
    stopResearch,
  };
}
