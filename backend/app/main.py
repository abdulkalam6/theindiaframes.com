"""
FastAPI application entrypoint for The India Frames.
"""

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.cart import router as cart_router
from app.api.v1.catalogue import router as catalogue_router
from app.api.v1.wholesale import router as wholesale_router
from app.core.config import settings
from app.core.responses import ErrorBody, ErrorResponse, Meta
from app.database.indexes import create_indexes
from app.database.session import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: database lifecycle initialization
    await db_manager.connect()
    if db_manager.db is not None:
        await create_indexes(db_manager.db)
    yield
    # Shutdown: database cleanup
    await db_manager.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(cart_router, prefix=settings.API_V1_PREFIX)
app.include_router(catalogue_router, prefix=settings.API_V1_PREFIX)
app.include_router(wholesale_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe: returns status 200 if FastAPI process is alive."""
    return {
        "status": "healthy",
        "service": "the-india-frames-backend",
        "version": settings.VERSION,
    }


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness probe: checks backend dependencies including database.
    Explicitly reports if running in local mode without MongoDB.
    """
    db_connected = await db_manager.ping()
    if not settings.MONGODB_URI:
        return {
            "status": "ready",
            "database": "unconfigured_local_mode",
            "details": "Running locally without MONGODB_URI. Normal for local Phase 0 development.",
        }

    if db_connected:
        return {
            "status": "ready",
            "database": "connected",
        }
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "details": "Configured database connection check failed.",
            },
        )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorBody(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred.",
            ),
            meta=Meta(request_id=request_id),
        ).model_dump(),
    )
