# Quick Start Guide

Get started with the Vocabulary Learning Website in 5 minutes!

## For Users

### 1. Sign Up
- Open the application
- Click "Sign Up" to create a new account
- Or click "Sign In" if you already have credentials

### 2. Create Your First Folder
- Click the "New Folder" button
- Enter a folder name (e.g., "Daily Words", "Business English")
- Click "Create"

### 3. Add Words
- Click on a folder to open it
- Click "Add Word" button
- Fill in:
  - **English Word**: The word you want to learn
  - **Uzbek Translation**: The meaning in Uzbek
  - **Example** (optional): A sentence using the word
- Click "Add Word"

### 4. Study with Flashcards
- Click the "Start" button in a folder, or
- Go to Home and click "Memorize"
- Swipe or click the buttons:
  - **"I Know"** (right/green): Mark word as learned
  - **"Don't Know"** (left/blue): Move to end of queue for later review

### 5. Track Progress
- View your learning statistics on the Home page
- Visit your Profile to see detailed progress

## For Developers

### Local Development

```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:push

# Start development server
pnpm dev
```

Visit `http://localhost:3000`

### Project Structure

```
vocabulary-app/
├── client/          # React frontend
├── server/          # Express backend
├── drizzle/         # Database schema
└── shared/          # Shared types
```

### Key Files

- **Frontend Routes**: `client/src/App.tsx`
- **API Procedures**: `server/routers.ts`
- **Database Queries**: `server/db.ts`
- **Database Schema**: `drizzle/schema.ts`

### Common Tasks

#### Add a New Page
1. Create file: `client/src/pages/NewPage.tsx`
2. Add route in `client/src/App.tsx`
3. Use tRPC for data: `trpc.vocabulary.getData.useQuery()`

#### Add a New API Endpoint
1. Add database query in `server/db.ts`
2. Create procedure in `server/routers.ts`
3. Call from frontend: `trpc.vocabulary.newEndpoint.useMutation()`

#### Modify Database Schema
1. Update `drizzle/schema.ts`
2. Run `pnpm db:push`
3. Update queries in `server/db.ts`

## Deployment

### Quick Deploy to Vercel
```bash
# Push to GitHub
git push origin main

# Go to vercel.com
# Connect your GitHub repository
# Add environment variables
# Deploy!
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Features Overview

### 🎯 Core Features
- Interactive flashcard system
- Folder-based organization
- Progress tracking
- User authentication
- Role-based access control

### 👤 User Features
- Create personal folders and words
- Study with swipe gestures
- View learning statistics
- Manage profile

### 🔐 Admin Features
- Create global folders
- Share words with all users
- Monitor user progress

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Swipe right (I Know) |
| `←` | Swipe left (Don't Know) |
| `Space` | Show translation |
| `Esc` | Go back |

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL in .env.local
- Ensure MySQL is running
- Verify database credentials

### "Port 3000 already in use"
```bash
lsof -i :3000
kill -9 <PID>
```

### "Dependencies not installed"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Getting Help

- 📖 Read [README.md](./README.md) for full documentation
- 🚀 See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- 🔧 Check [GITHUB_SETUP.md](./GITHUB_SETUP.md) for GitHub setup
- 💬 Open an issue on GitHub

## Next Steps

1. ✅ Install and run locally
2. ✅ Create a test folder and add words
3. ✅ Try the memorize feature
4. ✅ Deploy to production
5. ✅ Share with friends!

Happy learning! 🎓
