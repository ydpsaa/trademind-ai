# Vercel Deployment Checklist

Use this checklist when deploying TradeMind AI to Vercel.

## 1. Push Code To GitHub

- Confirm `.env.local` is not committed.
- Run `npm run lint`.
- Run `npm run build`.
- Push the production branch to GitHub.

## 2. Create Or Import The Project In Vercel

- Open Vercel Dashboard.
- Choose **Add New Project**.
- Import the TradeMind AI GitHub repository.
- Select framework preset: **Next.js**.

## 3. Configure Build Settings

Use the default Next.js settings unless Vercel asks for overrides.

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: Next.js default
- Development command: `npm run dev`

## 4. Add Environment Variables

Add these in Vercel Project Settings -> Environment Variables.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `XAI_API_KEY`
- `XAI_MODEL`
- `MARKET_DATA_API_KEY`

Security notes:

- Never put service role keys or AI keys in `NEXT_PUBLIC_` variables.
- Do not paste secrets into README, `.env.example`, or client components.
- Scope production secrets to Production only unless Preview needs them.

## 5. Deploy

- Click **Deploy**.
- Wait for the production build to finish.
- Open the generated Vercel URL.

## 6. Test Production URL

Check:

- `/login`
- `/register`
- `/dashboard`
- `/journal`
- `/calendar`
- `/strategies`
- `/backtest-lab`
- `/market-scanner`
- `/signals`
- `/connections`

## 7. Configure Supabase Auth URLs

After deployment, update Supabase Auth URL settings. See:

- `docs/deployment/supabase-auth-urls.md`

## 8. Add Custom Domain Later

After the first production deployment is stable:

- Add the custom domain in Vercel.
- Update Supabase Site URL and Redirect URLs with the custom domain.
- Retest login, register, logout, and protected-route redirects.
