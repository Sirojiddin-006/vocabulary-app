# Vocabulary Learning Website

A modern, interactive vocabulary learning application built with React, Express, and MySQL. This application helps users memorize English words with an engaging flashcard system and progress tracking.

## Features

### Core Features

- **Interactive Flashcards**: Swipe-based card system for learning vocabulary
- **Folder Organization**: Organize words into custom folders
- **Progress Tracking**: Track which words you've learned
- **User Authentication**: Secure login with OAuth support
- **Role-Based Access Control**: Admin and user roles with different permissions
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### User Features

- **Create Folders**: Organize vocabulary by topics or difficulty levels
- **Add Words**: Create custom word lists with English-Uzbek translations and examples
- **Memorize Mode**: Interactive flashcard system with swipe gestures
- **Progress Dashboard**: View learning statistics and progress
- **User Profile**: Manage account settings and view learning history

### Admin Features

- **Global Word Lists**: Create vocabulary that's shared with all users
- **Global Folders**: Organize shared vocabulary into folders
- **User Management**: Monitor user activity and progress

## Technology Stack

### Frontend
- **React 19**: Modern UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **tRPC**: End-to-end type-safe APIs
- **Wouter**: Lightweight routing library
- **Lucide React**: Beautiful icon library

### Backend
- **Express.js**: Web framework
- **tRPC**: Type-safe API framework
- **Drizzle ORM**: Type-safe database ORM
- **MySQL**: Relational database
- **Zod**: Schema validation

### Authentication
- **Manus OAuth**: Secure authentication system
- **JWT**: Session management

## Project Structure

```
vocabulary-app/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities and helpers
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   └── public/            # Static assets
├── server/                # Backend Express server
│   ├── routers.ts         # tRPC procedure definitions
│   ├── db.ts              # Database queries
│   └── _core/             # Core server utilities
├── drizzle/               # Database schema and migrations
│   ├── schema.ts          # Table definitions
│   └── migrations/        # Database migrations
├── shared/                # Shared types and constants
└── package.json           # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- MySQL 8.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vocabulary-app.git
   cd vocabulary-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   pnpm db:push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`

## Usage

### For Users

1. **Sign Up**: Create an account using Manus OAuth
2. **Create Folders**: Organize vocabulary by topics
3. **Add Words**: Add English words with Uzbek translations and examples
4. **Study**: Use the Memorize mode to practice with flashcards
5. **Track Progress**: View your learning statistics in the Profile section

### For Developers

#### Adding a New Feature

1. **Update Database Schema** (if needed)
   ```typescript
   // drizzle/schema.ts
   export const newTable = mysqlTable("new_table", {
     // Define columns
   });
   ```

2. **Run Migrations**
   ```bash
   pnpm db:push
   ```

3. **Add Database Queries**
   ```typescript
   // server/db.ts
   export async function getNewData() {
     // Query implementation
   }
   ```

4. **Create API Procedures**
   ```typescript
   // server/routers.ts
   feature: router({
     getData: protectedProcedure.query(({ ctx }) =>
       db.getNewData(ctx.user.id)
     ),
   }),
   ```

5. **Build UI Components**
   ```typescript
   // client/src/pages/Feature.tsx
   const { data } = trpc.feature.getData.useQuery();
   ```

## API Documentation

### Authentication

- **`auth.me`**: Get current user information
- **`auth.logout`**: Logout current user

### Vocabulary Management

- **`vocabulary.getFolders`**: Get all accessible folders
- **`vocabulary.getFolderById`**: Get specific folder details
- **`vocabulary.createFolder`**: Create a new folder
- **`vocabulary.getWords`**: Get words in a folder
- **`vocabulary.addWord`**: Add a new word
- **`vocabulary.getProgress`**: Get user progress for a folder
- **`vocabulary.updateProgress`**: Update word mastery status

## Database Schema

### Users Table
- `id`: Primary key
- `openId`: OAuth identifier
- `name`: User's name
- `email`: User's email
- `role`: User role (admin/user)
- `createdAt`, `updatedAt`: Timestamps

### Folders Table
- `id`: Primary key
- `name`: Folder name
- `description`: Optional description
- `createdBy`: User ID (null for admin folders)
- `isGlobal`: Whether folder is visible to all users
- `createdAt`, `updatedAt`: Timestamps

### Words Table
- `id`: Primary key
- `folderId`: Reference to folder
- `english`: English word
- `uzbek`: Uzbek translation
- `example`: Example sentence
- `createdBy`: User ID (null for admin words)
- `createdAt`, `updatedAt`: Timestamps

### UserProgress Table
- `id`: Primary key
- `userId`: Reference to user
- `wordId`: Reference to word
- `known`: Whether user knows the word
- `reviewCount`: Number of times reviewed
- `lastReviewedAt`: Last review timestamp
- `createdAt`, `updatedAt`: Timestamps

## Role-Based Access Control

### Admin Privileges
- Create global folders visible to all users
- Create global words visible to all users
- Access all user data

### User Privileges
- Create personal folders (only visible to them)
- Create personal words (only visible to them)
- Access admin-created folders and words
- Track personal progress

## Card Ordering Bug Fix

The application implements a proper queue-based system for the flashcard memorization:

- When a user clicks "I Know", the card is removed from the queue
- When a user clicks "Don't Know", the card is moved to the END of the queue (not the beginning)
- This ensures users review difficult words multiple times without getting stuck

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Testing

Run tests:
```bash
pnpm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the DEPLOYMENT.md for setup help

## Acknowledgments

- Figma design template for UI inspiration
- Manus platform for OAuth and infrastructure
- React and open-source community
