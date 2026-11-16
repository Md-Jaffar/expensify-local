// src/components/layout/AppBar.jsx — Fixed top application bar
// Supports two variants: 'tab' (main screens) and 'stack' (sub-screens with back button)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import StatusBar from './StatusBar';
import { useProfile } from '../../contexts/ProfileContext';
import { useInstallPrompt } from '../../contexts/InstallPromptContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

/**
 * AppBar component
 * @param {string} title - Screen title shown below brand name
 * @param {'tab'|'stack'} variant - 'tab' shows logo+brand; 'stack' shows back arrow
 * @param {React.ReactNode} rightSlot - Custom content in the right slot (overrides avatar)
 */
const AppBar = ({ title = '', variant = 'tab', rightSlot }) => {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { isInstalled, isInstallable, promptInstall } = useInstallPrompt();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Load active profile name for avatar
  const profile = useLiveQuery(
    () => (activeProfileId ? db.profiles.get(activeProfileId) : null),
    [activeProfileId]
  );

  const profileInitial = profile?.name ? profile.name[0].toUpperCase() : '?';
  const profileName = profile?.name || 'Vault';

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await promptInstall();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50
                   bg-surface/85 backdrop-blur-xl
                   shadow-appbar pt-safe"
      >
        {/* Status bar row */}
        <StatusBar />

        {/* App bar row */}
        <div className="flex items-center justify-between px-gutter h-16">
          {/* ── Left side ──────────────────────────────────── */}
          <div className="flex items-center gap-space-sm min-w-0 flex-1">
            {variant === 'stack' ? (
              /* Back button for stack screens (e.g. /add) */
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full
                           hover:bg-surface-container active:bg-surface-container-high transition-colors"
                aria-label="Go back"
              >
                <Icon name="arrow_back" size={24} className="text-on-surface" />
              </button>
            ) : (
              /* Logo + Brand name for tab screens */
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-on-primary font-bold text-sm">₹</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-headline-sm font-bold text-on-surface tracking-tight leading-none">
                    Expensify
                  </span>
                  <span className="text-label-sm text-secondary font-semibold -mt-0.5">
                    100% Local
                  </span>
                </div>
              </div>
            )}

            {/* Title for stack screens */}
            {variant === 'stack' && (
              <span className="text-headline-sm font-bold text-on-surface truncate ml-1">
                {title}
              </span>
            )}
          </div>

          {/* ── Right side: Install Pill + Avatar ──────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-on-secondary font-bold text-xs shadow-sm active:scale-95 transition-transform"
                title="Install app on your phone"
              >
                <Icon name="install_mobile" size={16} />
                <span>Install</span>
              </button>
            )}

            {rightSlot ? (
              rightSlot
            ) : (
              <button
                onClick={() => navigate('/profiles')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                           bg-surface-container-high
                           hover:bg-surface-container active:bg-surface-container-low
                           transition-colors flex-shrink-0"
                aria-label="Switch profile"
              >
                {/* Avatar initial circle */}
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-label-sm text-on-primary font-bold">{profileInitial}</span>
                </div>
                <span className="text-label-md text-on-surface-variant max-w-[70px] truncate font-medium">
                  {profileName}
                </span>
                <Icon name="unfold_more" size={16} className="text-on-surface-variant" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Install Guidance Modal ───────────────────────── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Icon name="install_mobile" size={24} />
                <h3 className="text-headline-sm text-on-surface font-bold">Install on Phone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-full"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="space-y-3 text-body-sm text-on-surface leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="block text-on-surface">Tap Chrome's Menu</strong>
                  <span className="text-on-surface-variant text-xs">
                    Tap the <strong className="text-on-surface">three vertical dots (⋮)</strong> at the top-right corner of Chrome.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-on-surface">Select "Add to Home screen"</strong>
                  <span className="text-on-surface-variant text-xs">
                    Scroll down and tap <strong className="text-on-surface">"Add to Home screen"</strong> (or <strong className="text-on-surface">"Install app"</strong>).
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-on-surface">Tap "Install"</strong>
                  <span className="text-on-surface-variant text-xs">
                    Expensify will be added to your app drawer and home screen for 100% offline use.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] rounded-full bg-secondary text-on-secondary font-bold text-label-md mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppBar;
