// src/components/ui/InstallAppBanner.jsx — Native PWA install card and guidance modal
import { useState } from 'react';
import Icon from './Icon';
import { useInstallPrompt } from '../../contexts/InstallPromptContext';

export default function InstallAppBanner() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone PWA mode or dismissed, hide banner
  if (isInstalled || isDismissed) {
    return null;
  }

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
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/60 p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Icon name="install_mobile" size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-label-md font-bold text-on-surface">Install Mobile App</span>
            <span className="text-body-sm text-on-surface-variant text-xs">Run 100% offline from home screen</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-full bg-secondary text-on-secondary font-bold text-label-sm active:scale-95 transition-transform shadow-sm"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full text-on-surface-variant hover:text-on-surface"
            title="Dismiss"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {/* ── Guidance Modal if automatic prompt is not supported in current browser ── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Icon name="install_mobile" size={24} />
                <h3 className="text-headline-sm text-on-surface font-bold">How to Install</h3>
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
                  <strong className="block text-on-surface">Open in Google Chrome</strong>
                  <span className="text-on-surface-variant text-xs">
                    If you opened this link inside WhatsApp, Telegram, or Gmail, tap the three dots (<strong className="text-on-surface">⋮</strong>) in the top-right and select <strong className="text-on-surface">"Open in Chrome"</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-on-surface">Tap Chrome's Menu</strong>
                  <span className="text-on-surface-variant text-xs">
                    In Chrome, tap the <strong className="text-on-surface">three vertical dots (⋮)</strong> in the top-right corner.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-on-surface">Select "Add to Home screen"</strong>
                  <span className="text-on-surface-variant text-xs">
                    Tap <strong className="text-on-surface">"Add to Home screen"</strong> (or <strong className="text-on-surface">"Install app"</strong>) and confirm <strong className="text-on-surface">"Install"</strong>.
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
}
