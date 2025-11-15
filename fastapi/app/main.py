from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import get_pool, close_pool
from .routes import (
    jwt_auth,
    websocket,
    submissions,
    data,
    notifications,
    vouchers,
    feedback,
    forum,
    metrics,
    users,
    uploads,
    crud,
    submission_approval,
    admin,
    chat,
    certificates,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("[MAIN] FastAPI application starting up...")
    print("=" * 60)
    await get_pool()
    print("[MAIN] Database connection pool ready")
    print("[MAIN] Application ready to serve requests")
    yield
    # Shutdown
    print("[MAIN] Application shutting down...")
    await close_pool()
    print("[MAIN] Database connection pool closed")

app = FastAPI(title="Medicine Recycling API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# JWT Authentication
app.include_router(jwt_auth.router, prefix="/api/jwt", tags=["jwt-auth"])
app.include_router(jwt_auth.router, prefix="/api/auth", tags=["auth"])  # Alias for compatibility

# WebSocket
app.include_router(websocket.router, prefix="/api", tags=["websocket"])

# Other routes
app.include_router(data.router, prefix="/api", tags=["data"])
app.include_router(submissions.router, prefix="/api/ho-so-xu-ly", tags=["submissions"])
app.include_router(notifications.router, prefix="/api/thong-bao", tags=["notifications"])
app.include_router(vouchers.router, prefix="/api/voucher", tags=["vouchers"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(forum.router, prefix="/api/forum", tags=["forum"])
app.include_router(uploads.router, prefix="/api", tags=["uploads"])
app.include_router(metrics.router, prefix="/api", tags=["metrics"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(crud.router, prefix="/api/crud", tags=["crud"])
app.include_router(submission_approval.router, prefix="/api/submission-approval", tags=["submission-approval"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(certificates.router, prefix="/api/certificates", tags=["certificates"])

@app.get("/health")
async def health():
    print("[MAIN] Health check requested")
    return {"status": "ok"}

@app.get("/api/ping")
async def ping():
    print("[MAIN] Ping requested")
    return {"message": "pong"}
