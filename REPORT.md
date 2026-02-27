# Vocabulary App Full Status Report

Date: 2026-02-27
Project: vocabulary-app

## Executive Summary
Project has evolved from a basic folder/word memorization app into a multi-mode learning platform with clear Personal vs Global separation, modernized mobile-first memorize experience, and foundational Book/Unit support.

Major completed upgrades:
- Auth migrated to local username/password with JWT cookie sessions.
- Storage migrated from JSON fallback to MySQL-only (Drizzle ORM).
- Global library implemented and separated from personal user space.
- Memorize system redesigned with 4 modes and 2 language directions.
- Mobile gesture and layout issues fixed for memorize pages.
- Word model expanded with `description` support.
- Book infrastructure added (`books` + folder unit metadata).
- Essential Words 4000 seeded into Global library (20 units x 20 words = 400 words).

---

## Current Product Behavior

### Personal Area
- Users see only their own folders in Home/Personal flow.
- Personal folder CRUD and personal word management remain active.
- Personal progress is tracked per user via `userProgress`.

### Global Area
- Global area displays shared/global folders only.
- Personal users do not see global folders inside personal folder list.
- Global memorize works on globally seeded content.
- Global cards can show Book/Unit metadata where available.

---

## Architecture Overview
- Frontend: React + Vite + Tailwind
- API layer: tRPC on Express
- Database: MySQL via Drizzle ORM
- Auth: Local username/password + JWT in secure session cookie
- Password hashing: scrypt + salt

---

## Authentication
### Status
- OAuth runtime path removed from active auth flow.
- Local sign in / sign up is the active path.
- Session token is verified server-side.

### Key files
- `server/_core/auth.ts`
- `server/routers.ts` (`auth.signIn`, `auth.signUp`, `auth.me`, `auth.logout`)
- `client/src/pages/SignIn.tsx`
- `client/src/pages/SignUp.tsx`

### Required env
- `JWT_SECRET`
- `DATABASE_URL`

---

## Database & Schema

### Core existing tables
- `users`
- `folders`
- `words`
- `userProgress`

### Newly expanded model
- `books` table added for book-level grouping.
- `folders` extended with:
  - `bookId`
  - `unitNumber`
- `words` extended with:
  - `description`

### Migration
- Added migration for book/unit/description support:
  - `drizzle/0003_essential_books.sql`

### Current migration note
- Migration was applied successfully via `drizzle-kit migrate`.

---

## Data Access Rules (Important)

### Personal folder query behavior
- `getFolders(userId)` now returns only `createdBy = userId` folders.
- This prevents global folders from appearing in personal section.

### Global folder query behavior
- `getAllFolders()` and related global endpoints return only `isGlobal = true` folders.
- `getGlobalFolderById` validates global visibility.

### Stats behavior
- Personal stats are computed only from personal folders.
- Global stats are computed from global folders/words.

---

## Vocabulary Model Enhancements

### New field: description
Words now can store:
- `english`
- `uzbek`
- `description` (new)
- `example`

### API updates
- `vocabulary.addWord` accepts `description`.
- `vocabulary.importWords` accepts `description` per word.

### UI updates
- Folder add-word dialog now includes Description input.
- Bulk import supports format:
  - `English | Uzbek | Description | Example`
- Folder list/search includes description matching.
- Memorize translation reveal shows description (if exists).

---

## Memorize System (Major Upgrade)

### Modes
Four learning modes are now available:
1. Classic
2. Test (4 random options)
3. Type (user types answer)
4. True/False

### Language directions
All modes support:
- `ENG -> UZB`
- `UZB -> ENG`

### URL persistence
Selected mode and direction are persisted in URL query:
- `?mode=...&dir=...`

### Start workflow
- Settings panel appears before starting memorize.
- Cards are hidden until `Start Memorize` is pressed.
- During session, settings can be toggled from header (`Settings` button).

### Randomization
- Word queue is shuffled when session starts.
- Start action reinitializes queue and begins randomized session.

### Wrong answer behavior (all modes)
When wrong answer is selected:
- Card stays visible for user review.
- User can continue by tapping card.
- Auto-continue fallback after 5 seconds.

### Type mode keyboard UX
- Input auto-focus enabled in Type mode during active session.
- Mobile keyboard opens automatically on eligible state.

### Session statistics
- Per-mode attempted/correct/accuracy tracking implemented.
- Stats are compact and default hidden (`Show stats` / `Hide stats`).

### Mobile fixes
- Edge-swipe back gesture conflicts reduced.
- Horizontal intent detection added.
- Touch behavior refined (`touch-action`, gesture guards).
- Card rendering stabilized (load jitter/fade issues reduced).

### Files
- `client/src/pages/Memorize.tsx`
- `client/src/pages/GlobalMemorize.tsx`
- `client/src/index.css`

---

## Home / Progress UI
- Learning progress bar fixed to render both segments correctly.
- Known and unknown sections now both visible with separate colors.

File:
- `client/src/pages/Home.tsx`

---

## Global Library & Books

### Books support
- Added global books retrieval endpoint (`getGlobalBooks`).
- Global folder cards can show:
  - Book title
  - Unit number

Files:
- `server/routers.ts`
- `server/db.ts`
- `client/src/pages/Global.tsx`

---

## Seed Data

### Existing global topic seed
- Script remains for initial topic-based global folders.
- File: `scripts/seed-global.ts`

### New book seed
- `Essential Words 4000` added to Global library.
- Seeded structure:
  - 1 book
  - 20 unit folders
  - 20 words per unit
  - Includes description + example fields
- Total seeded words by this script: 400

Files:
- `scripts/seed-essential-words-4000.ts`
- `package.json` scripts:
  - `seed:global`
  - `seed:essential`

Execution status:
- Essential seed executed successfully after migration.

---

## API Summary (Vocabulary)
Key endpoints currently in use:
- `getFolders` (personal only)
- `getGlobalFolders`
- `getGlobalFoldersWithCounts`
- `getGlobalBooks`
- `getFolderById`
- `getGlobalFolderById`
- `createFolder`
- `getWords`
- `getGlobalWords`
- `addWord` (with description)
- `importWords` (with description)
- `getProgress`
- `updateProgress`

---

## Operational Commands
- Type check:
  - `pnpm check`
- Apply migrations:
  - `pnpm drizzle-kit migrate`
- Seed global topics:
  - `pnpm seed:global`
- Seed Essential Words 4000:
  - `pnpm seed:essential`

---

## Known Risks / Follow-ups
1. Content quality for Essential Words 4000 is currently placeholder-style and should be replaced with finalized pedagogical content if strict textbook fidelity is required.
2. Global/Book browsing UX can be expanded with dedicated Book page and Unit filter/navigation.
3. Add admin panel for controlled global book/folder/word publishing.
4. Add server-side rate limiting and stronger password policy checks.
5. Add automated DB backup/restore workflow.
6. Add migration consistency checks in CI.

---

## Verification Checklist
1. Personal Home shows only user-owned folders.
2. Global page shows only global folders.
3. Add Word supports Description and stores it correctly.
4. Bulk import supports 4-part line format.
5. Memorize modes all work in both directions.
6. Wrong answer pause behavior works (tap or 5s).
7. Type mode auto-focus opens keyboard on mobile.
8. Start flow hides cards until Start button is pressed.
9. Learning progress bar shows both colored segments.
10. Essential Words 4000 appears in Global with units and words.

