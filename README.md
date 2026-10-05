# Production-Ready AI Chatbot Widget System

A standalone, embeddable AI Chatbot widget system with a high-performance **FastAPI** backend and a sleek, glassmorphic **React + Tailwind CSS** frontend.

Powered by **Google Gemini 3.5 Flash Lite** with temperature `0.2` and strictly grounded in a local **Vector RAG (Retrieval-Augmented Generation)** knowledge system (`data/knowledge.json`) to eliminate hallucinations and quickly answer questions with similar meanings using vector embeddings.

---

## 🌟 Key Features

- **Website & Documentation Assistant**: The chatbot is specifically designed to answer all questions about itself, its architecture, embedding instructions, features, and customization.
- **Strict Secrecy & Security Guardrails**:
  - Automatically refuses and protects against jailbreaks, prompt extraction, or requests to reveal internal system instructions, proprietary reasoning flows, and developer keys.
- **Fast Vector Embeddings & Semantic Retrieval**:
  - In-memory cosine similarity search using Google `gemini-embedding-001` embeddings.
  - Automatically understands semantically similar questions (e.g., *"how do I put this on my site?"* and *"can I embed this in React?"* match the same embedding guide).
  - Pure NumPy & Python math (zero C++ compilation or SQLite version issues on Windows).
  - Fast cold start and automatic SHA-256 cache invalidation (`data/embeddings_cache.json`).
- **Full-Vertical Glassmorphic Drawer**:
  - Spans full vertical height (`h-full`/`h-[100dvh]`) for optimal reading and typing.
  - Bottom launcher bubble automatically hides when the chat window opens.
  - Smooth spring open/close transitions powered by **Framer Motion**.
- **Real-Time Streaming**:
  - Server-Sent Events (SSE) streaming (`POST /api/chat/stream`) for instant typewriter token display.
  - Toggle between streaming and standard JSON batch mode.
- **Markdown & Interactive UI**:
  - Render clean Markdown (bullet lists, bold text, code blocks) without distracting source tag noise.
  - Standardized fallback message when queries are outside knowledge scope: *"I'm sorry, but I do not have information about that in my knowledge base. Please check our documentation or contact support for further assistance."*
  - Automatic offline detection and graceful fallback banner with instant one-click retry.
  - 3 Quick-prompt starter chips for instant inquiries.
  - Auto-scroll to bottom, copy response action, inline retry button, and clear history.
  - Rate limiting via **SlowAPI** and configurable CORS middleware.

---

## 📁 Project Structure

```
ChatBot/
├── backend/
│   ├── .env.example              # Environment variables template
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Uvicorn runner
│   ├── app/
│   │   ├── config.py             # Settings & CORS configuration
│   │   ├── main.py               # FastAPI app, SlowAPI limiter, chat endpoints
│   │   ├── models.py             # Pydantic models (ChatRequest, History, etc.)
│   │   ├── rag/
│   │   │   └── retriever.py      # Vector cosine similarity index & cache
│   │   └── services/
│   │       └── gemini_service.py # Gemini 3.5 Flash Lite integration & guardrails
│   └── data/
│       ├── knowledge.json        # Chatbot documentation & knowledge base
│       └── embeddings_cache.json # Auto-generated vector cache
├── frontend/
│   ├── index.html                # HTML entry with Inter font & dark theme
│   ├── package.json
│   ├── vite.config.ts            # Vite config with Tailwind v4 & /api proxy
│   └── src/
│       ├── App.tsx               # Chatbot showcase website & embed instructions
│       ├── index.css             # Glassmorphic tokens & markdown styles
│       ├── components/
│       │   ├── ChatWidget.tsx    # Floating launcher bubble (hidden when open)
│       │   ├── ChatWindow.tsx    # Full-vertical drawer with messages & input
│       │   ├── ChatHeader.tsx    # Bot identity, live status, stream toggle, clear button
│       │   ├── ChatMessage.tsx   # Markdown renderer with clean responses, offline notice & retry
│       │   ├── QuickPrompts.tsx  # 3 Starter chips focused on the chatbot
│       │   └── TypingIndicator.tsx# Bouncing glowing thinking state
│       ├── services/
│       │   └── api.ts            # Streaming and batch API client
│       └── types/
│           └── chat.ts           # TypeScript interfaces
└── README.md
```

---

## 🚀 Quickstart & Setup Instructions

### 1. Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Activate the virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - On Windows (Command Prompt):
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - On Linux/macOS:
     ```bash
     source .venv/bin/activate
     ```

3. **Install dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure your Gemini API Key**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Paste your key from [Google AI Studio](https://aistudio.google.com/):
     ```env
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     ```

5. **Run the backend server**:
   ```bash
   python run.py
   # Or directly with uvicorn:
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

The backend runs on `http://127.0.0.1:8000` (Swagger docs available at `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup (React + Vite)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

---

## 🧩 Embedding the Chatbot in Any React Website

To use this chatbot widget on your own website:

1. Copy `frontend/src/components/`, `types/`, and `services/` into your React project.
2. In your root page or layout (e.g. `App.tsx`), mount the widget:
   ```tsx
   import { ChatWidget } from './components/ChatWidget';

   export function Website() {
     return (
       <div>
         <YourExistingWebsiteContent />

         {/* Full-vertical drawer & launcher bubble */}
         <ChatWidget defaultOpen={false} />
       </div>
     );
   }
   ```
3. Set your backend URL in `src/services/api.ts` if not using the Vite `/api` proxy.

---

## 🔒 Security & Prompt Protection Policy

The system instruction explicitly guards against:
- Leaking system prompts, internal hidden rules, or reasoning flows.
- Exposing API keys or backend server configurations.
- Prompt injection and jailbreak attacks.

---

## 📚 Customizing Knowledge Base (`data/knowledge.json`)

To update or expand what the chatbot knows:

```json
[
  {
    "id": "my-topic",
    "title": "Topic Title",
    "category": "Documentation",
    "content": "Detailed facts and guidelines. Include clean markdown links like [Website](https://your-domain.com).",
    "url": "https://your-domain.com/docs/my-topic"
  }
]
```

The backend computes a SHA-256 hash of `knowledge.json` and automatically invalidates and regenerates vector embeddings on startup.
