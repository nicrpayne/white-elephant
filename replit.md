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
├── lib/            # Utility libraries (supabase, utils, imageUpload)
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

## Supabase Setup Notes
After deploying, run the following migrations in your Supabase dashboard:
1. `20240101_white_elephant_schema.sql` - Base schema
2. `20240102_disable_rls.sql` through `20240109_backfill_gift_positions.sql` - Additional features
3. `20240110_atomic_game_actions.sql` - Atomic RPC functions for game actions (IMPORTANT for production)

**Storage Bucket**: Create a storage bucket named `gift-images` with public access for gift image uploads.

## Recent Changes

### December 22, 2025: Scalability & Reliability Improvements
Major improvements for handling 20+ concurrent players:

1. **Atomic Game Actions (Server-side RPC)**
   - Created database functions `pick_gift`, `steal_gift`, `keep_gift` that handle all updates atomically
   - Prevents race conditions when multiple players act simultaneously
   - All validation and state transitions happen in a single transaction

2. **Connection Resilience**
   - Added connection status tracking with auto-reconnect
   - Exponential backoff for reconnection attempts
   - Full state reload after any connection interruption
   - ConnectionStatus component shows users when connection is lost/restored

3. **Bulk Gift Loading Improvements**
   - Added concurrency limit (3 simultaneous fetches) to prevent browser overwhelm
   - Better error handling for individual URL failures
   - Deduplication of URLs

4. **Image Handling**
   - Added Supabase Storage integration for gift image uploads
   - Images uploaded directly to storage instead of using data URLs
   - Lazy loading for gift images to improve performance
   - Fallback handling for broken image URLs
   - **Client-side image compression** - Resizes to max 800x800 and targets ~200KB file size
   - Progressive JPEG quality reduction for optimal file sizes
   - Graceful fallback preserves original format if compression fails

5. **Connection Handling**
   - Improved real-time subscription with status events
   - Automatic state refresh on reconnection
   - Health check every 30 seconds during active games
   - **Increased real-time event throttle** from 20 to 100 events/second for 20+ player support

6. **Player Experience**
   - Waiting lobby screen for players before game starts
   - Players see "Waiting for Game to Start" until host begins
   - Draft session saving with 24-hour localStorage persistence
   - Resume dialog when returning to setup with existing draft

### December 22, 2025: Initial Setup
- Configured Vite to allow all hosts for Replit proxy
- Set server to bind to 0.0.0.0:5000
- Made Supabase initialization graceful when credentials are missing

## User Preferences
- None documented yet

## Known Limitations
- Supabase Storage bucket must be manually created in dashboard
- RPC functions must be deployed via Supabase migrations
