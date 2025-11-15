# LangGraph Chatbot Service

AI-powered chatbot service for Remedi medicine exchange system using LangGraph.

## Features

- 🤖 **Intelligent Chat Support**: Answer questions about medicine submission, points, vouchers
- 💬 **Conversation Memory**: Maintains context across multiple messages
- 🔗 **FastAPI Integration**: Seamless connection with main backend
- 🚀 **Fast Inference**: Using Groq for quick responses (free tier available)

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   FastAPI    │─────▶│  LangGraph  │
│  (React)    │      │  (Backend)   │      │  (Chatbot)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                       │
                            │                       │
                     ┌──────▼───────┐        ┌──────▼──────┐
                     │  PostgreSQL  │        │   Groq API  │
                     └──────────────┘        └─────────────┘
```

## Tech Stack

- **LangGraph**: Workflow orchestration
- **LangChain**: LLM framework
- **Groq**: Fast LLM inference (llama-3.1-8b-instant)
- **FastAPI**: REST API framework
- **PostgreSQL**: Database for user context

## Setup

### 1. Get Groq API Key

1. Visit https://console.groq.com/
2. Sign up for free account
3. Create API key
4. Copy to `.env` file

### 2. Environment Variables

```bash
# Required
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Optional (auto-configured in docker-compose)
FASTAPI_URL=http://fastapi:8000
POSTGRES_DSN=postgresql://admin:admin123@postgres:5432/medicine_recycling
```

### 3. Run with Docker

```bash
# From project root
docker-compose up langgraph --build
```

### 4. Test Chatbot

```bash
# Health check
curl http://localhost:8001/health

# Send chat message
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Làm sao để nộp thuốc?",
    "user_id": "user-123",
    "session_id": "session-1"
  }'
```

## Project Structure

```
langgraph/
├── app/
│   └── main.py                 # FastAPI application
├── workflow/
│   ├── orchestrator.py         # LangGraph orchestrator
│   └── agents/
│       └── chat_support_agent.py  # Chat agent
├── utils/
│   ├── state.py               # Agent state definitions
│   └── tools.py               # Helper tools
├── factories/
│   └── llm_provider.py        # LLM factory (Groq, OpenAI, etc.)
├── requirements.txt
└── dockerfile
```

## Chatbot Capabilities

The chatbot can help users with:

✅ **Medicine Submission**
- How to submit medicine
- Accepted medicine types
- Submission process

✅ **Points & Rewards**
- How points are calculated
- Point balance inquiries
- Point redemption rules

✅ **Vouchers**
- Available vouchers
- How to redeem
- Voucher terms

✅ **Pharmacies**
- Partner pharmacy locations
- How to find nearby pharmacies
- Pharmacy information

✅ **General Support**
- Account questions
- Technical issues
- System guidance

## API Endpoints

### POST `/chat`
Process chat message

**Request:**
```json
{
  "message": "Làm sao để nộp thuốc?",
  "user_id": "uuid-here",
  "session_id": "session-1",
  "chat_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Response:**
```json
{
  "response": "Để nộp thuốc, bạn cần...",
  "session_id": "session-1",
  "status": "success"
}
```

### GET `/health`
Health check

**Response:**
```json
{
  "status": "healthy",
  "orchestrator": "initialized",
  "llm": "configured"
}
```

## Development

### Local Development

```bash
# Install dependencies
cd langgraph
pip install -r requirements.txt

# Set environment variables
export GROQ_API_KEY=your_key
export FASTAPI_URL=http://localhost:8000

# Run server
uvicorn app.main:app --reload --port 8001
```

### Testing

```python
# Python test
import httpx

response = httpx.post(
    "http://localhost:8001/chat",
    json={
        "message": "Tôi có bao nhiêu điểm?",
        "user_id": "user-123"
    }
)
print(response.json())
```

## Configuration

### LLM Models

You can switch between different LLM providers:

```python
# Groq (default - fast and free)
config = {
    "model_name": "llama-3.1-8b-instant",
    "api_key": os.getenv("GROQ_API_KEY")
}

# OpenAI
config = {
    "model_name": "gpt-4o-mini",
    "api_key": os.getenv("OPENAI_API_KEY")
}
```

### Memory & Context

- Conversations use `session_id` for memory
- Last 10 messages kept in context
- User context (points, submissions) fetched from database

## Troubleshooting

**Issue: Chatbot not responding**
- Check GROQ_API_KEY is set correctly
- Verify LangGraph service is running: `docker ps`
- Check logs: `docker logs 4de-langgraph-1`

**Issue: "LLM initialization failed"**
- Verify API key is valid
- Check internet connection to Groq API
- Try different model name

**Issue: Slow responses**
- Groq should be fast (~1-2s)
- Check network latency
- Consider reducing chat_history size

## Production Notes

- ✅ Add rate limiting
- ✅ Implement proper error handling
- ✅ Add monitoring/logging
- ✅ Use environment-specific configs
- ✅ Consider upgrading to paid LLM tier for better performance

## License

Part of Remedi Medicine Exchange System
