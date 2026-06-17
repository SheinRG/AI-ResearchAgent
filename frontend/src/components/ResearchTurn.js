"use client";

import { motion } from "motion/react";
import SourceCards from "@/components/SourceCards";
import ResearchTabs from "@/components/ResearchTabs";
import PhaseIndicator from "@/components/PhaseIndicator";
import StreamingAnswer from "@/components/StreamingAnswer";
import FollowUpChips from "@/components/FollowUpChips";
import SkeletonLoader from "@/components/SkeletonLoader";
import { AlertIcon, CheckCircleIcon } from "@/components/Icons";

function getConfidenceClass(confidence) {
  if (confidence >= 0.8) return "confidence-high";
  if (confidence >= 0.6) return "confidence-medium";
  return "confidence-low";
}

/**
 * A single question/answer turn in a research thread (Perplexity-style): the
 * question renders as a right-aligned chat bubble, and below it a tabbed answer
 * card (Answer / Sources / Images). A compact source preview strip sits above
 * the tabs once sources arrive.
 *
 * The Answer tab holds the live answer content: the in-progress phase
 * indicator, skeleton, streaming/final answer, the confidence/stats bar, any
 * error with a retry action, and related follow-up chips.
 */
export default function ResearchTurn({
  query,
  sources = [],
  images = [],
  answer = "",
  isStreaming = false,
  isLive = false,
  phase = null,
  phaseMessage = "",
  showSkeleton = false,
  error = null,
  doneData = null,
  followUps = [],
  onFollowUp = null,
  onRetry = null,
}) {
  // The Answer tab content — everything that was previously in `.chat-answer`.
  const answerPanel = (
    <>
      {isLive && phase && !error && !doneData && (
        <PhaseIndicator phase={phase} message={phaseMessage} />
      )}

      {isLive && error && (
        <motion.div
          className="error-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="error-icon">
            <AlertIcon width={32} height={32} />
          </div>
          <div className="error-title">Something went wrong</div>
          <div className="error-message">{error}</div>
          {onRetry && (
            <button className="error-retry" onClick={onRetry}>
              Try Again
            </button>
          )}
        </motion.div>
      )}

      {isLive && showSkeleton && !error && <SkeletonLoader />}

      {answer && (
        <StreamingAnswer
          answer={answer}
          isStreaming={isStreaming}
          sources={sources}
        />
      )}

      {doneData && (
        <motion.div
          className="done-bar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span
            className={`confidence-badge ${getConfidenceClass(
              doneData.confidence
            )}`}
          >
            <CheckCircleIcon width={14} height={14} />
            {Math.round((doneData.confidence || 0) * 100)}% confidence
          </span>
          <span className="done-separator" />
          <span className="done-stat">
            <span className="done-stat-value">
              {doneData.total_sources || 0}
            </span>{" "}
            sources
          </span>
          <span className="done-separator" />
          <span className="done-stat">
            <span className="done-stat-value">{doneData.iterations || 1}</span>{" "}
            {doneData.iterations === 1 ? "iteration" : "iterations"}
          </span>
        </motion.div>
      )}

      {followUps.length > 0 && (
        <FollowUpChips
          suggestions={followUps}
          onSelect={onFollowUp}
          disabled={!onFollowUp}
        />
      )}
    </>
  );

  return (
    <section className="chat-turn">
      {/* User question — right-aligned chat bubble (a "sent message"). */}
      <motion.div
        className="chat-question"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {query}
      </motion.div>

      {/* Answer area — compact source preview, then tabbed content. */}
      <div className="chat-answer">
        {sources.length > 0 && <SourceCards sources={sources} />}

        <ResearchTabs sources={sources} images={images}>
          {answerPanel}
        </ResearchTabs>
      </div>
    </section>
  );
}
