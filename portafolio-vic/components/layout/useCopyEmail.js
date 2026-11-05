'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const EMAIL = 'victoria.tmon@gmail.com';

// Timing for the copy confirmation: grow to fit the confirmation label, hold
// so it's readable, fade the "Email copied!" content out in place, THEN
// swap the label/icon back to idle (shrinking + fading the new content in).
// Without that fade-out step the old content was unmounted instantly (React
// doesn't animate unmounts on its own) right as the new content faded in --
// a hard, unprompted cut that read as the least natural part of the whole
// sequence, since (unlike the click) nothing the visitor did cued it.
// HOLD_MS is from click to the start of that fade-out; LEAVE_MS is the
// fade-out's own duration, after which the real swap happens.
const HOLD_MS = 2020;
const LEAVE_MS = 180;

// Shared by the desktop footer's Email button and the mobile menu sheet's
// Email button: copies EMAIL to the clipboard instead of opening a mail
// client (mailto: assumes the visitor has one configured, which isn't a
// safe assumption for someone checking the portfolio from a work laptop or
// phone), swaps the label/icon to a green "Email copied!" checkmark, and
// measures the idle/copied markup (passed in as refs) so the caller can
// animate its width between the two states instead of snapping instantly.
export function useCopyEmail() {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
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
    setLeaving(false);
    setCopied(true);

    timersRef.current.push(setTimeout(() => setLeaving(true), HOLD_MS));
    timersRef.current.push(
      setTimeout(() => {
        setCopied(false);
        setLeaving(false);
      }, HOLD_MS + LEAVE_MS)
    );
  }

  return {
    copied,
    leaving,
    idleRef,
    copiedRef,
    width: copied ? widths.copied : widths.idle,
    handleCopyEmail,
  };
}
