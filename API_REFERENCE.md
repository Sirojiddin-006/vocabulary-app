# API Reference

Complete documentation of all available API endpoints for the Vocabulary Learning Website.

## Authentication Endpoints

### `auth.me`
Get current user information.

**Type**: Query (Public)

**Returns**:
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null
```

**Example**:
```typescript
const { data: user } = trpc.auth.me.useQuery();
```

---

### `auth.logout`
Logout the current user and clear session.

**Type**: Mutation (Public)

**Returns**:
```typescript
{ success: true }
```

**Example**:
```typescript
const logout = trpc.auth.logout.useMutation();
logout.mutate();
```

---

## Vocabulary Endpoints

### `vocabulary.getFolders`
Get all folders accessible to the current user (admin folders + user's own folders).

**Type**: Query (Protected)

**Returns**:
```typescript
Array<{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Example**:
```typescript
const { data: folders } = trpc.vocabulary.getFolders.useQuery();
```

---

### `vocabulary.getFolderById`
Get a specific folder by ID (with access control).

**Type**: Query (Protected)

**Input**:
```typescript
{ folderId: number }
```

**Returns**:
```typescript
{
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
} | undefined
```

**Example**:
```typescript
const { data: folder } = trpc.vocabulary.getFolderById.useQuery({ folderId: 1 });
```

---

### `vocabulary.createFolder`
Create a new folder for the current user.

**Type**: Mutation (Protected)

**Input**:
```typescript
{
  name: string;           // Required, 1-255 characters
  description?: string;   // Optional, max 500 characters
}
```

**Returns**:
```typescript
{ insertId: number; affectedRows: number }
```

**Example**:
```typescript
const createFolder = trpc.vocabulary.createFolder.useMutation();
createFolder.mutate({
  name: "Business English",
  description: "Professional vocabulary"
});
```

---

### `vocabulary.getWords`
Get all words in a folder (with access control).

**Type**: Query (Protected)

**Input**:
```typescript
{ folderId: number }
```

**Returns**:
```typescript
Array<{
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Example**:
```typescript
const { data: words } = trpc.vocabulary.getWords.useQuery({ folderId: 1 });
```

---

### `vocabulary.addWord`
Add a new word to a folder.

**Type**: Mutation (Protected)

**Input**:
```typescript
{
  folderId: number;        // Required
  english: string;         // Required, 1-255 characters
  uzbek: string;           // Required, 1-255 characters
  example?: string;        // Optional, max 500 characters
}
```

**Returns**:
```typescript
{ insertId: number; affectedRows: number }
```

**Example**:
```typescript
const addWord = trpc.vocabulary.addWord.useMutation();
addWord.mutate({
  folderId: 1,
  english: "beautiful",
  uzbek: "go'zal",
  example: "She has a beautiful smile."
});
```

---

### `vocabulary.getProgress`
Get user's learning progress for a folder.

**Type**: Query (Protected)

**Input**:
```typescript
{ folderId: number }
```

**Returns**:
```typescript
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

**Example**:
```typescript
const { data: progress } = trpc.vocabulary.getProgress.useQuery({ folderId: 1 });
console.log(`${progress.knownWords}/${progress.totalWords} words learned`);
```

---

### `vocabulary.updateProgress`
Mark a word as known or unknown.

**Type**: Mutation (Protected)

**Input**:
```typescript
{
  wordId: number;    // Required
  known: boolean;    // Required
}
```

**Returns**:
```typescript
void
```

**Example**:
```typescript
const updateProgress = trpc.vocabulary.updateProgress.useMutation();
updateProgress.mutate({
  wordId: 5,
  known: true
});
```

---

## Error Handling

All endpoints may return errors in the following format:

```typescript
{
  code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR";
  message: string;
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | User is not authenticated |
| `FORBIDDEN` | User doesn't have permission to access this resource |
| `NOT_FOUND` | Resource not found |
| `BAD_REQUEST` | Invalid input parameters |
| `INTERNAL_SERVER_ERROR` | Server error |

**Example Error Handling**:
```typescript
const { data, error, isLoading } = trpc.vocabulary.getFolders.useQuery();

if (error) {
  console.error(`Error: ${error.message}`);
}
```

---

## Access Control Rules

### Admin-Created Resources
- **Visibility**: Visible to all users
- **Modification**: Only admin can modify
- **Identification**: `createdBy === null` and `isGlobal === true`

### User-Created Resources
- **Visibility**: Only visible to creator
- **Modification**: Only creator can modify
- **Identification**: `createdBy === userId`

### Example: Check Resource Ownership
```typescript
function canModify(resource: Folder, userId: number): boolean {
  // Admin resources can't be modified by users
  if (resource.isGlobal && resource.createdBy === null) {
    return false;
  }
  // User can only modify their own resources
  return resource.createdBy === userId;
}
```

---

## Data Types

### User
```typescript
type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};
```

### Folder
```typescript
type Folder = {
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;  // null = admin-created
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### Word
```typescript
type Word = {
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  example: string | null;
  createdBy: number | null;  // null = admin-created
  createdAt: Date;
  updatedAt: Date;
};
```

### UserProgress
```typescript
type UserProgress = {
  id: number;
  userId: number;
  wordId: number;
  known: boolean;
  reviewCount: number;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## Usage Examples

### Complete Flow: Create Folder and Add Words

```typescript
import { trpc } from "@/lib/trpc";

export function VocabularySetup() {
  const createFolder = trpc.vocabulary.createFolder.useMutation();
  const addWord = trpc.vocabulary.addWord.useMutation();

  const handleSetup = async () => {
    // 1. Create a folder
    const folderResult = await createFolder.mutateAsync({
      name: "Daily Words",
      description: "Words to learn today"
    });

    const folderId = folderResult.insertId;

    // 2. Add words to the folder
    await addWord.mutateAsync({
      folderId,
      english: "serendipity",
      uzbek: "tasodifiy xush hodisa",
      example: "Finding that old photo was pure serendipity."
    });

    await addWord.mutateAsync({
      folderId,
      english: "eloquent",
      uzbek: "oqlash, fasih",
      example: "The speaker gave an eloquent speech."
    });
  };

  return <button onClick={handleSetup}>Setup Vocabulary</button>;
}
```

### Track Learning Progress

```typescript
import { trpc } from "@/lib/trpc";

export function ProgressTracker({ folderId }: { folderId: number }) {
  const { data: progress } = trpc.vocabulary.getProgress.useQuery({ folderId });
  const updateProgress = trpc.vocabulary.updateProgress.useMutation();

  if (!progress) return <div>Loading...</div>;

  const percentage = (progress.knownWords / progress.totalWords) * 100;

  return (
    <div>
      <h2>Progress: {percentage.toFixed(0)}%</h2>
      <p>{progress.knownWords} / {progress.totalWords} words learned</p>
      
      <button
        onClick={() => updateProgress.mutate({ wordId: 1, known: true })}
      >
        Mark Word as Known
      </button>
    </div>
  );
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. For production deployment, consider adding:

```typescript
// Example: Implement rate limiting
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

---

## Caching

The tRPC client automatically caches query results. To invalidate cache:

```typescript
const utils = trpc.useUtils();

// Invalidate specific query
utils.vocabulary.getFolders.invalidate();

// Invalidate all queries
utils.invalidate();
```

---

## Best Practices

1. **Always check authentication**: Use `useAuth()` before calling protected endpoints
2. **Handle errors gracefully**: Show user-friendly error messages
3. **Use optimistic updates**: For better UX on mutations
4. **Invalidate cache appropriately**: After mutations that change data
5. **Validate input**: Use Zod schemas for client-side validation

---

## Support

For API issues or questions:
- Check the [README.md](./README.md)
- Review [QUICKSTART.md](./QUICKSTART.md)
- Open an issue on GitHub
