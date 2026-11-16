// src/components/layout/PageShell.jsx — Main scrollable content area wrapper
// Applies correct padding to clear the fixed AppBar (top) and BottomNav (bottom).

/**
 * PageShell wraps each screen's content area.
 * @param {React.ReactNode} children - Screen content
 * @param {string} className - Additional classes (optional)
 */
const PageShell = ({ children, className = '' }) => {
  return (
    <main
      className={`
        pt-24 pb-32 px-gutter
        bg-surface flex-1
        overflow-y-auto no-scrollbar
        min-h-dvh
        ${className}
      `}
    >
      {children}
    </main>
  );
};

export default PageShell;
