# White Elephant Gift Exchange

## Overview
A fun, interactive web application for hosting White Elephant gift exchange parties online with friends, family, or coworkers.

## Project Architecture
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL database with realtime subscriptions)
- **Routing**: React Router DOM

## Project Structure
```
src/
├── components/     # React components
│   ├── ui/         # shadcn/ui components
│   └── *.tsx       # Application components
├── contexts/       # React contexts (GameContext)
├── lib/            # Utility libraries (supabase, utils)
├── stories/        # Component stories
├── types/          # TypeScript types
├── App.tsx         # Main application component
├── main.tsx        # Application entry point
└── index.css       # Global styles

supabase/
└── migrations/     # Database migration files
```

## Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development
The app runs on port 5000 with Vite dev server.

## Recent Changes
- December 22, 2025: Initial import and Replit environment setup
  - Configured Vite to allow all hosts for Replit proxy
  - Set server to bind to 0.0.0.0:5000
  - Made Supabase initialization graceful when credentials are missing
