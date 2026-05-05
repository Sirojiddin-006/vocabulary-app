# API Reference

Current API reference for `vocabulary-app`.

API layer:
- tRPC on Express
- public + protected procedures
- protected procedures require an authenticated user in session

Main router file:
- `server/routers.ts`

## Authentication

## `auth.signUp`
Create a new local user and start a session.

Type:
- Mutation
- Public

Input:

```ts
{
  username: string; // 3..64
  password: string; // 6..128
  name?: string;    // 1..255
  email?: string;   // valid email
}
```

Returns:

```ts
{
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date | null;
  } | null;
}
```

Notes:
- creates a local account
- sets JWT session cookie on success

---

## `auth.signIn`
Sign in with username and password.

Type:
- Mutation
- Public

Input:

```ts
{
  username: string; // 3..64
  password: string; // 6..128
}
```

Returns:

```ts
{
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date | null;
  } | null;
}
```

Notes:
- updates `lastSignedIn`
- sets JWT session cookie on success

---

## `auth.me`
Get current authenticated user.

Type:
- Query
- Public

Returns:

```ts
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
} | null
```

---

## `auth.logout`
Clear current session cookie.

Type:
- Mutation
- Public

Returns:

```ts
{ success: true }
```

---

## `auth.updateProfile`
Update current user profile.

Type:
- Mutation
- Protected

Input:

```ts
{
  name?: string;  // 1..255
  email?: string; // valid email
}
```

Returns:

```ts
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
} | null
```

---

## `auth.deleteAccount`
Delete current user account.

Type:
- Mutation
- Protected

Input:
- none

Returns:
- backend delete result from storage layer

Notes:
- also removes user-owned vocabulary/progress through database logic

---

## `auth.getTotalStats`
Get current user personal learning totals.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
{
  totalWords: number;
  knownWords: number;
  unknownWords: number;
}
```

---

## `auth.getGlobalStats`
Get current user totals against global vocabulary.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
{
  totalWords: number;
  knownWords: number;
  unknownWords: number;
}
```

---

## Vocabulary

