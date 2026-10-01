import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Any, cast
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.models import ChatRequest, ChatResponse, HealthResponse, SourceItem
from app.rag.retriever import retriever
from app.services.gemini_service import gemini_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("chatbot.api")

# Rate Limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_per_minute])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize RAG vector store and embeddings cache
    logger.info("Initializing knowledge base and embeddings...")
    try:
        retriever.initialize_embeddings()
    except Exception as e:
        logger.warning(f"Embeddings initialization skipped or encountered error: {e}")
    yield
    logger.info("Shutting down chatbot API service.")

tags_metadata = [
    {
        "name": "Health",
        "description": "System diagnostics, document index status, and Gemini API configuration checks.",
    },
    {
        "name": "Chat",
        "description": "Conversational endpoints grounded in vector knowledge base with Gemini 3.5 Flash Lite.",
    },
]

app = FastAPI(
    title="AI Chatbot Widget Backend API",
    version="1.0.0",
    description="""
### AI Chatbot Backend System with Vector RAG & Gemini 3.5 Flash Lite

Welcome to the **AI Chatbot API** documentation.

* **Vector RAG**: Embeddings-based semantic retrieval using `gemini-embedding-001` and cosine similarity.
* **Dual Modes**: Standard JSON responses (`/api/chat`) and real-time SSE streaming (`/api/chat/stream`).
* **Rate Limited**: Built-in rate limiting powered by SlowAPI.
    """,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, cast(Any, _rate_limit_exceeded_handler))

# CORS Middleware
origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True if "*" not in origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health & Readiness Check",
    description="Returns service health status, count of indexed RAG documents, and Gemini API configuration status."
)
async def health_check():
    return HealthResponse(
        status="healthy",
        documents_indexed=len(retriever.documents),
        gemini_configured=bool(settings.gemini_api_key),
        model=settings.gemini_model,
    )

@app.post(
    "/api/chat",
    response_model=ChatResponse,
    tags=["Chat"],
    summary="Standard Chat Completion",
    description="Retrieves relevant knowledge documents via cosine similarity and returns a grounded response."
)
@limiter.limit(settings.rate_limit_per_minute)
async def chat_endpoint(request: Request, chat_req: ChatRequest):
    """
    Standard chat endpoint returning full response grounded in knowledge.json.
    """
    try:
        # 1. RAG retrieval
        context_docs = retriever.retrieve(chat_req.message, top_k=3)
        
        # 2. Gemini generation with strict grounding instructions
        response_text, _ = gemini_service.generate_chat_response(
            message=chat_req.message,
            history=chat_req.history,
            context_docs=context_docs
        )
        
        return ChatResponse(
            response=response_text,
            sources=[]
        )
    except Exception as e:
        logger.error(f"Error handling chat request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )

@app.post(
    "/api/chat/stream",
    tags=["Chat"],
    summary="Streaming Chat Completion (SSE)",
    description="Streams tokens in real time using Server-Sent Events (`text/event-stream`). Emits incremental `message` token events and a `done` termination signal."
)
@limiter.limit(settings.rate_limit_per_minute)
async def chat_stream_endpoint(request: Request, chat_req: ChatRequest):
    """
    Streaming chat endpoint sending SSE tokens for typewriter real-time effect.
    """
    try:
        context_docs = retriever.retrieve(chat_req.message, top_k=3)

        async def sse_generator():
            # Stream tokens
            async for token in gemini_service.stream_chat_response(
                message=chat_req.message,
                history=chat_req.history,
                context_docs=context_docs
            ):
                payload = json.dumps({"token": token})
                yield f"event: message\ndata: {payload}\n\n"

            yield "event: done\ndata: [DONE]\n\n"

        return StreamingResponse(
            sse_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        logger.error(f"Error handling streaming request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stream response: {str(e)}"
        )
