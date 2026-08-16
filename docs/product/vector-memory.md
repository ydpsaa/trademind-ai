# Stage 17 - Vector Memory

Vector Memory turns each reviewed journal trade into a user-scoped semantic memory. TradeMind can retrieve similar historical trades and use them as context for AI Review without inventing market data.

## Free local setup

Vector generation uses Ollama locally:

```bash
ollama pull nomic-embed-text
```

Local environment variables:

```bash
VECTOR_MEMORY_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

No API key is required. Local embeddings have an estimated provider cost of zero.

## Data flow

1. The user explicitly generates or regenerates an AI Review.
2. Trade, journal, psychology, strategy, and checklist fields are normalized into a compact memory document.
3. Ollama creates an embedding locally.
4. The embedding is stored in `trade_embeddings` under the authenticated user ID.
5. The similarity function retrieves only the current user's matching memories because row-level data isolation remains active.
6. Similar memories are supplied to AI Review as historical journal context.

The current schema uses `vector(1536)`. The local model returns 768 dimensions, so the application pads the remaining dimensions with zeros. This preserves cosine similarity while keeping the existing database schema compatible.

## Safety and limitations

- Vector Memory never runs on page load; it runs only with an explicit review action.
- Failure to create or retrieve memory does not block AI Review or the local rules fallback.
- Similarity is contextual, not proof that one setup will repeat another result.
- Vercel cannot reach a Mac-local Ollama instance at `localhost:11434`. Production needs a securely hosted embedding endpoint before Vector Memory can run there.
- No broker, market data, or execution API is connected.
