'use client';

import { useEffect, useRef } from 'react';
import './cursor.css';

// Custom cursor: a small blue dot that follows the pointer 1:1, blooms into
// a larger translucent circle over anything clickable, and morphs into a
// blue pill with a caption while hovering a photo/text cell that declares
// data-cursor-label. Desktop-only -- the @media(hover:none),(pointer:coarse)
// rule in cursor.css hides the dot itself on touch, this just also skips
// attaching the listeners there. Ported verbatim from AboutMe.dc.html.
//
// Hover state is derived fresh from each mousemove's own target (the
// element genuinely under the pointer at that instant) instead of tracked
// via separate enter/leave events -- pointerover/pointerout pairing can
// misfire its relatedTarget across browsers and input types.
const HOVER_SELECTOR =
  'a, button, [role="button"], input, textarea, select, label, [onclick], .card-face, .mode-tab, .task-card';
const LABEL_SELECTOR = '[data-cursor-label]';
const LABEL_PADDING = 32; // matches the 16px + 16px horizontal padding on .cursor-dot.is-labeling

export default function CursorDot() {
  const activeLabelCellRef = useRef(null);

  useEffect(() => {
    const dot = document.querySelector('.cursor-dot');
    const label = document.querySelector('.cursor-dot-label');
    const measurer = document.querySelector('.cursor-dot-measure');
    if (!dot) return;

    function onMove(e) {
      // Confirms the custom cursor is really tracking before hiding the
      // native one -- see the cursor:none rule in globals.css.
      document.documentElement.classList.add('cursor-ready');
      dot.style.opacity = '1';
      dot.style.transform =
        'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)';

      const labelTarget = e.target.closest ? e.target.closest(LABEL_SELECTOR) : null;
      if (labelTarget) {
        if (activeLabelCellRef.current !== labelTarget) {
          activeLabelCellRef.current = labelTarget;
          const text = labelTarget.getAttribute('data-cursor-label') || '';
          if (label) label.textContent = text;
          if (measurer) {
            measurer.textContent = text;
            dot.style.width = measurer.offsetWidth + LABEL_PADDING + 'px';
          }
          dot.classList.remove('is-hovering');
          dot.classList.add('is-labeling');
        }
        return;
      }
      if (activeLabelCellRef.current) {
        activeLabelCellRef.current = null;
        dot.classList.remove('is-labeling');
        dot.style.width = '';
      }

      const hoverTarget = e.target.closest ? e.target.closest(HOVER_SELECTOR) : null;
      dot.classList.toggle('is-hovering', !!hoverTarget);
    }

    function onLeaveDoc() {
      dot.style.opacity = '0';
      activeLabelCellRef.current = null;
      dot.classList.remove('is-labeling', 'is-hovering');
      dot.style.width = '';
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('mouseleave', onLeaveDoc);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeaveDoc);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" aria-hidden="true">
        <span className="cursor-dot-label"></span>
      </div>
      <span className="cursor-dot-measure" aria-hidden="true"></span>
    </>
  );
}
