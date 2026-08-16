# Local AI With Ollama

TradeMind AI can run AI Trade Review locally with Ollama. This is the free local AI path for development and local testing.

## Local Env

Use ignored local environment files only:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

Do not commit `.env.local`.

## Behavior

- Ollama runs on the local machine.
- No API key is required.
- AI usage cost is logged as `0`.
- If Ollama is unavailable, the review falls back to the local rules engine.
- Production on Vercel cannot call `localhost:11434` on a developer machine.

## Recommended Local Model

`qwen2.5:3b` is the default because it follows structured JSON instructions while keeping review latency practical on a local CPU. Larger models can be configured on machines with more memory and acceleration.

Install it locally:

```bash
ollama pull qwen2.5:3b
```

## Production Note

For production AI, use a hosted AI provider or host Ollama on a dedicated server. Do not expose local machine endpoints publicly.
