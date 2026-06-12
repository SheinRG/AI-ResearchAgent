# 🔬 goon.ai — AI Research Agent

> An autonomous research agent that decomposes a question, searches the web, reads and ranks sources, and streams back a comprehensive answer with verifiable `[1]`-style citations — a Perplexity-style experience built on an agentic LangGraph pipeline.

## ✨ Features

- **🤖 Agentic research loop** — Plan → parallel search → scrape & re-rank → synthesize cited answer → reflect & (optionally) refine, orchestrated as a LangGraph state machine
- **🧠 Two-tier LLM strategy** — a fast model for planning/reflection, a stronger model for the final synthesized answer
- **🔍 Web search** — Serper (Google) API for fast, high-quality results with per-domain diversity
- **📖 Content extraction** — Trafilatura pulls clean article text from scraped pages
- **⚡ Neural re-ranking** — FlashRank (CPU-only) ranks chunks by relevance to the query
- **📝 Trustworthy citations** — a single canonical, relevance-ordered source list drives the prompt, the `[n]` markers, and the UI, so every citation points at exactly the source the model read
- **🎯 Self-reflection** — confidence scoring + gap analysis, with an optional refine loop
- **🌊 Real-time streaming** — SSE token streaming for live answer generation
- **🔐 Auth** — email/password (bcrypt) + Google OAuth, stateless JWT, per-user rate limiting
- **💾 Persistence** — PostgreSQL for sessions/history, Redis for search & scrape caching

## 🏗️ Architecture

```
User Query
  → Planner (fast LLM)        decomposes into 2–4 sub-queries
  → Researcher (parallel)     search → scrape → chunk  (Redis-cached)
  → Re-ranker (FlashRank)     rank chunks; build canonical source list
  → Synthesizer (strong LLM)  stream a cited Markdown answer
  → Reflector (fast LLM)      confidence + gaps + follow-ups → loop or finish
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Vanilla CSS, Motion, Zustand |
| **Backend** | Python 3.12, FastAPI, LangGraph |
| **LLM** | Groq Cloud — `llama-3.1-8b-instant` (plan/reflect) + `llama-3.3-70b-versatile` (synthesis) |
| **Search** | Serper (Google Search API) |
| **Extraction** | Trafilatura |
| **Re-ranking** | FlashRank (CPU-only, `ms-marco-MiniLM-L-12-v2`) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Infrastructure** | Docker Compose |

## 🚀 Quick Start

### Prerequisites

1. **Docker Desktop** — [Install Docker](https://docs.docker.com/desktop/)
2. **Node.js 20+** — only needed if running the frontend outside Docker
3. **API keys** (both have free tiers):
   - **Groq** — https://console.groq.com
   - **Serper** — https://serper.dev

### Setup

```bash
# 1. Clone
git clone <your-repo-url>
cd perplexity

# 2. Configure environment
cp backend/.env.example backend/.env     # then fill in GROQ_API_KEY, SERPER_API_KEY, AUTH_SECRET
cp frontend/.env.example frontend/.env

# Generate a strong AUTH_SECRET:
#   python -c "import secrets; print(secrets.token_hex(32))"

# 3. Bring up the whole stack (Postgres + Redis + Backend + Frontend)
docker compose up -d --build
```

> `docker compose` reads variables from a root `.env` file. Set at least
> `GROQ_API_KEY`, `SERPER_API_KEY`, and `AUTH_SECRET` there (or export them)
> before starting.

To run the frontend separately for development:

```bash
cd frontend
npm install
npm run dev
```

### Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register (email/password) |
| `POST` | `/api/auth/login` | — | Log in |
| `POST` | `/api/auth/google` | — | Google OAuth |
| `GET`  | `/api/auth/me` | ✅ | Current user |
| `POST` | `/api/research` | ✅ | Start research (SSE stream) |
| `GET`  | `/api/sessions` | ✅ | List recent sessions |
| `GET`  | `/api/sessions/{id}` | ✅ | Get session details |
| `GET`  | `/api/health` | — | Health check |

### SSE Events

```
event: phase        → {"phase": "planning", "message": "Breaking down..."}
event: sub_queries  → {"queries": ["q1", "q2", "q3"]}
event: sources      → {"sources": [{url, title, domain, favicon, snippet}], "replace": true}
event: token        → {"token": "word"}
event: follow_up    → {"suggestions": ["question1", "question2"]}
event: done         → {"session_id": "...", "total_sources": 8, "confidence": 0.89}
```

## 🔧 Configuration

Backend variables (see `backend/.env.example`):

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `GROQ_API_KEY` | Groq Cloud API key (**required**) | `gsk_...` |
| `GROQ_MODEL` | Fast model for planning/reflection | `llama-3.1-8b-instant` |
| `GROQ_SYNTH_MODEL` | Strong model for synthesis | `llama-3.3-70b-versatile` |
| `SERPER_API_KEY` | Serper search API key (**required**) | `...` |
| `AUTH_SECRET` | JWT signing secret (**set a random value**) | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) | `...apps.googleusercontent.com` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://agent:agent@postgres:5432/research_agent` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `RATE_LIMIT_PER_HOUR` | Research queries per user per hour | `30` |

Frontend variables (see `frontend/.env.example`) — note these are inlined at **build** time:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend | `http://localhost:8000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) | — |

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/       # LangGraph nodes (planner, researcher, synthesizer, reflector) + graph wiring
│   │   ├── services/     # Groq LLM, Serper search, Trafilatura scraper, FlashRank, Redis, auth
│   │   ├── models/       # Pydantic schemas, SQLAlchemy models
│   │   ├── utils/        # Text chunking, citation extraction
│   │   └── main.py       # FastAPI app: auth, rate limiting, SSE research endpoint
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/          # Next.js pages (home, research, login)
│       ├── components/   # SearchBar, SourceCards, StreamingAnswer, etc.
│       ├── hooks/        # useResearch (SSE), useAuth
│       └── stores/       # Zustand (recent searches)
├── docker-compose.yml    # Postgres + Redis + Backend + Frontend
└── README.md
```

## 📝 License

MIT
