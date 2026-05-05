# Deployment Checklist

## Required Environment

Required variables:

```env
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=replace-with-at-least-32-characters
OPENAI_API_KEY=required-for-tts
BUILT_IN_FORGE_API_URL=https://your-forge-endpoint/
BUILT_IN_FORGE_API_KEY=forge-api-key
VITE_APP_ID=your-app-id
```

Optional variables:

```env
PORT=3000
HOST=0.0.0.0
OAUTH_SERVER_URL=https://your-oauth-server/
OWNER_OPEN_ID=oauth-owner-id
```

Notes:

- `DATABASE_URL` is required.
- `JWT_SECRET` is required and should be at least 32 characters.
- `OPENAI_API_KEY` is required for TTS.
- `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are required for voice and AI features.
- `OAUTH_SERVER_URL` is optional unless OAuth login is enabled.
- `OWNER_OPEN_ID` is optional and only used for owner/admin sync behavior.
- `VITE_APP_ID` is required by the frontend and OAuth-related flows.
- WARNING: Set `NODE_ENV=production` and deploy behind HTTPS.
- Cookies are only marked `Secure` in production mode.

## Build And Start

Install dependencies:

```bash
pnpm install
```

Build production assets:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

## Database Migration

Run migrations before first deploy and before any release that changes schema:

```bash
pnpm exec drizzle-kit migrate
```

Note: `drizzle/0004_saved_global_folders.sql.bak` is a retained draft copy only. Do not apply it manually; `drizzle/meta/_journal.json` tracks `0004_tense_catseye` as the real migration for that step.

If you need to generate a migration from schema changes first:

```bash
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

## Running with PM2

```bash
pnpm build
pnpm exec drizzle-kit migrate
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Release Verification

- Confirm `pnpm check` passes.
- Confirm `pnpm test` passes.
- Confirm `pnpm build` completes successfully.
- Confirm the production server starts with `pnpm start`.
- Confirm MySQL is reachable from the deployment environment before starting the app.
