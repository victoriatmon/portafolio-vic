// Diagonal "external link" arrow for the LinkedIn link in the desktop
// footer (Footer.js) and the mobile menu sheet (Navbar.js). Victoria's SVG,
// just made size-configurable to match each context's type scale.
export const ArrowIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6 18L18 6M18 6H10M18 6V14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);
