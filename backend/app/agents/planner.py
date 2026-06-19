"""
Planner Node — Query Decomposition.
Takes the user's question and generates 2-4 focused sub-queries
using Groq's structured JSON output.
"""

import logging
from datetime import date

from app.services.llm import get_llm_client
from app.agents.state import ResearchState, format_history

logger = logging.getLogger(__name__)

PLANNER_SYSTEM = """You are a research planning assistant. Your job is to break down complex questions into focused sub-queries that can be individually searched on the web.

Rules:
- Generate 2-4 sub-queries that together cover the full scope of the original question
- Each sub-query should be specific and searchable (good for web search)
- For time-sensitive topics, anchor recency to the current year ({current_year}) — e.g. "... {current_year}" or "latest {current_year}"
- Each sub-query should target a different aspect of the question
- Prefer authoritative angles (official data, primary sources, expert analysis)
- Do NOT repeat the original question verbatim as a sub-query

Follow-up handling (when a conversation is provided):
- The new question may be a follow-up that relies on the earlier conversation. Resolve references like "it", "they", "that", "this", or "the company" to the ACTUAL named entities from the conversation.
- Every sub-query MUST be self-contained: it is sent to a web search engine that has NO memory of the conversation, so spell out the real names, places, and topics instead of pronouns.

PRESENTATION FORMAT: Also decide the single best format for the final answer by reasoning about what the user is actually trying to accomplish and what would be most useful and scannable — NOT by keyword matching. Consider the conversation history and the kind of question asked. Guidance:
- "table" -> the answer is a set of MULTIPLE NAMED THINGS the user is choosing between or comparing — resources, tools, products, courses, services, sheets, websites, libraries, options, or entities — where each one has attributes a chooser would weigh (price, topics covered, difficulty, ratings, pros/cons, specs, who it's best for). This is the RIGHT default for "best X", "top X", "recommended X", "which X should I use", and "X vs Y" questions. Each thing becomes a row; pick 3-5 columns that matter for THIS specific query. Example: "best DSA sheets online" -> table with columns like ["Sheet", "Topics covered", "No. of problems", "Cost", "Best for"]. "top laptops under 50k" -> ["Laptop", "Price", "CPU/RAM", "Display", "Best for"].
- "steps" -> a process, how-to, setup, or ordered ranking the user follows in sequence.
- "list" -> discrete points, tips, reasons, takeaways, or facts that are NOT comparable named entities and have no shared attributes to line up in columns. If the items are named options that could be compared, prefer "table", not "list".
- "prose" -> a single fact, definition, explanation, cause/effect, or open-ended discussion.
Decision rule: if you can imagine the answer as rows-and-columns where each row is one named option, choose "table". Only fall back to "list" when there is genuinely nothing to compare across items, and to "prose" for a single-topic explanation.

Respond ONLY with valid JSON in this exact format:
{{"sub_queries": ["sub-query 1", "sub-query 2", "sub-query 3"], "answer_format": {{"type": "table|list|steps|prose", "reasoning": "one short clause", "columns": ["Col A", "Col B"]}}}}
Note: "columns" is REQUIRED only when type is "table" (list of 2-6 short column header strings tailored to the query); omit or use [] otherwise."""

PLANNER_PROMPT_TEMPLATE = """{conversation_context}Break down this research question into 2-4 focused, searchable sub-queries:

Question: {query}

{refinement_context}

Respond with JSON only:"""