## `vocabulary.getFolders`
Get personal folders for current user only.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
Array<{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  bookId?: number | null;
  unitNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

Notes:
- returns only folders owned by current user

---

## `vocabulary.getGlobalFolders`
Get global folders only.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
Array<{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  bookId?: number | null;
  unitNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

## `vocabulary.getGlobalFoldersWithCounts`
Get global folders with word counts for UI listing.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
Array<{
  folder: {
    id: number;
    name: string;
    description: string | null;
    createdBy: number | null;
    isGlobal: boolean;
    bookId?: number | null;
    unitNumber?: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  wordCount: number;
}>
```

---

## `vocabulary.searchGlobalFolders`
Search global folders and return matching folder ids.

Type:
- Query
- Protected

Input:

```ts
{ query: string } // 1..100
```

Returns:

```ts
number[]
```

---

## `vocabulary.searchGlobalWords`
Search global words by text.

Type:
- Query
- Protected

Input:

```ts
{ query: string } // 1..100
```

Returns:

```ts
Array<{
  id: number;
  folderId: number;
  folderName: string;
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
  bookId?: number | null;
  unitNumber?: number | null;
}>
```

---

## `vocabulary.getGlobalBooks`
Get all global books available in the library.

Type:
- Query
- Protected

Input:
- none

Returns:

```ts
Array<{
  id: number;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

## `vocabulary.getFolderById`
Get a personal folder with ownership validation.

Type:
- Query
- Protected

Input:

```ts
{ folderId: number }
```

Returns:

```ts
{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  bookId?: number | null;
  unitNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
} | undefined
```

---

## `vocabulary.getGlobalFolderById`
Get a global folder by id.

Type:
- Query
- Protected

Input:

```ts
{ folderId: number }
```

Returns:

```ts
{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  bookId?: number | null;
  unitNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
} | undefined
```

---

## `vocabulary.createFolder`
Create a new personal folder.

Type:
- Mutation
- Protected

Input:

```ts
{
  name: string;                // 1..255
  description?: string | null; // max 500
}
```

Returns:
- insert result from database layer

---

## `vocabulary.deleteFolder`
Delete a personal folder owned by current user.

Type:
- Mutation
- Protected

Input:

```ts
{ folderId: number }
```

Returns:
- delete result from database layer

Notes:
- only personal folders are deletable through this endpoint

---

## `vocabulary.getWords`
Get words for a personal folder.

Type:
- Query
- Protected

Input:

```ts
{ folderId: number }
```

Returns:

```ts
Array<{
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

## `vocabulary.getGlobalWords`
Get words for a global folder.

Type:
- Query
- Protected

Input:

```ts
{ folderId: number }
```

Returns:

```ts
Array<{
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

## `vocabulary.addWord`
Add a word to a personal folder.

Type:
- Mutation
- Protected

Input:

```ts
{
  folderId: number;
  english: string;                  // 1..255
  uzbek: string;                    // 1..255
  description?: string | null;      // max 1000
  example?: string | null;          // max 500
}
```

Returns:
- insert result from database layer

Notes:
- book-linked folders are read-only for users
- saved standalone global folders may be edited because they are personal copies

---

## `vocabulary.updateWord`
Update a personal word owned by current user.

Type:
- Mutation
- Protected

Input:

```ts
{
  wordId: number;
  english: string;                  // 1..255
  uzbek: string;                    // 1..255
  description?: string | null;      // max 1000
  example?: string | null;          // max 500
}
```

Returns:

```ts
{
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Notes:
- only words created inside the current user's personal area can be updated
- book-linked folders reject updates
- updating a saved standalone global folder changes only the user's personal copy
- global source content is not modified

---

## `vocabulary.importWords`
Bulk import words into a personal folder.

Type:
- Mutation
- Protected

Input:

```ts
{
  folderId: number;
  words: Array<{
    english: string;           // 1..255
    uzbek: string;             // 1..255
    description?: string;      // max 1000
    example?: string;          // max 500
  }>; // 1..100 items
}
```

Returns:
- import result from database layer

Notes:
- book-linked folders are read-only for users

---

## `vocabulary.getProgress`
Get personal progress for a folder.

Type:
- Query
- Protected

Input:

```ts
{ folderId: number }
```

Returns:

```ts
{
  totalWords: number;
  knownWords: number;
  progress: Array<{
    id: number;
    userId: number;
    wordId: number;
    known: boolean;
    reviewCount: number;
    lastReviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
```

---

## `vocabulary.updateProgress`
Update learned status for a word.

Type:
- Mutation
- Protected

Input:

```ts
{
  wordId: number;
  known: boolean;
}
```

Returns:
- mutation result from database layer

Notes:
- this is used by `Memorize`
- `Review` intentionally does not rely on this to mark words learned

---

## Error Handling

Common tRPC error codes in this project:
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `BAD_REQUEST`
- `CONFLICT`
- `INTERNAL_SERVER_ERROR`

Typical shape:

```ts
{
  code: string;
  message: string;
}
```

Example:

```ts
const { data, error } = trpc.vocabulary.getFolders.useQuery();

if (error) {
  console.error(error.message);
}
```

---

## Current Access Rules

### Personal resources
- Personal folders are scoped to current user
- Personal words are accessible only through owned folders

### Global resources
- Global endpoints return only `isGlobal = true` content
- Global folder and word queries bypass personal ownership, but still require auth

### Progress rules
- `updateProgress` writes learned state for the current user
- `Review` UI is repetition-only and should not mark words as learned
- `Memorize` is the tracked learning flow

---

## Related Files
- `server/routers.ts`
- `server/db.ts`
- `client/src/lib/trpc.ts`
- `REPORT.md`
