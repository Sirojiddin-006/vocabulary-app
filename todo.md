# Vocabulary Learning Website - TODO

## Core Features
- [x] Fix card ordering bug in Memorize section (add to end instead of beginning)
- [x] Implement user authentication with signup/signin
- [x] Add OAuth support (Manus OAuth)
- [x] Implement role-based access control (admin vs regular users)
- [x] Admin-created words visible to all users
- [x] User-specific words/folders visible only to creator
- [x] Build user profile section
- [x] User progress tracking and statistics

## Frontend Implementation
- [x] Migrate Figma design components to React
- [x] Implement HomePage with folder selection
- [x] Implement FolderPage with word list
- [x] Implement MemorizePage with flashcard functionality
- [x] Implement AddWordModal with folder creation
- [x] Implement authentication (Login/Logout)
- [x] Implement user profile page
- [x] Implement responsive design for mobile

## Backend Implementation
- [x] Create database schema with users, folders, words tables
- [x] Implement user authentication endpoints
- [x] Implement OAuth integration (Manus OAuth)
- [x] Implement folder management endpoints
- [x] Implement word management endpoints
- [x] Implement role-based access control
- [x] Implement user progress tracking endpoints
- [x] Add input validation and error handling

## Database Schema
- [x] Users table with role field (admin/user)
- [x] Folders table with owner_id and is_global flag
- [x] Words table with folder_id and owner_id
- [x] User progress table for tracking known words
- [x] Migrations for all tables

## Testing & Deployment
- [ ] Test authentication flow
- [ ] Test role-based access control
- [ ] Test card ordering in flashcard section
- [ ] Test folder and word visibility rules
- [ ] Test responsive design on mobile devices
- [ ] Prepare GitHub repository
- [ ] Create deployment documentation
- [ ] Set up environment variables for self-hosting

## Design & UI
- [x] Apply Figma design color scheme and typography
- [x] Ensure dark theme consistency
- [x] Implement smooth transitions and animations
- [x] Add loading states for async operations
- [x] Implement error handling UI
- [x] Add empty states for lists
