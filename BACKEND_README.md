# White Elephant Game - Backend Integration

## Supabase Setup Complete! ✅

The app now uses Supabase for real-time multi-device synchronization.

---

## 🛡️ Resilience & Production Hardening

### Performance Optimizations for 15-20 players with 30+ gifts:

1. **Retry Logic** (`withRetry()` in `src/lib/supabase.ts`)
   - All critical database operations retry 3 times with exponential backoff
   - Delays start at 500ms, doubling each retry
   - Skips retry on permission errors or unique constraint violations

2. **Batched Operations** (`addGiftsBatch()` in `GameContext.tsx`)
   - Bulk gift inserts chunked into batches of 10
   - 200ms delay between batches to avoid overwhelming the database
   - Continues processing even if one batch fails

3. **Connection Health Monitoring**:
   - 30-second health check intervals refresh data during active games
   - Automatic data refresh when realtime subscription reconnects
   - `ConnectionStatus` component shows connection issues

4. **Event-Driven Error Handling**:
   - `realtimeConnectionIssue` - Dispatched when realtime has problems
   - `giftInsertPartialFailure` - Dispatched when some gifts fail to insert
   - `gameStateRefreshed` - Dispatched when manual refresh completes

5. **Manual Refresh Options**:
   - 🔄 Refresh button in GameBoard header
   - ConnectionStatus refresh button (appears on errors)
   - `refreshGameState()` function in GameContext

6. **Error Boundary** (`ErrorBoundary.tsx`)
   - Catches React errors and provides friendly recovery UI
   - Options to refresh page, go home, or try again

7. **Request Timeouts**
   - 30 second timeout on all Supabase requests
   - Prevents hanging requests from blocking the UI

8. **Graceful Degradation**
   - Partial failures don't crash the app
   - Users are notified of issues but can continue

---

## Database Schema

### Tables Created:
- **game_sessions** - Stores game metadata, config, and status
- **players** - Tracks all players in each session
- **gifts** - Stores gift details and current owners
- **game_actions** - Audit log of all game actions

## Real-time Features

### Live Synchronization:
- **Admin Dashboard** - Sees players join in real-time
- **Player Lobby** - All players see each other join live
- **Game Board** - Actions sync instantly across all devices
- **Gift Status** - Updates propagate immediately

## How It Works

### Admin Flow:
1. Open admin dashboard
2. Configure game rules (auto-saves to Supabase)
3. Add gifts (stored in database)
4. Click "Open Lobby" → creates session in Supabase
5. Players can now join using the session code
6. Admin sees players join in real-time
7. Start game when 2+ players joined

### Player Flow:
1. Go to join page
2. Enter session code + name
3. Joins session in Supabase
4. Sees lobby with all other players (real-time)
5. Waits for admin to start
6. Auto-redirected to game board when game starts

## Testing Multi-Device

To test with real users:

1. **Admin (Desktop):**
   - Open https://6f17f1d9-f3ef-47e8-8dfd-8966ceef8004.canvases.tempo.build
   - Go to admin dashboard
   - Click "Open Lobby"
   - Share the session code

2. **Players (Mobile/Other Devices):**
   - Open same URL on phone/tablet
   - Click "Join Game"
   - Enter session code
   - See live lobby updates

3. **Start Game:**
   - Admin clicks "Start Game" when ready
   - All players auto-navigate to game board

## Environment Variables

Required env vars (already set in Tempo):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Real-time Subscriptions

The app listens for changes on:
- New players joining
- Game status changes
- Gift additions/updates
- Active player changes

All changes broadcast to all connected devices instantly!
