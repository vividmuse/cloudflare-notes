# Notes Frontend

A modern note-taking application built with React and TypeScript.

## Features

- 🔐 User authentication with JWT
- 📝 Rich text editing with Markdown support
- 🏷️ Tag organization with `#tag` syntax
- ✅ Todo list support with checkbox syntax
- 📌 Pin important notes to the top
- 🔍 Full-text search
- 📅 Calendar view and date filtering
- 🏷️ Tag filtering and management
- 📱 Responsive design

## Tech Stack

- React 18
- TypeScript
- TailwindCSS
- React Query
- date-fns
- DOMPurify
- markdown-it
- JWT Authentication

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
  ├── App.tsx           # Main application component
  ├── App.css           # Global styles
  ├── main.tsx          # Entry point
  │   ├── components/   # React components
  │   │   ├── Auth/    # Authentication components
  │   │   ├── Notes/   # Note related components
  │   │   └── Common/  # Shared components
  │   ├── hooks/        # Custom hooks
  │   │   ├── useAuth.ts   # Authentication hook
  │   │   └── useNotes.ts  # Notes management hook
  │   ├── types/        # TypeScript types
  └── utils/            # Utility functions
```

## Features Guide

### Authentication
- Register with email and password
- Login with credentials
- Automatic token refresh
- Protected routes
- Persistent login state

### Note Creation
- Use Markdown syntax for formatting
- Use `#tag` to add tags
- Use `- [ ]` for todo items
- Use `- [x]` for completed todo items

### Note Organization
- Pin important notes using the menu
- Mark notes as todo items
- Filter notes by:
  - Search text
  - Tags
  - Dates
  - Todo status
  - Pin status

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter` - Save note
- `Esc` - Cancel editing

## Development

### Environment Variables

Create `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### Authentication Flow

1. User registers/logs in
2. JWT token is stored in localStorage
3. Token is included in all API requests
4. Token refresh happens automatically
5. Protected routes redirect to login

### Protected Routes

All note operations require authentication. Users will be redirected to the login page if:
- No valid token exists
- Token has expired
- Server returns 401/403 error

### State Management

Authentication state is managed using React Context and is available throughout the app using the `useAuth` hook:

```typescript
const { user, login, logout, register } = useAuth();
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 