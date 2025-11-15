"""
LangGraph FastAPI Service for Remedi Chatbot
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from workflow.orchestrator import ChatbotOrchestrator

app = FastAPI(
    title="Remedi LangGraph Chatbot",
    description="AI Chatbot service using LangGraph",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize orchestrator
orchestrator = None


@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator on startup"""
    global orchestrator
    try:
        orchestrator = ChatbotOrchestrator()
        orchestrator.build_graph()
        print("✅ LangGraph Chatbot initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize chatbot: {e}")
        raise


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = "default"
    chat_history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str
    session_id: str
    status: str = "success"


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Remedi LangGraph Chatbot",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "orchestrator": "initialized" if orchestrator else "not initialized",
        "llm": "configured" if orchestrator and orchestrator.llm else "not configured"
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process chat message
    
    Args:
        request: ChatRequest with message and optional user context
    
    Returns:
        ChatResponse with AI reply
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    try:
        # Invoke chatbot
        response = orchestrator.invoke(
            question=request.message,
            user_id=request.user_id,
            session_id=request.session_id or "default",
            chat_history=request.chat_history
        )
        
        return ChatResponse(
            response=response,
            session_id=request.session_id or "default",
            status="success"
        )
    
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


@app.post("/invoke")
async def invoke(payload: dict, background: BackgroundTasks):
    """Legacy invoke endpoint for compatibility"""
    try:
        message = payload.get("message", "")
        user_id = payload.get("user_id")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        response = orchestrator.invoke(
            question=message,
            user_id=user_id,
            session_id=payload.get("session_id", "default")
        )
        
        return {
            "status": "success",
            "response": response,
            "payload": payload
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

