# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev              # Start development server (auto-reloads)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm check            # TypeScript validation

# Database
pnpm db:push          # Generate and run migrations
pnpm seed:global     # Seed global topics
pnpm seed:essential   # Seed Essential Words 4000 (1 book, 20 units, 400 words)

# Other
pnpm format           # Format code with Prettier
pnpm test             # Run tests
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Wouter (routing), tRPC client
- **Backend**: Express, tRPC, Drizzle ORM, MySQL 8+, Zod
- **Auth**: Local username/password with JWT cookie session (no OAuth runtime dependency)

### Project Structure
```
vocabulary-app/
├── client/src/
│   ├── pages/           # Route components (Home, Folder, Review, Memorize, Global, Profile)
│   ├── components/      # Reusable UI components (shadcn/ui based)
│   ├── contexts/        # React contexts (Theme, AppLocale)
│   ├── lib/             # Utilities (trpc client)
│   └── App.tsx          # Route definitions with Wouter
├── server/
│   ├── _core/           # Server core (auth, context, tRPC setup, vite integration)
│   ├── routers.ts       # tRPC API procedures
│   └── db.ts            # Database queries with global caching
├── drizzle/
│   ├── schema.ts        # Database schema definitions
│   └── relations.ts     # Drizzle relations
└── shared/
    ├── types.ts         # Shared type exports
    └── const.ts         # Shared constants
```

### Key Architectural Patterns

**tRPC API Layer**
- All API procedures defined in `server/routers.ts`
- Three procedure types: `publicProcedure`, `protectedProcedure`, `adminProcedure`
- Protected procedures require authenticated user in session
- Client calls via `trpc.vocabulary.*.useQuery()` or `.useMutation()`

**Database Layer**
- Drizzle ORM with MySQL
- Queries in `server/db.ts` with 30-second global cache for read-heavy operations
- Schema in `drizzle/schema.ts` with auto-increment IDs and camelCase columns
- Relations defined in `drizzle/relations.ts`

**Personal vs Global Content**
- Personal folders: `createdBy = userId`, `isGlobal = false`
- Global folders: `createdBy = null`, `isGlobal = true` (admin-created, visible to all)
- Saved global folders: personal copies with `sourceGlobalFolderId` pointing to original
- Book/unit organization: global folders can belong to books with unit numbers

**Study Flows**
- `Review`: Repetition-only, swipe-based, does NOT mark words as learned
- `Memorize`: Active learning with Test/Type modes, correct answers update `userProgress`
- Both support `ENG -> UZB`, `UZB -> ENG`, and `Mixed` directions

**Folder Editing Rules**
- Editable: personal folders, saved standalone global folder copies
- Read-only: book/unit folders, global source folders
- Book folders reject word updates for non-admin users

## Important Files

| File | Purpose |
|------|---------|
| `server/routers.ts` | All tRPC API procedures (auth, vocabulary, voice) |
| `server/db.ts` | Database queries with global caching logic |
| `drizzle/schema.ts` | Database schema (users, folders, words, userProgress, books) |
| `client/src/App.tsx` | Frontend route definitions with Wouter |
| `client/src/lib/trpc.ts` | tRPC client setup with httpBatchLink |
| `server/_core/index.ts` | Express server entry point with Vite integration |
| `server/_core/trpc.ts` | tRPC middleware (requireUser, adminProcedure) |
| `server/_core/auth.ts` | Password hashing, JWT session creation |
| `server/_core/context.ts` | tRPC context creation with user from session |

## Database Schema

**Core Tables**
- `users`: id, openId (username), name, email, passwordHash, passwordSalt, role, timestamps
- `folders`: id, name, description, bookId, unitNumber, sourceGlobalFolderId, createdBy, isGlobal, timestamps
- `words`: id, folderId, english, uzbek, description, example, createdBy, timestamps
- `userProgress`: id, userId, wordId, known, reviewCount, lastReviewedAt, timestamps
- `books`: id, title, description, createdBy, isGlobal, timestamps

**Key Relationships**
- `folders.createdBy → users.id` (null = global/admin)
- `words.folderId → folders.id`
- `words.createdBy → users.id` (null = global)
- `userProgress.userId → users.id`
- `userProgress.wordId → words.id`
- `folders.bookId → books.id`

## Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Home | Personal folders list |
| `/folder/:id` | Folder | Personal folder detail |
| `/review/:id` | Review | Personal review flow |
| `/memorize/:id` | Memorize | Personal memorize flow |
| `/global` | Global | Global folders/books list |
| `/global/folder/:id` | GlobalFolder | Global folder detail |
| `/global/review/:id` | GlobalReview | Global review flow |
| `/global/memorize/:id` | GlobalMemorize | Global memorize flow |
| `/profile` | Profile | User profile and stats |
| `/signin` | SignIn | Sign in page |
| `/signup` | SignUp | Sign up page |

## Environment Variables

Required in `.env.local`:
```env
DATABASE_URL=mysql://username:password@localhost:3306/vocabulary_db
JWT_SECRET=your-secure-random-secret-key
```

Optional:
```env
VITE_APP_TITLE=Vocabulary Learning Website
VITE_APP_LOGO=/logo.svg
```

## Common Development Tasks

**Add a new API endpoint**
1. Add database query in `server/db.ts`
2. Create procedure in `server/routers.ts` (use `protectedProcedure` for auth-required)
3. Call from frontend: `trpc.vocabulary.newEndpoint.useQuery()` or `.useMutation()`

**Add a new page**
1. Create component in `client/src/pages/NewPage.tsx`
2. Add route in `client/src/App.tsx` with Wouter `<Route path="/new" component={NewPage} />`

**Modify database schema**
1. Update `drizzle/schema.ts`
2. Run `pnpm db:push` to generate and apply migration
3. Update affected queries in `server/db.ts`

**Add a new tRPC router**
1. Create router in `server/routers.ts` or separate file
2. Merge into `appRouter` in `server/routers.ts`
3. Export type for client: `export type AppRouter = typeof appRouter`

## Key Behaviors to Remember

**Global Caching**
- Global folders, books, and folder words are cached for 30 seconds
- Cache invalidated on writes to global content (createdBy = null)
- Improves performance for Global page and related queries

**Session Management**
- JWT cookie named `app_session_id` with 1-year max age
- Session created on sign up/sign in, cleared on logout
- User context populated from session cookie in tRPC middleware

**Progress Tracking**
- `userProgress` table tracks per-user, per-word learning state
- `reviewCount` increments on each update
- `lastReviewedAt` timestamp for analytics
- Only `Memorize` flow updates progress (not `Review`)

**Folder Cloning**
- Saving a global folder creates a personal copy with cloned words
- `sourceGlobalFolderId` links copy to original
- Editing saved copy does not affect global source
- Unsaving deletes the personal copy

## Related Documentation

- [README.md](./README.md) - Full product documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API reference
- [GITHUB_SETUP.md](./GITHUB_SETUP.md) - GitHub and deployment setup