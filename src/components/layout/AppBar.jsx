// src/components/layout/AppBar.jsx — Fixed top application bar
// Supports two variants: 'tab' (main screens) and 'stack' (sub-screens with back button)

import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import StatusBar from './StatusBar';
import { useProfile } from '../../contexts/ProfileContext';
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

  // Load active profile name for avatar
  const profile = useLiveQuery(
    () => activeProfileId ? db.profiles.get(activeProfileId) : null,
    [activeProfileId]
  );

  const profileInitial = profile?.name ? profile.name[0].toUpperCase() : '?';
  const profileName = profile?.name || 'Vault';

  return (
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
              {/* App logo — teal circle with ₹ */}
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="text-on-primary font-bold text-sm">₹</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm uppercase text-primary tracking-wider leading-none">
                  Expensify Local
                </span>
                <span className="text-headline-md text-on-surface leading-tight truncate">
                  {title}
                </span>
              </div>
            </div>
          )}

          {/* Title for stack variant */}
          {variant === 'stack' && (
            <span className="text-headline-md text-on-surface truncate ml-1">
              {title}
            </span>
          )}
        </div>

        {/* ── Right side: custom slot or avatar pill ──── */}
        {rightSlot ? (
          rightSlot
        ) : (
          <button
            onClick={() => navigate('/profiles')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-container-high
                       hover:bg-surface-container active:bg-surface-container-low
                       transition-colors flex-shrink-0"
            aria-label="Switch profile"
          >
            {/* Avatar initial circle */}
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-label-sm text-on-primary font-bold">{profileInitial}</span>
            </div>
            <span className="text-label-md text-on-surface-variant max-w-[80px] truncate">
              {profileName}
            </span>
            <Icon name="unfold_more" size={16} className="text-on-surface-variant" />
          </button>
        )}
      </div>
    </header>
  );
};

export default AppBar;
