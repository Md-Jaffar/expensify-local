// src/components/ui/EmptyState.jsx — Centered empty state card for screens with no data

import Icon from './Icon';

/**
 * EmptyState shows a friendly message when a list/screen has no content.
 * @param {string} icon - Material Symbol icon name
 * @param {string} title - Bold heading
 * @param {string} subtitle - Descriptive text
 * @param {string} actionLabel - CTA button label (optional)
 * @param {Function} onAction - CTA button handler (optional)
 */
const EmptyState = ({
  icon = 'inbox',
  title = 'Nothing here yet',
  subtitle = '',
  actionLabel = '',
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon circle */}
      <div className="w-20 h-20 rounded-full bg-surface-container
                      flex items-center justify-center mb-5">
        <Icon name={icon} size={40} className="text-primary" />
      </div>

      {/* Title */}
      <h3 className="text-headline-sm text-on-surface mb-2">{title}</h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-body-md text-on-surface-variant max-w-[260px] leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Optional action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-3 rounded-full
                     bg-primary-container text-on-primary
                     text-label-lg font-semibold
                     active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
