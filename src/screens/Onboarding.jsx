// src/screens/Onboarding.jsx — First-time onboarding flow (3 steps)
// Guides user to create their first vault, set up optional PIN, and configure defaults

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { seedProfileDefaults } from '../db/defaults';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { hashPIN } from '../utils/crypto';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setActiveProfileId, markProfileUnlocked } = useProfile();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [profileName, setProfileName] = useState('Personal');
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('50000');
  const [defaultPayment, setDefaultPayment] = useState('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const pinData = hasPin && pin.trim().length >= 4 ? await hashPIN(pin.trim()) : null;

      // 1. Create Profile
      const profileId = await db.profiles.add({
        name: profileName.trim() || 'Personal',
        pinHash: pinData ? pinData.hash : null,
        pinSalt: pinData ? pinData.salt : null,
        createdAt: new Date().toISOString(),
      });

      // 2. Seed Default Categories & Settings
      await seedProfileDefaults(db, profileId);

      // 3. Update specific settings
      const budgetNum = parseFloat(monthlyBudget) || 50000;
      await db.settings.where({ profileId, key: 'monthlyBudget' }).modify({ value: budgetNum });
      await db.settings.where({ profileId, key: 'defaultPayment' }).modify({ value: defaultPayment });

      // 4. Mark session unlocked and set active
      if (pinData) {
        markProfileUnlocked(profileId);
      }
      setActiveProfileId(profileId);

      showToast(`Welcome to Expensify Local, ${profileName}!`);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error creating profile:', err);
      showToast('Failed to create profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface select-none">
      {/* ── STEP 1: Welcome ───────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-between p-gutter bg-gradient-to-br from-primary-container via-primary to-[#004741] text-on-primary">
          <div className="pt-12 flex flex-col items-center text-center">
            {/* App Logo */}
            <div className="w-20 h-20 rounded-full bg-on-primary/15 backdrop-blur-md flex items-center justify-center mb-6 shadow-hero">
              <span className="text-display-currency text-on-primary font-bold">₹</span>
            </div>

            <span className="text-label-sm uppercase tracking-widest text-on-primary-container font-bold mb-2">
              Privacy-First Finance
            </span>
            <h1 className="text-display-currency-mobile font-bold tracking-tight mb-3">
              Expensify Local
            </h1>
            <p className="text-body-lg text-on-primary-container max-w-xs leading-relaxed">
              Your financial records stay strictly on your Android device. Zero cloud, zero trackers.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-col gap-2.5 mt-8 w-full max-w-xs">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-on-primary/10 backdrop-blur-md">
                <Icon name="verified_user" size={20} className="text-secondary" />
                <span className="text-label-md font-semibold text-left">100% Offline IndexedDB</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-on-primary/10 backdrop-blur-md">
                <Icon name="currency_rupee" size={20} className="text-tertiary-fixed" />
                <span className="text-label-md font-semibold text-left">Indian Lakh & UPI Native</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-on-primary/10 backdrop-blur-md">
                <Icon name="lock" size={20} className="text-on-primary" />
                <span className="text-label-md font-semibold text-left">Salted PBKDF2 PIN Lock</span>
              </div>
            </div>
          </div>

          <div className="pb-8 flex flex-col gap-3">
            <button
              onClick={() => setStep(2)}
              className="w-full h-14 rounded-full bg-secondary-container text-on-secondary-container text-label-lg font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <Icon name="arrow_forward" size={20} />
            </button>
            <p className="text-center text-body-sm text-on-primary-container/80">
              No account, email, or internet required
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Vault Profile & PIN ──────────────── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col justify-between p-gutter bg-surface">
          <div className="pt-8 flex flex-col">
            <button
              onClick={() => setStep(1)}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container mb-4"
            >
              <Icon name="arrow_back" size={24} />
            </button>

            <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
              Step 1 of 2
            </span>
            <h2 className="text-headline-lg font-bold text-on-surface mt-1">
              Create Your Vault
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              A vault isolates all transactions and budgets locally.
            </p>

            <div className="mt-8 space-y-5">
              {/* Profile Name Input */}
              <div>
                <label className="text-label-md text-on-surface font-semibold block mb-2">
                  Vault Name
                </label>
                <div className="flex items-center bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm border border-outline-variant/40 focus-within:border-primary">
                  <Icon name="badge" size={20} className="text-primary mr-3" />
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Personal, Family, Freelance"
                    className="w-full bg-transparent text-body-lg text-on-surface focus:outline-none"
                    maxLength={30}
                  />
                </div>
              </div>

              {/* PIN Toggle Card */}
              <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                      <Icon name="lock" size={20} />
                    </div>
                    <div>
                      <span className="text-label-lg text-on-surface font-semibold block">
                        Protect with PIN
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        Require PIN when opening this vault
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasPin}
                    onChange={(e) => setHasPin(e.target.checked)}
                    className="w-6 h-6 accent-primary-container rounded cursor-pointer"
                  />
                </div>

                {hasPin && (
                  <div className="mt-4 pt-3 border-t border-surface-container">
                    <label className="text-label-sm text-on-surface-variant block mb-1.5 font-medium">
                      Enter 4-digit PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full text-center text-display-currency-mobile tracking-widest bg-surface-container-low rounded-xl py-2 text-on-surface focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pb-8">
            <button
              onClick={() => {
                if (hasPin && pin.length < 4) {
                  showToast('Please enter at least 4 digits for your PIN');
                  return;
                }
                setStep(3);
              }}
              className="w-full h-14 rounded-full bg-primary-container text-on-primary text-label-lg font-bold shadow-lg active:scale-95 transition-transform"
            >
              Continue to Quick Setup
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Quick Setup ──────────────────────── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col justify-between p-gutter bg-surface">
          <div className="pt-8 flex flex-col">
            <button
              onClick={() => setStep(2)}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container mb-4"
            >
              <Icon name="arrow_back" size={24} />
            </button>

            <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
              Step 2 of 2
            </span>
            <h2 className="text-headline-lg font-bold text-on-surface mt-1">
              Personalize Defaults
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              You can adjust these settings at any time in Settings.
            </p>

            <div className="mt-8 space-y-6">
              {/* Monthly Budget Target */}
              <div>
                <label className="text-label-md text-on-surface font-semibold block mb-2">
                  Monthly Budget Limit (₹)
                </label>
                <div className="flex items-center bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm border border-outline-variant/40 focus-within:border-primary">
                  <span className="text-headline-md text-primary font-bold mr-2">₹</span>
                  <input
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-transparent text-headline-sm text-on-surface font-bold focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Default Payment Channel */}
              <div>
                <label className="text-label-md text-on-surface font-semibold block mb-2">
                  Preferred Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: 'qr_code_scanner' },
                    { id: 'Cash', label: 'Cash', icon: 'payments' },
                    { id: 'Debit Card', label: 'Debit Card', icon: 'credit_card' },
                    { id: 'Credit Card', label: 'Credit Card', icon: 'contactless' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDefaultPayment(item.id)}
                      className={`flex items-center gap-2 p-3 rounded-2xl text-left border transition-all ${
                        defaultPayment === item.id
                          ? 'bg-primary-container text-on-primary border-primary-container shadow-sm font-semibold'
                          : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container-low'
                      }`}
                    >
                      <Icon name={item.icon} size={20} />
                      <span className="text-label-md">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pb-8">
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="w-full h-14 rounded-full bg-primary-container text-on-primary text-label-lg font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon name="sync" size={20} className="animate-spin" />
                  <span>Configuring Vault...</span>
                </>
              ) : (
                <>
                  <Icon name="check_circle" size={20} />
                  <span>Start Tracking</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
