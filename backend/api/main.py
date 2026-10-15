"""
backend/api/main.py - FastAPI App Initialisation (Dev 3 * Phase 2)

Ported from traceroot/backend/main.py:
  - CORS middleware pattern (permissive for local dev, env-configurable for prod)
  - Health check route
  - Startup/shutdown lifecycle hooks

Run: uvicorn backend.api.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CORS - permissive for local hackathon dev.
# Set CORS_ALLOWED_ORIGINS env var (comma-separated) to lock down in prod.
# Ported pattern from traceroot get_cors_allowed_origins().
# ---------------------------------------------------------------------------

def _cors_origins() -> list[str]:
    env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if env:
        return [o.strip() for o in env.split(",") if o.strip()]
    logger.warning("CORS_ALLOWED_ORIGINS not set - allowing all localhost origins")
    return [
        "http://localhost:5173",   # Vite default (Dev 4)
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ChainRoute API starting up")
    logger.info("CORS origins: %s", _cors_origins())
    yield
    logger.info("ChainRoute API shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


app = FastAPI(
    title="ChainRoute - Dependency Migration API",
    description=(
        "Two-ledger dependency migration engine. "
        "Fact ledger = verified sandbox execution. "
        "Claim ledger = AI risk reasoning (Gemma 4)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "chainroute-api", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
