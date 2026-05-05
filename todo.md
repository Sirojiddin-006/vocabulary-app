# Vocabulary App TODO

## Done
- [x] Local auth with `signUp` / `signIn`
- [x] JWT cookie session flow
- [x] Personal vs Global content separation
- [x] MySQL + Drizzle ORM migration flow
- [x] Word model supports:
  - [x] english
  - [x] uzbek
  - [x] description
  - [x] example
- [x] Personal folder CRUD
- [x] Global library pages
- [x] Global books + unit support
- [x] Essential Words 4000 seed
- [x] Mobile liquid-glass shell
- [x] Theme switching
- [x] Locale state (`EN` / `UZ`)
- [x] Global sorting includes `Z-A`
- [x] Study flow split into:
  - [x] `Review`
  - [x] `Memorize`
- [x] `True/False` removed
- [x] `Memorize` reduced to:
  - [x] `Test`
  - [x] `Type`
- [x] `Mixed` direction added
- [x] Review does not mark words as learned
- [x] Navbar-based study settings
- [x] Classic review swipe stack with real next-card preview
- [x] TypeScript check passing

## High Priority
- [ ] Localize remaining UI copy across all pages and dialogs
- [ ] Unify `Review` and `Memorize` shared study UI into reusable components
- [ ] Add explicit UX labels in folder pages to explain:
  - [ ] `Review` does not save learned progress
  - [ ] `Memorize` does save learned progress
- [ ] Add empty / completion states that better distinguish:
  - [ ] finished review session
  - [ ] finished memorize session
- [ ] Audit mobile spacing and typography across all pages after shell redesign

## Study System
- [ ] Persist separate analytics for `Review` sessions
- [ ] Add per-direction stats:
  - [ ] `ENG -> UZB`
  - [ ] `UZB -> ENG`
  - [ ] `Mixed`
- [ ] Decide whether `Mixed` should remain deterministic per-card or become strict alternating order
- [ ] Add optional session-size limit for long folders
- [ ] Add optional retry-only-wrong-answers mode after memorize completion
- [ ] Improve `Type` mode answer normalization:
  - [ ] punctuation tolerance
  - [ ] whitespace tolerance
  - [ ] optional synonym support

## Global Library
- [ ] Add book filtering on Global page
- [ ] Add unit-level progress indicators in Global books
- [ ] Improve global search result ranking
- [ ] Add clearer distinction between:
  - [ ] standalone global folders
  - [ ] book/unit folders

## Personal Dashboard
- [ ] Add clearer session CTA cards:
  - [ ] Start Review
  - [ ] Start Memorize
- [ ] Revisit home stats hierarchy after removing known/unknown cards
- [ ] Add recent activity / last studied folder section

## Profile
- [ ] Localize profile dialogs and destructive action text
- [ ] Improve profile refresh flow after update to avoid full page reload
- [ ] Add clearer explanation of personal vs global stats

## Technical Cleanup
- [ ] Extract shared study helpers used by:
  - [ ] `Review.tsx`
  - [ ] `GlobalReview.tsx`
  - [ ] `Memorize.tsx`
  - [ ] `GlobalMemorize.tsx`
- [ ] Reduce duplicated study page markup between personal/global versions
- [ ] Add stronger route-level tests or smoke coverage for:
  - [ ] review routes
  - [ ] memorize routes
  - [ ] global review routes
  - [ ] global memorize routes
- [ ] Add regression checks for folder visibility rules

## Documentation
- [x] Update `REPORT.md`
- [x] Update `README.md`
- [x] Update `API_REFERENCE.md`
- [ ] Keep deployment docs aligned with local auth flow
- [ ] Add short product decision note for:
  - [ ] why `Review` and `Memorize` are separate
  - [ ] how progress is intentionally written only in `Memorize`

## QA
- [ ] Test personal study flow end-to-end
- [ ] Test global study flow end-to-end
- [ ] Test `Mixed` direction behavior manually on mobile
- [ ] Test liquid-glass shell on:
  - [ ] small Android viewport
  - [ ] iPhone viewport
  - [ ] tablet viewport
- [ ] Test light mode contrast across all main screens
- [ ] Test profile/account destructive flows
