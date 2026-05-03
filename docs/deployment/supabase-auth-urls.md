# Supabase Auth URL Setup

After deploying TradeMind AI to Vercel, update Supabase authentication URLs so email/password auth and redirects work in production.

Open:

Supabase Dashboard -> Authentication -> URL Configuration

## Site URL

Set the Site URL to the production deployment URL:

```text
https://trademind-ai-mu.vercel.app
```

If you later add a custom domain, replace this with the custom domain.

## Redirect URLs

Add:

```text
https://trademind-ai-mu.vercel.app/**
http://localhost:3000
http://localhost:3000/**
```

When a custom domain is added, also add:

```text
https://your-custom-domain.com/**
```

## Notes

- Do not remove localhost redirect URLs while local development is active.
- Keep production and preview URLs explicit so Supabase can redirect users safely.
- If login works locally but fails in production, this URL configuration is the first thing to check.
