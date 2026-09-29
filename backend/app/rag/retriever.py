import json
import logging
import hashlib
from pathlib import Path
from typing import Any
import numpy as np

from app.config import settings

logger = logging.getLogger("chatbot.rag")

class KnowledgeRetriever:
    def __init__(self, knowledge_path: Path = settings.knowledge_path, cache_path: Path = settings.cache_path):
        self.knowledge_path = knowledge_path
        self.cache_path = cache_path
        self.documents: list[dict[str, Any]] = []
        self.embeddings: np.ndarray | None = None
        self._genai_client = None
        self._load_knowledge()

    def _get_client(self):
        if self._genai_client is None:
            if not settings.gemini_api_key:
                return None
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=settings.gemini_api_key)
            except Exception as e:
                logger.warning(f"Could not initialize google-genai client: {e}")
                self._genai_client = None
        return self._genai_client

    def _compute_hash(self, content_str: str) -> str:
        return hashlib.sha256(content_str.encode("utf-8")).hexdigest()

    def _load_knowledge(self):
        if not self.knowledge_path.exists():
            logger.warning(f"Knowledge file {self.knowledge_path} not found. Creating empty list.")
            self.documents = []
            return

        try:
            with open(self.knowledge_path, "r", encoding="utf-8") as f:
                self.documents = json.load(f)
            logger.info(f"Loaded {len(self.documents)} knowledge documents.")
        except Exception as e:
            logger.error(f"Error reading knowledge.json: {e}")
            self.documents = []

    def _document_to_text(self, doc: dict[str, Any]) -> str:
        title = doc.get("title", "")
        category = doc.get("category", "")
        content = doc.get("content", "")
        return f"Title: {title}\nCategory: {category}\nContent: {content}"

    def initialize_embeddings(self, force_refresh: bool = False):
        if not self.documents:
            return

        raw_texts = [self._document_to_text(doc) for doc in self.documents]
        content_hash = self._compute_hash(f"{settings.embedding_model}:{json.dumps(raw_texts)}")

        # Check cache
        if not force_refresh and self.cache_path.exists():
            try:
                with open(self.cache_path, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                    if cache_data.get("hash") == content_hash and "embeddings" in cache_data:
                        self.embeddings = np.array(cache_data["embeddings"], dtype=np.float32)
                        logger.info(f"Loaded {len(self.embeddings)} cached embeddings.")
                        return
            except Exception as e:
                logger.warning(f"Failed to read embeddings cache: {e}")

        # Compute new embeddings via Gemini API
        client = self._get_client()
        if not client:
            logger.warning("No Gemini API key available to compute vector embeddings. RAG will use keyword fallback.")
            return

        model_name = settings.embedding_model
        logger.info(f"Generating embeddings for {len(raw_texts)} documents using {model_name}...")
        try:
            computed_embeddings = []
            for text in raw_texts:
                try:
                    result = client.models.embed_content(
                        model=model_name,
                        contents=text,
                    )
                except Exception as model_err:
                    if "404" in str(model_err) and model_name != "gemini-embedding-001":
                        logger.warning(
                            f"Embedding model '{model_name}' returned 404. Falling back to 'gemini-embedding-001'."
                        )
                        model_name = "gemini-embedding-001"
                        result = client.models.embed_content(
                            model=model_name,
                            contents=text,
                        )
                    else:
                        raise model_err

                # handle both single and list output
                if hasattr(result, "embeddings") and result.embeddings:
                    values = result.embeddings[0].values
                elif hasattr(result, "embedding") and result.embedding:
                    values = result.embedding.values
                else:
                    values = list(result.values) if hasattr(result, "values") else []
                computed_embeddings.append(values)

            self.embeddings = np.array(computed_embeddings, dtype=np.float32)

            # Save cache
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, "w", encoding="utf-8") as f:
                json.dump({"hash": content_hash, "embeddings": self.embeddings.tolist(), "model": model_name}, f)
            logger.info("Successfully cached embeddings to disk.")
        except Exception as e:
            logger.error(f"Failed to compute embeddings: {e}. Falling back to keyword search.")
            self.embeddings = None

    def _keyword_search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        stop_words = {
            "how", "to", "do", "i", "on", "my", "the", "a", "an", "is", "in", "it", 
            "this", "can", "and", "for", "with", "what", "are", "of", "about", "your", 
            "does", "tell", "me", "give", "please", "why", "when", "where", "who", "which"
        }
        words = [w.strip("?,.!:;\"'") for w in query.lower().split()]
        query_words = [w for w in words if w and w not in stop_words and len(w) > 2]
        if not query_words:
            # If only stop words or very short words were provided, no meaningful knowledge match
            return []

        scored_docs = []
        for doc in self.documents:
            title = doc.get("title", "").lower()
            category = doc.get("category", "").lower()
            content = doc.get("content", "").lower()
            
            score = 0
            for word in query_words:
                if word in title:
                    score += 5
                if word in category:
                    score += 3
                if word in content:
                    score += 1
            if score > 0:
                scored_docs.append((score, doc))
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:top_k]]

    def retrieve(self, query: str, top_k: int = 3, min_similarity: float = 0.35) -> list[dict[str, Any]]:
        if not self.documents:
            return []

        # If we have vector embeddings and API client
        client = self._get_client()
        if client and self.embeddings is not None and len(self.embeddings) == len(self.documents):
            try:
                try:
                    res = client.models.embed_content(
                        model=settings.embedding_model,
                        contents=query,
                    )
                except Exception as model_err:
                    if "404" in str(model_err) and settings.embedding_model != "gemini-embedding-001":
                        res = client.models.embed_content(
                            model="gemini-embedding-001",
                            contents=query,
                        )
                    else:
                        raise model_err

                if hasattr(res, "embeddings") and res.embeddings:
                    query_vec = np.array(res.embeddings[0].values, dtype=np.float32)
                elif hasattr(res, "embedding") and res.embedding:
                    query_vec = np.array(res.embedding.values, dtype=np.float32)
                else:
                    query_vec = np.array(res.values, dtype=np.float32)

                # Compute cosine similarities
                norm_docs = np.linalg.norm(self.embeddings, axis=1)
                norm_query = np.linalg.norm(query_vec)
                scores = np.dot(self.embeddings, query_vec) / (norm_docs * norm_query + 1e-10)

                # Rank
                ranked_indices = np.argsort(scores)[::-1]
                results = []
                for idx in ranked_indices[:top_k]:
                    if scores[idx] >= min_similarity:
                        doc_copy = dict(self.documents[idx])
                        doc_copy["_score"] = float(scores[idx])
                        results.append(doc_copy)

                if results:
                    return results
            except Exception as e:
                logger.warning(f"Vector search failed ({e}), falling back to keyword search.")

        # Fallback to keyword search
        return self._keyword_search(query, top_k=top_k)

retriever = KnowledgeRetriever()
