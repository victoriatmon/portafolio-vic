'use client';

import './footer.css';
import { CopyIcon, CheckIcon } from './copyEmailIcons';
import { ArrowIcon } from './ArrowIcon';
import { useCopyEmail } from './useCopyEmail';
import EmailButtonContent from './EmailButtonContent';

// Shared across all 3 routes.
export default function Footer() {
  // Victoria wants Email to copy the address instead of opening a mail
  // client -- click copies to the clipboard and swaps the button's
  // label/icon (icon on the right of the text) to a green "Email copied!"
  // checkmark, with the button growing/shrinking to fit the new label, then
  // reverting on its own. Shared logic lives in useCopyEmail (also used by
  // the mobile menu sheet's Email button in Navbar.js).
  const { copied, leaving, idleRef, copiedRef, width, handleCopyEmail } = useCopyEmail();

  return (
    <footer className="site-footer" data-site-footer>
      <span className="footer-credit">
        <span>Designed + vibe coded with</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          role="img"
          aria-label="love"
        >
          <path d="M12 20.5C12 20.5 3.5 15.2 3.5 9.2C3.5 6.4 5.6 4.5 8 4.5C9.7 4.5 11.2 5.4 12 6.9C12.8 5.4 14.3 4.5 16 4.5C18.4 4.5 20.5 6.4 20.5 9.2C20.5 15.2 12 20.5 12 20.5Z"></path>
        </svg>
        <span>by Vic</span>
      </span>
      <nav className="footer-links" aria-label="Contact links">
        <a
          className="footer-btn footer-btn-linkedin"
          href="https://www.linkedin.com/in/victoria-talamantes-montanez"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>LinkedIn</span>
          <ArrowIcon size={16} />
        </a>
        <button
          type="button"
          className={'footer-btn footer-btn-email' + (copied ? ' is-copied' : '')}
          onClick={handleCopyEmail}
          style={width != null ? { width: `${width}px` } : undefined}
        >
          <EmailButtonContent
            copied={copied}
            leaving={leaving}
            size={16}
            contentClassName="footer-btn-email-content"
            iconClassName="footer-btn-email-icon"
          />
        </button>
        {/* Off-screen measurers: same markup as the two button states, used only to
            read their natural (text + gap + icon) width so the button can animate
            between fixed px widths instead of snapping instantly on label change. */}
        <span className="footer-btn-email-measure" aria-hidden="true" ref={idleRef}>
          <span>Email</span>
          <span className="footer-btn-email-icon"><CopyIcon size={16} /></span>
        </span>
        <span className="footer-btn-email-measure" aria-hidden="true" ref={copiedRef}>
          <span>Email copied!</span>
          <span className="footer-btn-email-icon"><CheckIcon size={16} /></span>
        </span>
        <a className="footer-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
          Resume
        </a>
      </nav>
    </footer>
  );
}
