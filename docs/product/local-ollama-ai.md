# Local AI With Ollama

TradeMind AI can run AI Trade Review locally with Ollama. This is the free local AI path for development and local testing.

## Local Env

Use ignored local environment files only:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

Do not commit `.env.local`.

## Behavior

- Ollama runs on the local machine.
- No API key is required.
- AI usage cost is logged as `0`.
- If Ollama is unavailable, the review falls back to the local rules engine.
- Production on Vercel cannot call `localhost:11434` on a developer machine.

## Recommended Local Model

`qwen2.5:7b` is the default because it is practical for local machines and generally follows structured JSON instructions well enough for review generation.

Install it locally:

```bash
ollama pull qwen2.5:7b
```

## Production Note

For production AI, use a hosted AI provider or host Ollama on a dedicated server. Do not expose local machine endpoints publicly.
