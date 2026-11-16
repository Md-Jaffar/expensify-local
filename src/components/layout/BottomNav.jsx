// src/components/layout/BottomNav.jsx — Fixed bottom navigation bar with FAB
// 4 tab destinations + central FAB to Add Transaction

import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../ui/Icon';

// Tab definitions — matches DESIGN.md Section 7
const TABS = [
  { icon: 'grid_view',     label: 'Home',     path: '/'         },
  { icon: 'receipt_long',  label: 'History',  path: '/history'  },
  // FAB placeholder (center slot — not a real tab)
  null,
  { icon: 'pie_chart',     label: 'Insights', path: '/insights' },
  { icon: 'settings',      label: 'Settings', path: '/settings' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which tab is active
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50
                 bg-surface/90 backdrop-blur-xl
                 shadow-bottomnav pb-safe"
    >
      {/* Tab row */}
      <div className="flex items-end justify-around h-20 px-2">
        {TABS.map((tab, index) => {
          // Central FAB slot
          if (tab === null) {
            return (
              <div key="fab" className="flex flex-col items-center justify-center relative">
                <button
                  onClick={() => navigate('/add')}
                  className="w-14 h-14 rounded-full
                             bg-secondary text-on-secondary
                             flex items-center justify-center
                             shadow-fab ring-4 ring-surface
                             -translate-y-3
                             active:scale-95 transition-transform"
                  aria-label="Add transaction"
                >
                  <Icon name="add" size={28} fill={1} />
                </button>
              </div>
            );
          }

          const active = isActive(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-end pb-2
                         min-w-[56px] min-h-[48px] flex-1
                         transition-colors"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator pill behind icon */}
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center mb-0.5
                            transition-colors
                            ${active ? 'bg-secondary/15' : 'bg-transparent'}`}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  fill={active ? 1 : 0}
                  className={active ? 'text-secondary' : 'text-on-surface-variant'}
                />
              </div>
              {/* Tab label */}
              <span
                className={`text-label-sm transition-colors
                            ${active ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Android home indicator bar */}
      <div className="flex justify-center pb-1">
        <div className="w-28 h-1 rounded-full bg-on-surface/30" />
      </div>
    </nav>
  );
};

export default BottomNav;
