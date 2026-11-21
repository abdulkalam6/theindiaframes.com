"""
FastAPI application entrypoint for The India Frames.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.cart import router as cart_router
from app.api.v1.catalogue import router as catalogue_router
from app.api.v1.enquiry import router as enquiry_router
from app.api.v1.wholesale import router as wholesale_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.responses import ErrorBody, ErrorResponse, Meta
from app.core.security_middleware import rate_limiter
from app.database.indexes import create_indexes
from app.database.session import db_manager

configure_logging(settings.LOG_LEVEL)
access_logger = logging.getLogger("the_india_frames.access")

RATE_LIMITED_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/google",
    "/api/v1/wholesale/applications",
}


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
    start_ts = time.perf_counter()

    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )

    # Rate limit sensitive authentication and application endpoints
    if (
        settings.RATE_LIMIT_ENABLED
        and request.method == "POST"
        and request.url.path in RATE_LIMITED_PATHS
    ):
        allowed, retry_after = rate_limiter.check(
            bucket=request.url.path,
            client_ip=client_ip,
            max_requests=settings.RATE_LIMIT_AUTH_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
        )
        if not allowed:
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=ErrorResponse(
                    error=ErrorBody(
                        code="RATE_LIMIT_EXCEEDED",
                        message="Too many requests. Please wait and try again.",
                    ),
                    meta=Meta(request_id=request_id),
                ).model_dump(),
            )
            response.headers["Retry-After"] = str(retry_after)
            response.headers["X-Request-ID"] = request_id
            return response

    response = await call_next(request)

    # Security headers on all API responses
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)
    access_logger.info(
        "%s %s -> %s",
        request.method,
        request.url.path,
        response.status_code,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": client_ip,
        },
    )
    return response


# Include API Routers
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(billing_router, prefix=settings.API_V1_PREFIX)
app.include_router(cart_router, prefix=settings.API_V1_PREFIX)
app.include_router(catalogue_router, prefix=settings.API_V1_PREFIX)
app.include_router(enquiry_router, prefix=settings.API_V1_PREFIX)
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