async def planner_node(state: ResearchState) -> dict:
    """
    Planner node: decomposes the user query into sub-queries.

    Args:
        state: Current research state.

    Returns:
        Updated state fields: sub_queries, phase.
    """
    query = state["query"]
    iteration = state.get("iteration", 0)
    history = state.get("history", [])
    sse_callback = state.get("sse_callback")

    logger.info("Planner: decomposing query (iteration %d): %s", iteration, query[:100])

    # Send phase update
    if sse_callback:
        await sse_callback("phase", {
            "phase": "planning",
            "message": "Breaking down your question..." if iteration == 0 else "Refining search strategy..."
        })

    # Build refinement context from previous reflection
    refinement_context = ""
    reflection = state.get("reflection")
    if reflection and iteration > 0:
        gaps = reflection.get("gaps", [])
        if gaps:
            refinement_context = (
                f"Previous search found gaps in these areas:\n"
                f"{chr(10).join(f'- {g}' for g in gaps)}\n"
                f"Focus the new sub-queries on filling these specific gaps."
            )

    # Build conversation context for follow-up questions. Only the planner needs
    # the full transcript to resolve references into self-contained sub-queries.
    conversation_context = ""
    history_text = format_history(history)
    if history_text:
        conversation_context = (
            "This is a FOLLOW-UP question in an ongoing research conversation. "
            "Use the conversation below to resolve any references to real entities, "
            "then make every sub-query self-contained.\n\n"
            f"Conversation so far:\n{history_text}\n\n"
        )

    prompt = PLANNER_PROMPT_TEMPLATE.format(
        conversation_context=conversation_context,
        query=query,
        refinement_context=refinement_context,
    )
    system = PLANNER_SYSTEM.format(current_year=date.today().year)

    try:
        llm = get_llm_client()
        result = await llm.generate_structured(
            prompt=prompt,
            system=system,
            temperature=0.3,
        )

        sub_queries = result.get("sub_queries", [])

        # Validate and clean
        if not sub_queries or not isinstance(sub_queries, list):
            logger.warning("Planner returned invalid sub_queries, using fallback")
            sub_queries = [query]

        # Ensure 2-4 queries and deduplicate to prevent redundant pipeline execution
        seen = set()
        clean_queries = []
        for q in sub_queries:
            q_clean = q.strip()
            if q_clean and q_clean.lower() not in seen:
                seen.add(q_clean.lower())
                clean_queries.append(q_clean)

        sub_queries = clean_queries[:4]

        # Add original query as fallback if we don't have enough distinct sub-queries
        if len(sub_queries) < 2 and query.lower() not in seen:
            sub_queries.append(query)

        logger.info("Planner generated %d sub-queries: %s", len(sub_queries), sub_queries)

        # Extract and validate the presentation format decision
        _allowed_types = {"table", "list", "steps", "prose"}
        raw_fmt = result.get("answer_format")
        if not isinstance(raw_fmt, dict):
            raw_fmt = {}

        fmt_type = raw_fmt.get("type")
        if fmt_type not in _allowed_types:
            fmt_type = "prose"

        fmt_reasoning = raw_fmt.get("reasoning")
        if not isinstance(fmt_reasoning, str):
            fmt_reasoning = ""

        fmt_columns = raw_fmt.get("columns")
        if not isinstance(fmt_columns, list):
            fmt_columns = []
        else:
            # Coerce every element to string; drop blanks
            fmt_columns = [str(c) for c in fmt_columns if str(c).strip()]

        # Columns are only meaningful for table; clear them for other types
        if fmt_type != "table":
            fmt_columns = []

        fmt = {"type": fmt_type, "reasoning": fmt_reasoning, "columns": fmt_columns}
        logger.info("Planner format decision: %s %s", fmt.get("type"), fmt.get("columns"))

        # Send sub-queries event
        if sse_callback:
            await sse_callback("sub_queries", {"queries": sub_queries})

        return {
            "sub_queries": sub_queries,
            "answer_format": fmt,
            "phase": "planning",
        }

    except Exception as e:
        logger.error("Planner failed: %s", e)
        # Fallback: use the original query and safe default format
        fallback = [query]
        if sse_callback:
            await sse_callback("sub_queries", {"queries": fallback})
        return {
            "sub_queries": fallback,
            "answer_format": {"type": "prose", "reasoning": "", "columns": []},
            "phase": "planning",
            "error": f"Planner error: {str(e)}",
        }
