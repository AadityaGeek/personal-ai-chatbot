import json
import logging
import hashlib
import re
from pathlib import Path
from typing import Any
import numpy as np

from app.config import settings

logger = logging.getLogger("chatbot.rag")


class KnowledgeRetriever:
    def __init__(
        self,
        data_dir: Path = settings.data_dir,
        knowledge_path: Path = settings.knowledge_path,
        cache_path: Path = settings.cache_path,
    ):
        self.data_dir = data_dir
        self.knowledge_path = knowledge_path
        self.cache_path = cache_path
        self.documents: list[dict[str, Any]] = []
        self.embeddings: np.ndarray | None = None
        self.norm_embeddings: np.ndarray | None = None
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

    def _chunk_text(self, text: str, max_chars: int = 1200) -> list[str]:
        text = text.strip()
        if not text:
            return []
        if len(text) <= max_chars:
            return [text]

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current_chunk: list[str] = []
        current_len = 0

        for para in paragraphs:
            para_len = len(para)
            if current_len + para_len > max_chars and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
                current_len = 0

            # If a single paragraph is larger than max_chars, split on lines or length
            if para_len > max_chars:
                lines = para.split("\n")
                sub_chunk: list[str] = []
                sub_len = 0
                for line in lines:
                    if sub_len + len(line) > max_chars and sub_chunk:
                        chunks.append("\n".join(sub_chunk))
                        sub_chunk = []
                        sub_len = 0
                    sub_chunk.append(line)
                    sub_len += len(line) + 1
                if sub_chunk:
                    chunks.append("\n".join(sub_chunk))
            else:
                current_chunk.append(para)
                current_len += para_len + 2

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text]

    def _parse_markdown(self, file_path: Path) -> list[dict[str, Any]]:
        docs = []
        try:
            text = file_path.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Error reading markdown file {file_path}: {e}")
            return docs

        sections = re.split(r"(?m)^(#{1,4}\s+.+)$", text)
        stem = file_path.stem
        category = stem.replace("_", " ").replace("-", " ").title()

        if len(sections) <= 1:
            chunks = self._chunk_text(text)
            for i, chunk in enumerate(chunks):
                suffix = f" (Part {i+1})" if len(chunks) > 1 else ""
                docs.append({
                    "id": f"{stem}-chunk-{i+1}",
                    "title": f"{category}{suffix}",
                    "category": category,
                    "content": chunk,
                    "url": f"local://{file_path.name}",
                })
            return docs

        # First section before the first heading (intro)
        if sections[0].strip():
            intro_chunks = self._chunk_text(sections[0].strip())
            for i, chunk in enumerate(intro_chunks):
                docs.append({
                    "id": f"{stem}-intro-{i+1}",
                    "title": f"{category} - Overview",
                    "category": category,
                    "content": chunk,
                    "url": f"local://{file_path.name}",
                })

        # Process heading + content pairs
        for i in range(1, len(sections), 2):
            heading_line = sections[i].strip()
            heading_text = re.sub(r"^#{1,4}\s*", "", heading_line).strip()
            section_content = sections[i + 1].strip() if i + 1 < len(sections) else ""
            if not section_content:
                continue

            chunks = self._chunk_text(section_content)
            slug = re.sub(r"[^a-zA-Z0-9]+", "-", heading_text).strip("-").lower()
            for j, chunk in enumerate(chunks):
                suffix = f" (Part {j+1})" if len(chunks) > 1 else ""
                docs.append({
                    "id": f"{stem}-{slug}-{j+1}",
                    "title": f"{heading_text}{suffix}",
                    "category": category,
                    "content": chunk,
                    "url": f"local://{file_path.name}",
                })

        return docs

    def _parse_text(self, file_path: Path) -> list[dict[str, Any]]:
        docs = []
        try:
            text = file_path.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"Error reading text file {file_path}: {e}")
            return docs

        stem = file_path.stem
        title = stem.replace("_", " ").replace("-", " ").title()
        chunks = self._chunk_text(text)
        for i, chunk in enumerate(chunks):
            suffix = f" (Part {i+1})" if len(chunks) > 1 else ""
            docs.append({
                "id": f"{stem}-chunk-{i+1}",
                "title": f"{title}{suffix}",
                "category": title,
                "content": chunk,
                "url": f"local://{file_path.name}",
            })
        return docs

    def _parse_json(self, file_path: Path) -> list[dict[str, Any]]:
        if file_path.name == self.cache_path.name:
            return []
        docs = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        doc_id = item.get("id") or f"{file_path.stem}-{len(docs)+1}"
                        title = item.get("title") or item.get("question") or f"{file_path.stem} Item {len(docs)+1}"
                        category = item.get("category") or file_path.stem.title()
                        content = item.get("content") or item.get("answer") or item.get("text") or ""
                        if content:
                            docs.append({
                                "id": str(doc_id),
                                "title": str(title),
                                "category": str(category),
                                "content": str(content),
                                "url": item.get("url", f"local://{file_path.name}"),
                            })
            elif isinstance(data, dict):
                if "documents" in data and isinstance(data["documents"], list):
                    for item in data["documents"]:
                        if isinstance(item, dict) and item.get("content"):
                            docs.append({
                                "id": str(item.get("id", f"{file_path.stem}-{len(docs)+1}")),
                                "title": str(item.get("title", f"{file_path.stem} Item")),
                                "category": str(item.get("category", file_path.stem.title())),
                                "content": str(item.get("content")),
                                "url": item.get("url", f"local://{file_path.name}"),
                            })
                else:
                    for key, val in data.items():
                        if isinstance(val, (str, dict)):
                            content = val if isinstance(val, str) else json.dumps(val)
                            docs.append({
                                "id": f"{file_path.stem}-{re.sub(r'[^a-zA-Z0-9]+', '-', key).lower()}",
                                "title": key,
                                "category": file_path.stem.title(),
                                "content": content,
                                "url": f"local://{file_path.name}",
                            })
        except Exception as e:
            logger.error(f"Error reading JSON file {file_path}: {e}")
        return docs

    def _load_knowledge(self):
        loaded_docs: list[dict[str, Any]] = []
        loaded_files: list[str] = []

        if not self.data_dir.exists():
            logger.warning(f"Data directory {self.data_dir} not found.")
            if self.knowledge_path.exists():
                loaded_docs.extend(self._parse_json(self.knowledge_path))
                loaded_files.append(self.knowledge_path.name)
            self.documents = loaded_docs
            return

        # Scan data directory for all supported file formats
        sorted_files = sorted(self.data_dir.iterdir(), key=lambda p: p.name.lower())
        for file_path in sorted_files:
            if not file_path.is_file():
                continue
            if file_path.name == self.cache_path.name:
                continue

            suffix = file_path.suffix.lower()
            file_docs: list[dict[str, Any]] = []
            if suffix == ".json":
                file_docs = self._parse_json(file_path)
            elif suffix in (".md", ".markdown"):
                file_docs = self._parse_markdown(file_path)
            elif suffix == ".txt":
                file_docs = self._parse_text(file_path)

            if file_docs:
                loaded_docs.extend(file_docs)
                loaded_files.append(file_path.name)

        self.documents = loaded_docs
        logger.info(
            f"Loaded {len(self.documents)} knowledge documents across {len(loaded_files)} files: {', '.join(loaded_files)}"
        )

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
                        self._update_normalized_embeddings()
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

                if hasattr(result, "embeddings") and result.embeddings:
                    values = result.embeddings[0].values
                elif hasattr(result, "embedding") and result.embedding:
                    values = result.embedding.values
                else:
                    values = list(result.values) if hasattr(result, "values") else []
                computed_embeddings.append(values)

            self.embeddings = np.array(computed_embeddings, dtype=np.float32)
            self._update_normalized_embeddings()

            # Save cache
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, "w", encoding="utf-8") as f:
                json.dump({"hash": content_hash, "embeddings": self.embeddings.tolist(), "model": model_name}, f)
            logger.info("Successfully cached embeddings to disk.")
        except Exception as e:
            logger.error(f"Failed to compute embeddings: {e}. Falling back to keyword search.")
            self.embeddings = None
            self.norm_embeddings = None

    def _update_normalized_embeddings(self):
        if self.embeddings is not None and len(self.embeddings) > 0:
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            self.norm_embeddings = self.embeddings / norms
        else:
            self.norm_embeddings = None

    def _keyword_search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        stop_words = {
            "how", "to", "do", "i", "on", "my", "the", "a", "an", "is", "in", "it",
            "this", "can", "and", "for", "with", "what", "are", "of", "about", "your",
            "does", "tell", "me", "give", "please", "why", "when", "where", "who", "which"
        }
        words = [w.strip("?,.!:;\"'") for w in query.lower().split()]
        query_words = [w for w in words if w and w not in stop_words and len(w) > 2]
        if not query_words:
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

                # Compute cosine similarities via pre-normalized dot product
                query_norm = float(np.linalg.norm(query_vec))
                query_vec_norm = query_vec / (query_norm + 1e-10) if query_norm > 0 else query_vec

                if self.norm_embeddings is not None and len(self.norm_embeddings) == len(self.documents):
                    scores = np.dot(self.norm_embeddings, query_vec_norm)
                else:
                    norm_docs = np.linalg.norm(self.embeddings, axis=1)
                    scores = np.dot(self.embeddings, query_vec) / (norm_docs * (query_norm + 1e-10))

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
