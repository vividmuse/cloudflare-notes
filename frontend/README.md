# Notes Frontend

A modern note-taking application built with React and TypeScript.

## Features

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
  ├── App.tsx        # Main application component
  ├── App.css        # Global styles
  ├── main.tsx       # Entry point
  ├── components/    # React components
  ├── hooks/         # Custom hooks
  ├── types/         # TypeScript types
  └── utils/         # Utility functions
```

## Features Guide

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 