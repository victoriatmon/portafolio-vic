'use client';

import { useEffect, useRef, useState } from 'react';
import './footer.css';

const EMAIL = 'victoria.tmon@gmail.com';

// Shared across all 3 routes.
export default function Footer() {
  // Victoria wants Email to copy the address instead of opening a mail
  // client (mailto: assumes the visitor has one configured, which a lot
  // of people checking a portfolio from a work laptop or phone don't) --
  // click copies EMAIL to the clipboard and swaps the button's label/icon
  // to a green "Email copied!" checkmark for a couple seconds, then
  // reverts on its own.
  const [copied, setCopied] = useState(false);
  const revertTRef = useRef(null);
  useEffect(() => () => clearTimeout(revertTRef.current), []);

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
    setCopied(true);
    clearTimeout(revertTRef.current);
    revertTRef.current = setTimeout(() => setCopied(false), 2200);
  }

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
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="12" height="12" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
          <span>{copied ? 'Email copied!' : 'Email'}</span>
        </button>
        <a className="footer-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
          Resume
        </a>
      </nav>
    </footer>
  );
}
