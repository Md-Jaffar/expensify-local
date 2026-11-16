// src/components/ui/Icon.jsx — Material Symbols Outlined wrapper component
// Use this component to render any Material Symbol icon by name.

/**
 * Icon renders a Material Symbols Outlined glyph.
 * @param {string} name - Material Symbol name (e.g. "home", "settings")
 * @param {number} size - Icon size in px (default 24)
 * @param {number} fill - Fill level: 0 (outline) or 1 (filled)
 * @param {string} className - Additional Tailwind classes
 */
const Icon = ({ name, size = 24, fill = 0, className = '' }) => {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        // Material Symbols variable font axes
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name}
    </span>
  );
};

export default Icon;
