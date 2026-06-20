"""
Router Node — Intent triage.
Decides whether a user message needs a normal conversational reply ("chat") or
the full web-research pipeline ("research"), so casual messages like "hi" don't
trigger searching, scraping, and a cited summary. Uses the fast model with a
tiny structured output to keep the added latency minimal.
"""

import logging

from app.services.llm import get_llm_client
from app.agents.state import ResearchState, format_history

logger = logging.getLogger(__name__)

ROUTER_SYSTEM = """You route a user's message to ONE of two modes for an AI assistant named goon:

- "chat": normal conversation or a simple request the assistant can answer well from its own knowledge — greetings and small talk (hi, hello, thanks, how are you), questions about the assistant itself (who are you, what can you do, your name), opinions, jokes, encouragement, casual advice, writing / rephrasing / translating / summarizing text the user gives you, basic math, and widely-known facts that do not depend on recent or live information.

- "research": anything that genuinely benefits from current information or web sources — news and recent events, live or real-world data (prices, stats, scores, weather), comparisons of specific real products/tools/services ("best X", "X vs Y"), specific people / companies / papers / places, how-tos where citations add real value, or any question where giving an outdated or made-up answer would matter.

Decide from the LATEST user message, using the prior conversation only for context. Lean toward "chat" for greetings and clearly casual or self-contained messages. When genuinely unsure, choose "research".

Respond ONLY with JSON: {{"mode": "chat"}} or {{"mode": "research"}}."""

ROUTER_PROMPT = """{conversation}Latest user message: {query}

Respond with JSON only:"""


async def router_node(state: ResearchState) -> dict:
    """Classify the message into 'chat' or 'research' mode."""
    query = state["query"]
    history = state.get("history", [])

    conversation = ""
    history_text = format_history(history)
    if history_text:
        conversation = f"Conversation so far:\n{history_text}\n\n"

    mode = "research"
    try:
        llm = get_llm_client()
        result = await llm.generate_structured(
            prompt=ROUTER_PROMPT.format(conversation=conversation, query=query),
            system=ROUTER_SYSTEM,
            temperature=0.0,
        )
        candidate = str(result.get("mode", "")).strip().lower()
        if candidate in ("chat", "research"):
            mode = candidate
    except Exception as e:
        # Fail safe: on any error, fall back to the full research pipeline.
        logger.warning("Router failed, defaulting to research: %s", e)

    logger.info("Router: mode=%s for query: %s", mode, query[:80])
    return {"mode": mode}
