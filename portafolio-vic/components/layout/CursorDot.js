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
const EDGE_MARGIN = 16; // keeps the pill from ever touching the viewport edge

export default function CursorDot() {
  const activeLabelCellRef = useRef(null);
  const labelPillWidthRef = useRef(0);

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

      const labelTarget = e.target.closest ? e.target.closest(LABEL_SELECTOR) : null;
      if (labelTarget) {
        if (activeLabelCellRef.current !== labelTarget) {
          activeLabelCellRef.current = labelTarget;
          const text = labelTarget.getAttribute('data-cursor-label') || '';
          if (label) label.textContent = text;
          if (measurer) {
            measurer.textContent = text;
            labelPillWidthRef.current = measurer.offsetWidth + LABEL_PADDING;
            dot.style.width = labelPillWidthRef.current + 'px';
          }
          dot.classList.remove('is-hovering');
          dot.classList.add('is-labeling');
        }
        // The side deck cards (e.g. Projects' prev/next ghosts) sit right at
        // the screen's edge, so a pill centered on the raw pointer position
        // would run off-screen and get clipped -- this was missing from the
        // port (ported from the artifact's Projects.dc.html _onCursorMove,
        // which has the identical clamp + comment). Clamp its center so the
        // whole pill always stays inside the viewport, with a small margin;
        // it still tracks the pointer everywhere else, it just stops short
        // of the edge instead of overflowing it.
        const half = labelPillWidthRef.current / 2;
        const minX = EDGE_MARGIN + half;
        const maxX = window.innerWidth - EDGE_MARGIN - half;
        const cx = Math.min(Math.max(e.clientX, minX), maxX);
        dot.style.transform = 'translate3d(' + cx + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)';
        return;
      }
      if (activeLabelCellRef.current) {
        activeLabelCellRef.current = null;
        dot.classList.remove('is-labeling');
        dot.style.width = '';
      }

      dot.style.transform =
        'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)';
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
