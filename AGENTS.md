# Repository Guidelines

## Project Structure & Module Organization
This is a full-stack TypeScript app with React frontend and Express/tRPC backend.
- `client/src/`: UI app (pages, components, hooks, contexts, styles)
- `server/`: backend entry points, routers, storage, and core services
- `shared/`: shared types/constants used by client and server
- `drizzle/`: schema, relations, and SQL migrations
- `scripts/`: one-off data and user seeding/migration scripts
- `data/`: local JSON data files

Use path aliases where possible: `@/*` -> `client/src/*`, `@shared/*` -> `shared/*`.

## Build, Test, and Development Commands
- `pnpm dev`: run backend in watch mode for local development
- `pnpm build`: build frontend with Vite and bundle backend to `dist/`
- `pnpm start`: run production build from `dist/index.js`
- `pnpm check`: TypeScript type-check (`noEmit`)
- `pnpm test`: run Vitest tests
- `pnpm format`: format repository with Prettier
- `pnpm db:push`: generate + apply Drizzle migrations
- `pnpm seed:global` / `pnpm seed:essential`: seed vocabulary data

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode)
- Formatting: Prettier (`tabWidth: 2`, semicolons enabled, double quotes)
- Indentation: 2 spaces, no tabs
- React components/pages: `PascalCase` (`Profile.tsx`, `BookUnitsPage.tsx`)
- Hooks/utilities: `camelCase` (`useAuth.ts`, `usePersistFn.ts`)
- Keep core cross-cutting logic under `server/_core/` and `shared/`.

## Testing Guidelines
- Framework: Vitest (`environment: node`)
- Test file patterns: `server/**/*.test.ts`, `server/**/*.spec.ts`
- Example: `server/smoke.test.ts`
- Run tests with `pnpm test`; run `pnpm check` before opening a PR.

## Commit & Pull Request Guidelines
Git history shows short commits and frequent `Checkpoint:` messages. Prefer:
- concise, imperative commit subject (optionally scoped), e.g. `fix(profile): handle cache invalidation`
- one logical change per commit

PRs should include:
- clear summary of behavior changes
- linked issue/task (if available)
- testing notes (`pnpm check`, `pnpm test`)
- screenshots/video for UI changes (especially `client/src/pages/*`)

## Security & Configuration Tips
Keep secrets in `.env` only (required: `DATABASE_URL`, `JWT_SECRET`). Never commit credentials or production tokens.
