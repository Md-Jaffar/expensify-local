// src/contexts/ProfileContext.jsx — Active profile & PIN session management with Inactivity Auto-Lock
// Controls vault access, ensures single active unlocked state, and enforces auto-lock timeout.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db/db';

const ProfileContext = createContext(null);

// Default inactivity timeout in minutes (5 minutes)
export const DEFAULT_AUTO_LOCK_MINUTES = 5;

export function ProfileProvider({ children }) {
  // Active Profile ID persisted across cold reloads
  const [activeProfileId, setActiveProfileIdState] = useState(() => {
    const saved = localStorage.getItem('expensify-active-profile');
    return saved ? parseInt(saved, 10) : null;
  });

  // Track the single unlocked profile ID in memory only (cleared on cold start / reload / switch / lock)
  const [unlockedProfileId, setUnlockedProfileId] = useState(null);

  // Inactivity tracking
  const lastActivityRef = useRef(Date.now());
  const autoLockTimerRef = useRef(null);

  // Switch or set active profile
  const setActiveProfileId = useCallback((id) => {
    setActiveProfileIdState(id);
    if (id !== null && id !== undefined) {
      localStorage.setItem('expensify-active-profile', String(id));
    } else {
      localStorage.removeItem('expensify-active-profile');
    }
    // When switching profiles, clear any previous profile's unlocked state
    setUnlockedProfileId(null);
  }, []);

  // Mark profile unlocked upon successful PIN verification
  const markProfileUnlocked = useCallback((id) => {
    setUnlockedProfileId(id);
    lastActivityRef.current = Date.now();
  }, []);

  // Explicitly lock the active vault
  const lockProfile = useCallback(() => {
    setUnlockedProfileId(null);
  }, []);

  // Check if a given profile is currently accessible
  const isProfileUnlocked = useCallback(
    (profile) => {
      if (!profile) return false;
      // If profile has no PIN, it is always accessible
      if (!profile.pinHash) return true;
      // Protected profile must match the currently unlocked profile ID in memory
      return unlockedProfileId === profile.id;
    },
    [unlockedProfileId]
  );

  // ── Inactivity Auto-Lock Mechanism ──────────────────────────────────────────
  useEffect(() => {
    // Record user activity
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Periodic check for inactivity (every 10 seconds)
    const checkInterval = setInterval(async () => {
      if (!activeProfileId || !unlockedProfileId) return;

      try {
        // Query profile's autoLock settings
        const autoLockSetting = await db.settings
          .where({ profileId: activeProfileId, key: 'autoLock' })
          .first();

        // If autoLock is disabled (false), do not lock automatically
        // If enabled (true or numeric minutes), determine threshold
        const isEnabled = autoLockSetting?.value === true || (typeof autoLockSetting?.value === 'number' && autoLockSetting?.value > 0);
        if (!isEnabled) return;

        const minutes = typeof autoLockSetting?.value === 'number' ? autoLockSetting.value : DEFAULT_AUTO_LOCK_MINUTES;
        const maxInactiveMs = minutes * 60 * 1000;

        if (Date.now() - lastActivityRef.current >= maxInactiveMs) {
          // Lock vault due to inactivity
          setUnlockedProfileId(null);
        }
      } catch (err) {
        console.warn('Error evaluating auto-lock interval:', err);
      }
    }, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(checkInterval);
    };
  }, [activeProfileId, unlockedProfileId]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfileId,
        setActiveProfileId,
        unlockedProfileId,
        markProfileUnlocked,
        lockProfile,
        isProfileUnlocked,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
