// Shared between the desktop footer's Email button (Footer.js) and the
// mobile menu sheet's Email button (Navbar.js) -- both copy-to-clipboard
// buttons use the same two icons, just at different sizes to match their
// surrounding type scale (14px footer label vs 32px menu-sheet label).
export const CopyIcon = ({ size = 16 }) => (
  // Two overlapping rounded squares, filled -- the front square gets a thin
  // bg-colored stroke so the two squares still read as separate shapes
  // instead of merging into one blob.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="12" height="12" rx="2"></rect>
    <rect x="9" y="9" width="12" height="12" rx="2" stroke="#151414" strokeWidth="1.5"></rect>
  </svg>
);

export const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);
