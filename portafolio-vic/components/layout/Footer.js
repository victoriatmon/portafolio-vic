'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './footer.css';

const EMAIL = 'victoria.tmon@gmail.com';

// Timing for the copy confirmation: grow to fit the confirmation label, hold
// so it's readable, then shrink back and swap the label/icon back to the
// idle "Email" state. REVERT_MS covers the full grow + hold + shrink window.
const REVERT_MS = 2200;

const CopyIcon = () => (
  // Same two-square "copy" silhouette as before, now filled instead of
  // outline -- the front square gets a thin bg-colored stroke so the two
  // squares still read as separate shapes instead of merging into one blob.
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="12" height="12" rx="2"></rect>
    <rect x="9" y="9" width="12" height="12" rx="2" stroke="#151414" strokeWidth="1.5"></rect>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Shared across all 3 routes.
export default function Footer() {
  // Victoria wants Email to copy the address instead of opening a mail
  // client (mailto: assumes the visitor has one configured, which a lot
  // of people checking a portfolio from a work laptop or phone don't) --
  // click copies EMAIL to the clipboard and swaps the button's label/icon
  // (icon on the right of the text) to a green "Email copied!" checkmark,
  // with the button growing/shrinking to fit the new label, then reverts
  // on its own.
  const [copied, setCopied] = useState(false);
  const [widths, setWidths] = useState({ idle: null, copied: null });
  const idleRef = useRef(null);
  const copiedRef = useRef(null);
  const timersRef = useRef([]);

  useLayoutEffect(() => {
    const measure = () => {
      if (idleRef.current && copiedRef.current) {
        setWidths({
          idle: idleRef.current.getBoundingClientRect().width,
          copied: copiedRef.current.getBoundingClientRect().width,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    // Fonts finishing their load after first paint can shift these widths --
    // remeasure once they're ready rather than locking in a wrong value.
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      // Clipboard API can refuse (no HTTPS, no permission, older Safari).
      // Fall back to the old hidden-textarea + execCommand trick rather
      // than silently doing nothing.
      try {
        const ta = document.createElement('textarea');
        ta.value = EMAIL;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        return; // Genuinely couldn't copy -- don't claim success.
      }
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setCopied(true);

    timersRef.current.push(setTimeout(() => setCopied(false), REVERT_MS));
  }

  const width = copied ? widths.copied : widths.idle;

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
          className="footer-btn"
          href="https://www.linkedin.com/in/victoria-talamantes-montanez"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <button
          type="button"
          className={'footer-btn footer-btn-email' + (copied ? ' is-copied' : '')}
          onClick={handleCopyEmail}
          style={width != null ? { width: `${width}px` } : undefined}
        >
          <span>{copied ? 'Email copied!' : 'Email'}</span>
          <span className="footer-btn-email-icon">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>
        {/* Off-screen measurers: same markup as the two button states, used only to
            read their natural (text + gap + icon) width so the button can animate
            between fixed px widths instead of snapping instantly on label change. */}
        <span className="footer-btn-email-measure" aria-hidden="true" ref={idleRef}>
          <span>Email</span>
          <span className="footer-btn-email-icon"><CopyIcon /></span>
        </span>
        <span className="footer-btn-email-measure" aria-hidden="true" ref={copiedRef}>
          <span>Email copied!</span>
          <span className="footer-btn-email-icon"><CheckIcon /></span>
        </span>
        <a className="footer-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
          Resume
        </a>
      </nav>
    </footer>
  );
}
