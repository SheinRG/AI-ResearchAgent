"""
Synthesizer Node — Cited Markdown Answer Generation.
Receives top-ranked chunks, builds a canonical numbered source list, and
generates a comprehensive answer with [1], [2] markers that map exactly to
that list — streaming tokens via the (stronger) synthesis model.
"""

import logging
from datetime import date

from app.services.llm import get_llm_client
from app.utils.citations import build_cited_context, extract_citations
from app.agents.state import ResearchState
from app.config import get_settings

logger = logging.getLogger(__name__)

SYNTHESIZER_SYSTEM = """You are an expert research analyst. You write accurate, comprehensive, well-structured answers grounded strictly in the numbered sources provided.

CITATION RULES (critical):
- Support every factual claim with a citation marker like [1], [2] that refers to the numbered sources given to you.
- Place the citation immediately after the claim it supports. Combine markers when several sources agree: [1][3].
- Use ONLY the source numbers that appear in the provided sources. Never invent a source number.
- If the sources do not contain enough information to answer part of the question, say so explicitly instead of guessing. Do NOT fabricate facts, numbers, or sources.

WRITING RULES:
- Open with a 2-3 sentence direct answer to the question, then expand with detail.
- Use `##` section headings when the answer spans multiple themes; use bullet lists for enumerable points.
- Lead with specifics: concrete figures, dates, names, and findings drawn from the sources.
- When sources disagree, surface the disagreement and attribute each view.
- Be thorough but do not pad. Prefer information density over filler.
- Write in clean Markdown. Do not include a "Sources" or "References" list at the end — the UI renders citations from the [n] markers."""

SYNTHESIZER_PROMPT = """Today's date is {today}. Answer the question using ONLY the numbered sources below.

**Question:** {query}

**Sources:**
{context}

Write a thorough, well-cited Markdown answer now. Every factual claim must carry a [n] citation that matches a source number above."""


async def synthesizer_node(state: ResearchState) -> dict:
    """
    Synthesizer node: generates a cited markdown answer by streaming tokens.

    Args:
        state: Current research state with ranked_chunks.

    Returns:
        Updated state with draft_answer, citations, all_sources, phase.
    """
    query = state["query"]
    ranked_chunks = state.get("ranked_chunks", [])
    search_results = state.get("search_results", [])
    sse_callback = state.get("sse_callback")
    settings = get_settings()

    logger.info("Synthesizer: generating answer from %d chunks", len(ranked_chunks))

    # --- Build the canonical numbered source list + matching context ---
    cited_sources, context = build_cited_context(
        ranked_chunks,
        search_results,
        max_sources=settings.max_cited_sources,
        max_chunks=settings.rerank_top_k,
    )

    # Fall back to raw search results if re-ranking produced nothing usable.
    if not cited_sources and search_results:
        cited_sources = search_results[: settings.max_cited_sources]

    # Phase: Writing
    if sse_callback:
        await sse_callback("phase", {
            "phase": "writing",
            "message": "Synthesizing your answer...",
        })
        # Authoritative source list — index i here == [i] in the answer.
        # `replace` tells the UI to swap its provisional list for this one.
        if cited_sources:
            await sse_callback("sources", {"sources": cited_sources, "replace": True})

    prompt = SYNTHESIZER_PROMPT.format(
        today=date.today().isoformat(),
        query=query,
        context=context,
    )

    try:
        llm = get_llm_client()
        full_answer = ""

        async for token in llm.generate_stream(
            prompt=prompt,
            system=SYNTHESIZER_SYSTEM,
            temperature=0.4,
            model=settings.groq_synth_model,
            max_tokens=settings.synth_max_tokens,
        ):
            full_answer += token
            if sse_callback:
                await sse_callback("token", {"token": token})

        # Citations resolve against the SAME canonical list shown to the model.
        citations = extract_citations(full_answer, cited_sources)
        citation_dicts = [c.model_dump() for c in citations]

        logger.info(
            "Synthesizer: generated %d char answer, %d sources, %d citations",
            len(full_answer), len(cited_sources), len(citation_dicts),
        )

        return {
            "draft_answer": full_answer,
            "citations": citation_dicts,
            "all_sources": cited_sources,
            "phase": "writing",
        }

    except Exception as e:
        logger.error("Synthesizer failed: %s", e)
        error_answer = (
            "I encountered an error while generating the answer. "
            "Please try again or rephrase your question."
        )
        return {
            "draft_answer": error_answer,
            "citations": [],
            "all_sources": cited_sources,
            "phase": "writing",
            "error": f"Synthesizer error: {str(e)}",
        }
