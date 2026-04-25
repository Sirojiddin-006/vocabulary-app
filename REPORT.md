# Vocabulary App Full Status Report

Date: 2026-03-02
Project: vocabulary-app

## Executive Summary
Project is now a personal/global vocabulary platform with:
- Local auth and JWT cookie sessions
- MySQL + Drizzle ORM storage
- Personal vs Global content separation
- Book/Unit-aware global library
- Modern mobile-focused UI with liquid-glass navigation
- Study flow split into two clear products:
  - `Review`: classic swipe-based repetition without marking words as learned
  - `Memorize`: answer-based learning with progress updates

Major recent changes:
- Mobile shell redesigned with top mini navbar and bottom liquid-glass navigation
- Bottom navbar upgraded with drag-and-slide liquid interaction
- App theme switching enabled
- App language preference added (`EN` / `UZ`)
- Global folder sorting now supports both `A-Z` and `Z-A`
- Global page loading optimized with DB aggregation, debounce, cache, and DB indexes
- Personal saved global books now render as grouped books with units, progress, and unsave controls
- Saved global folders now support `Unsave` instead of destructive delete
- Book-linked folders are read-only for users; only admin-managed book content can change
- Personal copies of saved global folders can be edited without affecting the global source
- Personal word editing is now supported for editable folders
- Old memorize structure refactored:
  - `Classic` moved into dedicated `Review`
  - `True/False` removed
  - `Memorize` now keeps only `Test` and `Type`
- Study direction expanded with `Mixed`
- Classic review swipe stack upgraded to show the real next card underneath

---

## Current Product Behavior

### Personal area
- Users see only their own folders on Home.
- Personal folder CRUD is active.
- Saved global standalone folders appear as personal copies.
- Saved global books appear in their own grouped book section instead of mixing with flat folder cards.
- Personal words support:
  - `english`
  - `uzbek`
  - `description`
  - `example`
- Editable folders support word create, bulk import, and word edit.
- Book-linked folders are visible in personal area but are read-only.
- Personal stats are based only on personal folders.

### Global area
- Users see only global/shared folders in Global.
- Global folders are separate from personal folders.
- Global books and units are displayed where available.
- Global search supports folders and words.
- Global books and folders can be saved into personal area.
- Saving a book creates grouped personal unit copies tied to the original global source.

### Navigation / Shell
- Mobile-first shell is active on main app sections:
  - `Home`
  - `Global`
  - `Profile`
- Top mini navbar contains:
  - page title
  - page subtitle
  - language switch
  - theme switch
- Bottom navbar contains:
  - `Personal`
  - `Global`
  - `Profile`
- Bottom navbar supports liquid indicator drag interaction and snap-to-tab behavior.
- `Logout` is available only inside `Profile`.

---

## Architecture Overview
- Frontend: React + Vite + Tailwind
- API layer: tRPC on Express
- Database: MySQL via Drizzle ORM
- Auth: local username/password + JWT cookie session
- Password hashing: scrypt + salt

---

## Authentication

### Status
- OAuth is no longer part of the active runtime auth flow.
- Local sign in / sign up is the active path.
- Session token is verified server-side.

### Key files
- `server/_core/auth.ts`
- `server/routers.ts`
- `client/src/pages/SignIn.tsx`
- `client/src/pages/SignUp.tsx`
- `client/src/_core/hooks/useAuth.ts`

### Required env
- `JWT_SECRET`
- `DATABASE_URL`

---

## Database & Schema

### Core tables
- `users`
- `folders`
- `words`
- `userProgress`
- `books`

### Important model details
- `folders` includes:
  - `bookId`
  - `unitNumber`
  - `isGlobal`
  - `createdBy`
- `words` includes:
  - `english`
  - `uzbek`
  - `description`
  - `example`

### Migration status
- Book / unit / description migration exists:
  - `drizzle/0003_essential_books.sql`
- Saved global folder support:
  - `drizzle/0004_saved_global_folders.sql`
- Book compatibility/idempotent fix:
  - `drizzle/0004_tense_catseye.sql`
- Query performance indexes:
  - `drizzle/0005_global_query_indexes.sql`
- `0005_global_query_indexes.sql` has been applied successfully.

---

## Data Access Rules

