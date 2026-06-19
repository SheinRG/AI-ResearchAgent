"""
FastAPI application — Auth, CORS, SSE endpoints, session management.
Main entry point for the AI Research Agent backend.
"""

import json
import uuid
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc

from app.config import get_settings
from app.models.schemas import (
    ResearchRequest,
    SessionResponse,
    SessionListItem,
    SessionTurn,
    SessionThreadResponse,
    SearchResult,
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    AuthResponse,
)
from app.models.database import (
    init_db,
    close_db,
    ResearchSession,
    ResearchQuery,
    User,
    get_session_factory,
)
from app.agents.graph import get_research_graph
from app.services.llm import get_llm_client
from app.services.cache import close_redis, get_redis
from app.services.scraper import close_scraper
from app.services.auth import (
    hash_password,
    verify_password,
    create_token,
    validate_token,
    verify_google_token,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("Starting AI Research Agent backend...")

    # Security guard: refuse to start silently with the default JWT secret.
    startup_settings = get_settings()
    if startup_settings.auth_secret.startswith("change-me"):
        logger.warning(
            "=" * 70 + "\n"
            "  SECURITY WARNING: AUTH_SECRET is still the insecure default.\n"
            "  Set a strong random AUTH_SECRET before exposing this to users:\n"
            "    python -c \"import secrets; print(secrets.token_hex(32))\"\n"
            + "=" * 70
        )

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error("Database init failed (will retry on first request): %s", e)

    # Check LLM health
    try:
        llm = get_llm_client()
        healthy = await llm.health_check()
        if healthy:
            logger.info("LLM client is healthy (model: %s)", llm.model)
        else:
            logger.warning("LLM health check failed — check API key")
    except Exception as e:
        logger.warning("LLM health check failed: %s", e)

    yield

    # Shutdown
    await close_scraper()
    await close_redis()
    await close_db()
    logger.info("Backend shutdown complete")


# --- FastAPI App ---
app = FastAPI(
    title="AI Research Agent",
    description="Autonomous research agent with cited answers — powered by Groq + Serper",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth Dependency ---

async def get_current_user(request: Request) -> dict:
    """
    Extract and validate JWT from the Authorization header.

    Returns:
        User payload dict with sub, email, name.

    Raises:
        HTTPException 401 if token is missing or invalid.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]  # Strip "Bearer "
    payload = validate_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


# --- Rate Limiting ---

async def check_rate_limit(user_id: str) -> None:
    """
    Check if a user has exceeded the hourly rate limit.

    Uses Redis to track request count per user per hour.

    Raises:
        HTTPException 429 if rate limit exceeded.
    """
    redis = await get_redis()
    if redis is None:
        return  # Skip rate limiting if Redis is unavailable

    settings = get_settings()
    key = f"ratelimit:{user_id}"

    try:
        count = await redis.get(key)
        if count and int(count) >= settings.rate_limit_per_hour:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {settings.rate_limit_per_hour} queries per hour.",
            )

        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 3600)  # Reset after 1 hour
        await pipe.execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Rate limit check failed: %s", e)


# --- Health Check ---
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    llm = get_llm_client()
    llm_ok = await llm.health_check()
    return {
        "status": "healthy",
        "llm": "connected" if llm_ok else "disconnected",
        "model": llm.model,
    }


# --- Auth Endpoints ---

@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    """
    Register a new user with email and password.

    Returns JWT token and user info on success.
    """
    factory = get_session_factory()
    async with factory() as db:
        # Check if email is already registered
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(status_code=409, detail="Registration failed. Please try again or log in.")

        # Create user
        user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            name=request.name or request.email.split("@")[0],
            password_hash=hash_password(request.password),
        )
        db.add(user)
        await db.commit()

        token = create_token(user.id, user.email, user.name)

        logger.info("New user registered: %s", user.email)
        return AuthResponse(
            token=token,
            user={"id": user.id, "email": user.email, "name": user.name},
        )


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """
    Log in with email and password.

    Returns JWT token and user info on success.
    """
    factory = get_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token(user.id, user.email, user.name)

        logger.info("User logged in: %s", user.email)
        return AuthResponse(
            token=token,
            user={"id": user.id, "email": user.email, "name": user.name},
        )


@app.post("/api/auth/google")
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate with Google OAuth.

    Verifies the Google ID token, creates or finds the user,
    and returns a JWT token.
    """
    # Verify Google token
    google_info = await verify_google_token(request.credential)
    if not google_info:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    factory = get_session_factory()
    async with factory() as db:
        # Check if user exists by google_id or email
        result = await db.execute(
            select(User).where(
                (User.google_id == google_info["google_id"]) |
                (User.email == google_info["email"])
            )
        )
        user = result.scalar_one_or_none()

        if user:
            # Update Google info if needed
            if not user.google_id:
                user.google_id = google_info["google_id"]
            if google_info.get("picture"):
                user.picture = google_info["picture"]
            if google_info.get("name") and not user.name:
                user.name = google_info["name"]
            await db.commit()
        else:
            # Create new user
            user = User(
                id=str(uuid.uuid4()),
                email=google_info["email"],
                name=google_info.get("name", google_info["email"].split("@")[0]),
                google_id=google_info["google_id"],
                picture=google_info.get("picture", ""),
            )
            db.add(user)
            await db.commit()

        token = create_token(user.id, user.email, user.name)

        logger.info("Google auth: %s", user.email)
        return AuthResponse(
            token=token,
            user={"id": user.id, "email": user.email, "name": user.name},
        )


@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current authenticated user's info."""
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "name": user.get("name"),
    }


# --- SSE Research Endpoint ---
@app.post("/api/research")
async def research(
    request: ResearchRequest,
    user: dict = Depends(get_current_user),
):
    """
    Start a research session. Streams SSE events as the agent works.
    Requires authentication.

    Events streamed:
        - phase: Current phase (planning, searching, reading, writing, reflecting)
        - sub_queries: Generated sub-queries
        - sources: Found web sources
        - token: Individual answer tokens (streamed)
        - follow_up: Suggested follow-up questions
        - done: Final session metadata
    """
    user_id = user.get("sub", "")
    logger.info("Research request from %s: %s", user.get("email"), request.query[:100])

    # Check rate limit
    await check_rate_limit(user_id)

    async def event_stream() -> AsyncGenerator[str, None]:
        """Generate SSE events from the research agent."""
        session_id = request.session_id or str(uuid.uuid4())

        event_queue: asyncio.Queue = asyncio.Queue()

        async def queue_callback(event_type: str, data: dict):
            """Put events into the queue for streaming."""
            await event_queue.put((event_type, data))

        async def run_agent():
            """Run the research graph and signal completion."""
            try:
                graph = get_research_graph()
                initial_state = {
                    "query": request.query,
                    "max_iterations": request.max_iterations,
                    "history": [
                        {"query": h.query, "answer": h.answer}
                        for h in request.history
                    ],
                    "iteration": 0,
                    "sub_queries": [],
                    "search_results": [],
                    "scraped_content": [],
                    "ranked_chunks": [],
                    "draft_answer": "",
                    "citations": [],
                    "all_sources": [],
                    "reflection": {},
                    "confidence": 0.0,
                    "follow_up_suggestions": [],
                    "phase": "starting",
                    "error": "",
                    "sse_callback": queue_callback,
                }

                # Run the graph, accumulating each node's partial update into a
                # single merged state. astream yields {node: update} per node, so
                # keeping only the last update would drop the answer and sources
                # (which are written by earlier nodes than the reflector).
                accumulated: dict = {}
                async for state in graph.astream(initial_state):
                    if isinstance(state, dict):
                        for node_output in state.values():
                            if isinstance(node_output, dict):
                                accumulated.update(node_output)

                # Signal completion
                await event_queue.put(("_final_state", accumulated))

            except Exception as e:
                logger.error("Agent execution failed: %s", e)
                await event_queue.put(("error", {"message": str(e)}))
                await event_queue.put(("_final_state", {"error": str(e)}))

        # Start agent in background task
        agent_task = asyncio.create_task(run_agent())

        # Stream events from the queue
        try:
            while True:
                event_type, data = await asyncio.wait_for(
                    event_queue.get(), timeout=300  # 5 minute timeout
                )

                if event_type == "_final_state":
                    # Save to database and emit done event
                    final = data
                    done_data = {
                        "session_id": session_id,
                        "total_sources": len(final.get("all_sources", final.get("search_results", []))),
                        "iterations": final.get("iteration", 1),
                        "confidence": final.get("confidence", 0.0),
                    }

                    # Save to database asynchronously
                    try:
                        await _save_session(
                            session_id=session_id,
                            query=request.query,
                            final_state=final,
                            user_id=user_id,
                        )
                    except Exception as e:
                        logger.error("Failed to save session: %s", e)

                    yield f"event: done\ndata: {json.dumps(done_data)}\n\n"
                    break

                elif event_type == "error":
                    yield f"event: error\ndata: {json.dumps(data)}\n\n"

                else:
                    yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

        except asyncio.TimeoutError:
            logger.error("Research timed out after 5 minutes")
            yield f"event: error\ndata: {json.dumps({'message': 'Research timed out'})}\n\n"
        finally:
            if not agent_task.done():
                agent_task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# --- Session Endpoints ---

def _safe_search_result(raw: dict) -> SearchResult | None:
    """
    Construct a SearchResult from a stored dict, tolerating missing keys.

    Older rows may have been saved before the schema was finalised and may be
    missing one or more fields. Rather than crashing with a 500 we normalise
    them here so the frontend always receives a well-formed object.

    Returns None when the input is not a dict (silently skipped by callers).
    """
    if not isinstance(raw, dict):
        return None
    return SearchResult(
        url=raw.get("url", ""),
        title=raw.get("title", ""),
        domain=raw.get("domain", raw.get("url", "")),
        favicon=raw.get("favicon", ""),
        snippet=raw.get("snippet", ""),
    )


@app.get("/api/sessions")
async def list_sessions(
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    """
    List recent research *threads* for the authenticated user.

    Fetches the most recent ~200 ResearchQuery rows for the user, groups them
    by session_id in Python, and returns one collapsed item per session sorted
    by the latest turn's created_at (most-recently-active first).

    Each item carries:
      - id / query / title  – the session UUID and the first query (title)
      - turn_count          – number of turns in the session
      - confidence          – confidence score of the most recent turn
      - created_at          – ISO timestamp of the first (earliest) turn
      - updated_at          – ISO timestamp of the most recent turn
    """
    user_id = user.get("sub", "")
    try:
        factory = get_session_factory()
        async with factory() as db:
            # Fetch a generous batch so grouping works even for prolific users.
            result = await db.execute(
                select(ResearchQuery)
                .where(ResearchQuery.user_id == user_id)
                .order_by(desc(ResearchQuery.created_at))
                .limit(200)
            )
            rows = result.scalars().all()

        # Group by session_id, maintaining insertion order so we can later sort
        # by updated_at without losing any sessions.
        sessions: dict[str, list] = {}
        for row in rows:
            sessions.setdefault(row.session_id, []).append(row)

        # Build one SessionListItem per session.
        items = []
        for sid, turns in sessions.items():
            # Turns from the DB are newest-first; reverse for chronological order.
            turns_asc = sorted(turns, key=lambda r: r.created_at or "")
            first = turns_asc[0]
            last  = turns_asc[-1]

            title        = first.query or ""
            created_at   = first.created_at.isoformat() if first.created_at else ""
            updated_at   = last.created_at.isoformat()  if last.created_at  else created_at
            confidence   = last.confidence or 0.0
            turn_count   = len(turns_asc)

            items.append(
                SessionListItem(
                    id=sid,
                    query=title,   # back-compat field
                    title=title,
                    confidence=confidence,
                    turn_count=turn_count,
                    created_at=created_at,
                    updated_at=updated_at,
                ).model_dump()
            )

        # Sort sessions by most-recently-active first, then cap to `limit`.
        items.sort(key=lambda x: x["updated_at"], reverse=True)
        return items[:limit]

    except Exception as e:
        logger.error("Failed to list sessions: %s", e)
        return []


@app.get("/api/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Return the full multi-turn thread for *session_id*.

    All ResearchQuery rows that belong to this session (and this user) are
    fetched in chronological order. Each row becomes a SessionTurn. The
    response also includes the session-level title (first query) and timestamps.

    Returns 404 when the session doesn't exist or belongs to another user.
    """
    user_id = user.get("sub", "")
    try:
        factory = get_session_factory()
        async with factory() as db:
            result = await db.execute(
                select(ResearchQuery)
                .where(
                    ResearchQuery.session_id == session_id,
                    ResearchQuery.user_id == user_id,
                )
                .order_by(ResearchQuery.created_at)   # ASC — chronological
            )
            rows = result.scalars().all()

        if not rows:
            raise HTTPException(status_code=404, detail="Session not found")

        turns = []
        for row in rows:
            # Defensively normalise stored sources; skip non-dict entries.
            sources = [
                sr for raw in (row.sources or [])
                if (sr := _safe_search_result(raw)) is not None
            ]
            turns.append(
                SessionTurn(
                    query=row.query or "",
                    answer=row.answer or "",
                    sources=sources,
                    citations=row.citations or [],
                    confidence=row.confidence or 0.0,
                    iterations=row.iterations or 1,
                    follow_up_suggestions=row.follow_up_suggestions or [],
                    created_at=row.created_at.isoformat() if row.created_at else "",
                )
            )

        first = rows[0]
        return SessionThreadResponse(
            id=session_id,
            title=first.query or "",
            created_at=first.created_at.isoformat() if first.created_at else "",
            turns=turns,
        ).model_dump()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get session %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail="Failed to retrieve session")


async def _save_session(
    session_id: str,
    query: str,
    final_state: dict,
    user_id: str = "",
) -> None:
    """Save a completed research session to the database."""
    try:
        factory = get_session_factory()
        async with factory() as db:
            # Create the session row only if it doesn't already exist, so a
            # reused session_id (e.g. a follow-up) doesn't hit a PK conflict.
            existing = await db.get(ResearchSession, session_id)
            if existing is None:
                db.add(ResearchSession(id=session_id, user_id=user_id or None))

            # Create query record
            sources = final_state.get("all_sources", final_state.get("search_results", []))
            research_query = ResearchQuery(
                session_id=session_id,
                user_id=user_id or None,
                query=query,
                sub_queries=final_state.get("sub_queries", []),
                answer=final_state.get("draft_answer", ""),
                sources=sources[:20],  # Limit stored sources
                citations=final_state.get("citations", []),
                confidence=final_state.get("confidence", 0.0),
                iterations=final_state.get("iteration", 1),
                follow_up_suggestions=final_state.get("follow_up_suggestions", []),
            )
            db.add(research_query)
            await db.commit()

            logger.info("Saved session %s to database", session_id)

    except Exception as e:
        logger.error("Database save failed for session %s: %s", session_id, e)
