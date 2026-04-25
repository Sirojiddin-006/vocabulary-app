# Vocabulary App

Vocabulary App is a React + Express + MySQL vocabulary platform for learning English words with personal folders, a shared global library, and two separate study flows:
- `Review`: repeat cards without marking them as learned
- `Memorize`: answer-based study that updates learning progress

## Current Product

### Main sections
- `Personal`: your own folders and words
- `Global`: shared folders, books, and units
- `Profile`: account and stats

### Study sections
- `Review`
  - classic swipe/repetition flow
  - no learned progress is saved
  - supports `ENG -> UZB`, `UZB -> ENG`, and `Mixed`
- `Memorize`
  - active learning flow
  - supports:
    - `Test`
    - `Type`
  - correct answers update `userProgress`
  - supports `ENG -> UZB`, `UZB -> ENG`, and `Mixed`

### Word model
Each word supports:
- `english`
- `uzbek`
- `description`
- `example`

### UI highlights
- mobile-first liquid-glass shell
- top mini navbar with theme and language controls
- bottom navigation for `Personal`, `Global`, `Profile`
- bottom navigation supports liquid drag-and-snap interaction
- global folder sorting:
  - `Most words`
  - `A-Z`
  - `Z-A`
- browser tab title and favicon cleaned up

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Wouter
- tRPC client

### Backend
- Express
- tRPC
- Drizzle ORM
- MySQL
- Zod

### Auth
- local username/password
- JWT cookie session

## Project Structure

```text
vocabulary-app/
├── client/
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── lib/
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Folder.tsx
│       │   ├── Review.tsx
│       │   ├── Memorize.tsx
│       │   ├── Global.tsx
│       │   ├── GlobalFolder.tsx
│       │   ├── GlobalReview.tsx
│       │   ├── GlobalMemorize.tsx
│       │   └── Profile.tsx
│       ├── App.tsx
│       ├── index.css
│       └── main.tsx
├── server/
│   ├── _core/
│   ├── db.ts
│   ├── routers.ts
│   └── storage.ts
├── drizzle/
├── scripts/
├── shared/
├── REPORT.md
└── package.json
```

## Requirements
- Node.js 18+
- pnpm
- MySQL 8+

## Environment

Required env vars:
- `DATABASE_URL`
- `JWT_SECRET`

## Getting Started

1. Install dependencies

```bash
pnpm install
```

2. Configure environment variables

Create your env file and set at least:

```bash
DATABASE_URL=...
JWT_SECRET=...
```

3. Run migrations

```bash
pnpm db:push
```

4. Optional: seed global content

```bash
pnpm seed:global
pnpm seed:essential
```

5. Start development server

```bash
pnpm dev
```

## Available Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm check
pnpm test
pnpm format
pnpm db:push
pnpm seed:global
pnpm seed:essential
```

## Key Frontend Routes

### Main app
- `/`
- `/global`
- `/profile`

### Personal folders
- `/folder/:id`
- `/review/:id`
- `/memorize/:id`

### Global folders
- `/global/folder/:id`
- `/global/review/:id`
- `/global/memorize/:id`

## Important Behavior

### Personal vs Global separation
- personal folder lists show only user-created folders
- global pages show only shared folders
- saved standalone global folders become editable personal copies
- saved global books stay grouped as books with units in personal area
- editing a saved personal copy does not affect the global source

### Editing rules
- editable:
  - personal folders
  - saved standalone global folder copies
- read-only:
  - book/unit folders
  - global source folders

### Review vs Memorize
- `Review` is repetition only
- `Memorize` is for tracked learning
- `I Know` in `Review` does not mark the word as learned
- correct answers in `Memorize` do update progress

### Mixed direction
- both `Review` and `Memorize` support `Mixed`
- default direction is `ENG -> UZB`

## Seed Data

### Global topics
- seeded via `scripts/seed-global.ts`

### Essential Words 4000
- seeded via `scripts/seed-essential-words-4000.ts`
- includes:
  - 1 book
  - 20 units
  - 400 words total
  - descriptions and examples

## Validation

Run TypeScript validation:

```bash
pnpm check
```

Current expected status:
- `pnpm check` passes

## Recent Updates

- Global page performance improved with SQL aggregation, debounce, cache, and DB indexes
- Saved books now render in personal area as grouped books instead of mixing with flat folder cards
- `Unsave Folder` and `Unsave Book` flows added
- Word editing added for editable folders
- Book folders locked to read-only for non-admin users

## Related Docs
- [REPORT.md](/home/kali/Projects/vocabulary-app/REPORT.md)
- [DEPLOYMENT.md](/home/kali/Projects/vocabulary-app/DEPLOYMENT.md)
- [API_REFERENCE.md](/home/kali/Projects/vocabulary-app/API_REFERENCE.md)