### Personal folder query behavior
- Personal folder fetches are restricted to `createdBy = currentUserId`.
- Global folders do not leak into personal lists.
- Saved global folders become personal copies using `sourceGlobalFolderId`.
- Editing a saved personal copy does not mutate the original global folder.

### Global folder query behavior
- Global endpoints return only `isGlobal = true` folders.
- Global folder detail routes validate global visibility.
- Global page now uses faster aggregated folder count queries plus short-lived in-memory caching.

### Stats behavior
- Personal stats are computed only from personal content.
- Global stats are computed only from global content.

---

## Vocabulary Features

### Word fields
Each word can store:
- `english`
- `uzbek`
- `description`
- `example`

### Input / management
- Folder add-word dialog supports description and example
- Bulk import supports:
  - `English | Uzbek | Description | Example`
- Folder search includes:
  - english
  - uzbek
  - description
  - example
- Editable personal folders support word updates.
- Book-linked folders reject add/import/update operations.

---

## Editing Rules

### Editable by user
- User-created personal folders
- Saved personal copies of standalone global folders

### Read-only for user
- Any folder linked to a book/unit
- Global source folders

### Important isolation rule
- If a user edits a saved standalone global folder in personal area, the change applies only to that personal copy.
- The global source content remains unchanged.

---

## Performance Status

### Global page optimizations delivered
- folder word counts moved from JS-side counting to SQL aggregation
- search requests debounced on client
- grouped unit rendering memoized on client
- short-lived server cache added for:
  - global books
  - global folders
  - global folders with counts
  - global folder word lists
- query indexes added for common global and progress lookups

### Result
- Global page no longer depends on loading all words into memory just to compute folder totals
- repeated visits to Global are significantly cheaper on the database layer

---

## Latest UI Changes

### Personal Home
- Saved books render as grouped book cards
- Book cards show:
  - unit count
  - aggregated progress
  - unsave action
- Saved standalone folders show a `Saved` badge

### Personal Folder Detail
- Book folders show `Read only`
- Saved standalone global folders show `Personal copy`
- Saved standalone folders use `Unsave Folder`
- Editable words show `Edit`

### Browser shell
- Browser tab title cleaned up to `Vocabulary App`
- Placeholder favicon/env title noise removed from build output

---

## Study System

## High-level split
The old single memorize experience has been split into two distinct sections:

### 1. Review
Purpose:
- repetition only
- classic card review
- no learned progress is saved when pressing `I Know`

Behavior:
- swipe-based
- card can be dragged left/right
- next real card is visible underneath while swiping
- wrong/unknown answers requeue the current word to the end
- known answers remove the current word from the active session
- completion does not mark words as learned in backend progress

Routes:
- `/review/:id`
- `/global/review/:id`

Files:
- `client/src/pages/Review.tsx`
- `client/src/pages/GlobalReview.tsx`

### 2. Memorize
Purpose:
- actual learning flow
- updates learned progress through `updateProgress`

Active modes:
1. `Test`
2. `Type`

Removed mode:
- `True/False` removed from product

Behavior:
- no swipe interaction
- no swipe-style exit animation outside review
- wrong answers stay visible and continue on tap or after 5 seconds
- correct answers update backend progress

Routes:
- `/memorize/:id`
- `/global/memorize/:id`

Files:
- `client/src/pages/Memorize.tsx`
- `client/src/pages/GlobalMemorize.tsx`

---

## Study Directions

All active study sections now support:
1. `ENG -> UZB`
2. `UZB -> ENG`
3. `Mixed`

Default:
- `ENG -> UZB`

Mixed mode behavior:
- direction is resolved per card
- cards alternate direction using deterministic card-based seed logic

URL persistence:
- study settings are stored in query params
- examples:
  - `?dir=en-uz`
  - `?dir=uz-en`
  - `?dir=mixed`
  - `?mode=test`
  - `?mode=type`

---

## Study Settings UI

### Review
Navbar-controlled settings:
- direction selector
- restart button

### Memorize
Navbar-controlled settings:
- mode selector (`Test` / `Type`)
- direction selector
- restart button

This replaces the older large settings panel workflow.

---

## Review Swipe UX

