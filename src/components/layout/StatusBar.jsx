// src/components/layout/StatusBar.jsx — Android-style status bar
// Shows current time, offline indicator, and system icon placeholders.

import { useEffect, useState } from 'react';
import { getCurrentTime } from '../../utils/date';
import Icon from '../ui/Icon';

const StatusBar = () => {
  // Live clock — updates every minute
  const [time, setTime] = useState(getCurrentTime());

  useEffect(() => {
    // Update time immediately and then every 60 seconds
    const tick = () => setTime(getCurrentTime());
    const interval = setInterval(tick, 60_000);

    // Align to the next full minute for accuracy
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
    const timeout = setTimeout(() => {
      tick();
      setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-gutter pt-space-xs pb-1 h-8">
      {/* ── Left: Current Time ─────────────────────────── */}
      <span className="text-numeral-dense text-on-surface tabular-nums font-semibold">
        {time}
      </span>

      {/* ── Center: Offline indicator pill ────────────── */}
      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
        {/* Pulsing teal dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        <span className="text-label-sm text-primary uppercase tracking-wider">
          Offline • Local Only
        </span>
      </div>

      {/* ── Right: System icon placeholders ───────────── */}
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        {/* Signal bars */}
        <Icon name="signal_cellular_alt" size={16} className="text-on-surface-variant" />
        {/* WiFi */}
        <Icon name="wifi" size={16} className="text-on-surface-variant" />
        {/* Battery */}
        <Icon name="battery_5_bar" size={16} className="text-on-surface-variant" />
      </div>
    </div>
  );
};

export default StatusBar;
