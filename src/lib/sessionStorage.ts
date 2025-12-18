// Session persistence for White Elephant game
// Stores session data in localStorage to allow users to return after browser refresh

const STORAGE_KEY = 'white_elephant_session';
const VOLUME_KEY = 'white_elephant_sound_volume';

// Default volume (0-1 scale)
const DEFAULT_VOLUME = 0.5;

/**
 * Get the stored sound volume (0-1 scale)
 */
export const getSoundVolume = (): number => {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored === null) return DEFAULT_VOLUME;
    const volume = parseFloat(stored);
    if (isNaN(volume) || volume < 0 || volume > 1) return DEFAULT_VOLUME;
    return volume;
  } catch {
    return DEFAULT_VOLUME;
  }
};

/**
 * Set the sound volume (0-1 scale)
 */
export const setSoundVolume = (volume: number): void => {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem(VOLUME_KEY, clampedVolume.toString());
};

export interface StoredSession {
  sessionId: string;
  sessionCode: string;
  playerId: string | null;
  isAdmin: boolean;
  displayName: string | null;
  timestamp: number; // When the session was stored
}

// Session expires after 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Store session data in localStorage
 */
export const storeSession = (data: Omit<StoredSession, 'timestamp'>): void => {
  const session: StoredSession = {
    ...data,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

/**
 * Retrieve stored session data from localStorage
 * Returns null if no session exists or if it's expired
 */
export const getStoredSession = (): StoredSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);
    
    // Check if session is expired
    if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
      clearStoredSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error reading stored session:', error);
    clearStoredSession();
    return null;
  }
};

/**
 * Clear stored session data
 */
export const clearStoredSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Update the timestamp of the stored session to keep it alive
 */
export const refreshSessionTimestamp = (): void => {
  const session = getStoredSession();
  if (session) {
    storeSession({
      sessionId: session.sessionId,
      sessionCode: session.sessionCode,
      playerId: session.playerId,
      isAdmin: session.isAdmin,
      displayName: session.displayName,
    });
  }
};

/**
 * Check if the stored session matches a specific session code
 */
export const hasStoredSessionForCode = (sessionCode: string): boolean => {
  const session = getStoredSession();
  return session?.sessionCode?.toUpperCase() === sessionCode?.toUpperCase();
};