Review/classic repetition has the following behavior:
- drag is enabled only in `Review`
- horizontal swipe is guarded against accidental edge gestures
- left/right thresholds are asymmetric for better control
- left swipe is slightly damped to reduce accidental skips
- live next-card reveal is active while dragging
- underlying preview is a real full card layout, not just text placeholder

Files involved:
- `client/src/pages/Review.tsx`
- `client/src/pages/GlobalReview.tsx`
- `client/src/index.css`

---

## Home / Dashboard UI

### Current Home behavior
- Home uses the shared liquid-glass app shell
- Personal overview now emphasizes:
  - folders
  - total words
  - progress bar
- separate `Known` / `Unknown` summary cards were removed
- progress bar remains the main known vs unknown visual summary

Key file:
- `client/src/pages/Home.tsx`

---

## Global Library & Books

### Global books support
- Global books retrieval is active
- Global folders can be grouped by book and unit
- Book cards can expand into unit-level folder links

### Global sorting / filtering
- Global standalone folders support:
  - `Most words`
  - `A-Z`
  - `Z-A`

Key files:
- `client/src/pages/Global.tsx`
- `server/routers.ts`
- `server/db.ts`

---

## Theme & Locale

### Theme
- Theme switching is active
- `light` and `dark` modes both supported
- liquid-glass styling is tuned for both modes

### Locale
- app locale state is stored client-side
- available locale options:
  - `en`
  - `uz`

Current scope:
- shell and several key pages already use shared copy
- locale system is in place for broader rollout

Key files:
- `client/src/contexts/ThemeContext.tsx`
- `client/src/contexts/AppLocaleContext.tsx`
- `client/src/lib/appCopy.ts`
- `client/src/components/MobileAppShell.tsx`

---

## Seed Data

### Existing global topic seed
- `scripts/seed-global.ts`

### Essential Words 4000 seed
- Global seed adds:
  - 1 book
  - 20 unit folders
  - 20 words per unit
  - description + example support
- Total words from this seed:
  - 400

### Commands
- `pnpm seed:global`
- `pnpm seed:essential`

---

## API Summary

Key vocabulary endpoints currently used:
- `getFolders`
- `getFolderById`
- `createFolder`
- `deleteFolder`
- `getWords`
- `addWord`
- `importWords`
- `getProgress`
- `updateProgress`
- `getGlobalFolders`
- `getGlobalFoldersWithCounts`
- `getGlobalFolderById`
- `getGlobalWords`
- `getGlobalBooks`
- `searchGlobalFolders`
- `searchGlobalWords`

Auth endpoints in active use:
- `auth.signIn`
- `auth.signUp`
- `auth.me`
- `auth.logout`
- `auth.updateProfile`
- `auth.deleteAccount`
- `auth.getTotalStats`
- `auth.getGlobalStats`

---

## Main Frontend Files

### App shell / shared UI
- `client/src/App.tsx`
- `client/src/components/MobileAppShell.tsx`
- `client/src/index.css`

### Personal flow
- `client/src/pages/Home.tsx`
- `client/src/pages/Folder.tsx`
- `client/src/pages/Review.tsx`
- `client/src/pages/Memorize.tsx`

### Global flow
- `client/src/pages/Global.tsx`
- `client/src/pages/GlobalFolder.tsx`
- `client/src/pages/GlobalReview.tsx`
- `client/src/pages/GlobalMemorize.tsx`

### Account
- `client/src/pages/Profile.tsx`

---

## Operational Commands

### Validation
- `pnpm check`

### Build
- `pnpm build`

### Development
- `pnpm dev`

### Database
- `pnpm drizzle-kit migrate`

### Seeds
- `pnpm seed:global`
- `pnpm seed:essential`

---

## Current Known Gaps / Follow-ups
- Locale system exists, but not all app copy is fully localized yet
- Review and Memorize stats are session-based; no separate persisted review analytics exist
- Study settings in navbar are functional, but could later be upgraded to a more unified settings abstraction
- Desktop-specific optimization of the new mobile-first shell can still be improved

---

## Current Status

Project status as of 2026-02-28:
- Auth: stable
- DB schema: stable
- Personal/global separation: stable
- Global books/units: stable
- Review/Memorize split: implemented
- True/False mode: removed
- Mobile liquid-glass shell: implemented
- Theme switch: implemented
- Locale switch: implemented
- TypeScript check: passing (`pnpm check`)
