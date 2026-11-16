// src/screens/ProfileSelect.jsx — Multiple profile/vault selector
// Supports independent local profiles, PBKDF2 PIN-gate for password-protected vaults, and session security

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { seedProfileDefaults } from '../db/defaults';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { verifyPIN, hashPIN } from '../utils/crypto';

const ProfileSelect = () => {
  const navigate = useNavigate();
  const { activeProfileId, setActiveProfileId, markProfileUnlocked, isProfileUnlocked } = useProfile();
  const { showToast } = useToast();

  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  // PIN prompt modal state
  const [selectedProfileForPin, setSelectedProfileForPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // New profile modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHasPin, setNewHasPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Auto-prompt PIN if arriving here because active profile is locked
  useEffect(() => {
    if (profiles && activeProfileId && !selectedProfileForPin) {
      const activeP = profiles.find((p) => p.id === activeProfileId);
      if (activeP?.pinHash && !isProfileUnlocked(activeP)) {
        setSelectedProfileForPin(activeP);
        setPinInput('');
        setPinError(false);
      }
    }
  }, [profiles, activeProfileId, isProfileUnlocked]);

  const activeProfile = profiles?.find((p) => p.id === activeProfileId);
  const canGoBack = Boolean(activeProfile && isProfileUnlocked(activeProfile));

  const handleSelectProfile = async (profile) => {
    if (profile.pinHash) {
      // Check if this profile is already the currently unlocked profile
      if (isProfileUnlocked(profile)) {
        setActiveProfileId(profile.id);
        markProfileUnlocked(profile.id);
        showToast(`Switched to ${profile.name}`);
        navigate('/');
        return;
      }
      // Otherwise prompt for PIN
      setSelectedProfileForPin(profile);
      setPinInput('');
      setPinError(false);
      return;
    }

    // Direct switch for unprotected profiles
    setActiveProfileId(profile.id);
    showToast(`Switched to ${profile.name}`);
    navigate('/');
  };

  const handleConfirmPin = async () => {
    if (!selectedProfileForPin) return;
    const isValid = await verifyPIN(
      pinInput,
      selectedProfileForPin.pinHash,
      selectedProfileForPin.pinSalt
    );

    if (isValid) {
      setActiveProfileId(selectedProfileForPin.id);
      markProfileUnlocked(selectedProfileForPin.id);
      showToast(`Unlocked ${selectedProfileForPin.name}`);
      setSelectedProfileForPin(null);
      navigate('/');
    } else {
      setPinError(true);
      setPinInput('');
      showToast('Incorrect PIN');
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) {
      showToast('Please enter a name for the vault');
      return;
    }

    const pinData = newHasPin && newPin.trim().length >= 4 ? await hashPIN(newPin.trim()) : null;

    const id = await db.profiles.add({
      name: newName.trim(),
      pinHash: pinData ? pinData.hash : null,
      pinSalt: pinData ? pinData.salt : null,
      createdAt: new Date().toISOString(),
    });

    await seedProfileDefaults(db, id);

    setActiveProfileId(id);
    if (pinData) {
      markProfileUnlocked(id);
    }
    showToast(`Created vault ${newName}`);
    setShowNewModal(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface p-gutter pt-safe pb-safe select-none">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 mb-6">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-container"
              title="Return to Dashboard"
            >
              <Icon name="arrow_back" size={24} />
            </button>
          )}
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Vault Profiles</h1>
            <p className="text-body-sm text-on-surface-variant">Switch between independent expense accounts</p>
          </div>
        </div>
      </div>

      {/* Profiles List */}
      <div className="flex-1 flex flex-col gap-3">
        {profiles?.map((p) => {
          const isActive = p.id === activeProfileId;
          const initial = p.name ? p.name[0].toUpperCase() : '?';

          return (
            <div
              key={p.id}
              onClick={() => handleSelectProfile(p)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                isActive
                  ? 'bg-primary-container text-on-primary border-primary-container shadow-md'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container-low shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-headline-sm ${
                    isActive
                      ? 'bg-on-primary/20 text-on-primary'
                      : 'bg-primary-container text-on-primary'
                  }`}
                >
                  {initial}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-label-lg font-bold">{p.name}</span>
                    {p.pinHash && (
                      <Icon
                        name="lock"
                        size={15}
                        className={isActive ? 'text-on-primary-container' : 'text-primary'}
                      />
                    )}
                  </div>
                  <span
                    className={`text-body-sm ${
                      isActive ? 'text-on-primary-container' : 'text-on-surface-variant'
                    }`}
                  >
                    Local Vault • {p.pinHash ? 'PIN Protected' : 'Open Access'}
                  </span>
                </div>
              </div>

              {isActive ? (
                <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-bold">
                  Active
                </span>
              ) : (
                <Icon name="chevron_right" size={20} className="text-outline" />
              )}
            </div>
          );
        })}

        {/* Add Profile Button */}
        <button
          onClick={() => {
            setNewName('');
            setNewHasPin(false);
            setNewPin('');
            setShowNewModal(true);
          }}
          className="mt-2 w-full p-4 rounded-2xl border-2 border-dashed border-outline/30 hover:border-primary/60 text-primary flex items-center justify-center gap-2 text-label-lg font-semibold active:scale-[0.99] transition-all"
        >
          <Icon name="add" size={22} />
          <span>Create New Vault Profile</span>
        </button>
      </div>

      {/* ── PIN Entry Modal ────────────────────────────── */}
      {selectedProfileForPin && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="lock" size={22} className="text-primary" />
                <h3 className="text-headline-sm font-bold text-on-surface">Enter Vault PIN</h3>
              </div>
              <button
                onClick={() => setSelectedProfileForPin(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Enter the passcode for <strong className="text-on-surface">{selectedProfileForPin.name}</strong>
            </p>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ''));
                setPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmPin();
              }}
              placeholder="••••"
              className={`w-full text-center text-display-currency-mobile tracking-widest bg-surface-container-low rounded-xl py-2.5 text-on-surface focus:outline-none border ${
                pinError ? 'border-error text-error' : 'border-outline-variant/40'
              }`}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setSelectedProfileForPin(null)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPin}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-semibold text-label-md active:scale-95 transition-transform"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Profile Modal ──────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">New Vault</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Vault Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Travel, Family, Business"
                autoFocus
                className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-label-md text-on-surface font-medium">Protect with PIN</span>
              <input
                type="checkbox"
                checked={newHasPin}
                onChange={(e) => setNewHasPin(e.target.checked)}
                className="w-5 h-5 accent-primary-container"
              />
            </div>

            {newHasPin && (
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit PIN"
                className="w-full text-center text-headline-md tracking-widest bg-surface-container-low rounded-xl py-2 text-on-surface focus:outline-none"
              />
            )}

            <button
              onClick={handleCreateNew}
              className="mt-2 w-full h-12 rounded-full bg-primary-container text-on-primary font-bold text-label-md active:scale-95 transition-transform"
            >
              Create Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelect;
