'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { consumeEnterFlag, playEnterContentFade } from '@/lib/pageTransitions';
import { VictorAIChatProvider } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/layout/Footer';
import CursorDot from '@/components/layout/CursorDot';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import './about.css';

// Ported from AboutMe.dc.html. The VictorAI chat, the custom cursor and the
// navbar/footer chrome are all handled by the shared components above --
// this file only owns the page's own point: the Personal/Professional mode
// toggle, the photo grid, the task board (drag + full keyboard support +
// confetti), and the desktop fit-scaling of the whole page.

const COL_ORDER = ['backlog', 'progress', 'done'];
const COL_TITLES = { backlog: 'Backlog', progress: 'In progress', done: 'Done' };
const BOARD_COLS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'progress', title: 'In progress' },
  { id: 'done', title: 'Done' },
];
const INITIAL_TASKS = [
  { id: 't1', title: 'Plan 1:1 meetings', priority: 'High', col: 'backlog' },
  { id: 't2', title: 'Plan mexican dinner night', priority: 'Medium', col: 'backlog' },
  { id: 't3', title: 'Develop last film roll', priority: 'Low', col: 'backlog' },
  { id: 't4', title: 'Feed VictorAI relevant info', priority: 'Medium', col: 'progress' },
  { id: 't5', title: 'Send portfolio to prod', priority: 'High', col: 'progress' },
  { id: 't6', title: 'Reply to all emails', priority: 'Low', col: 'done' },
];

function colAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const colEl = el && el.closest ? el.closest('[data-col]') : null;
  return colEl ? colEl.getAttribute('data-col') : null;
}

function initialAboutMode() {
  if (typeof window === 'undefined') return 'personal';
  try {
    return new URLSearchParams(window.location.search).get('mode') === 'professional'
      ? 'professional'
      : 'personal';
  } catch {
    return 'personal';
  }
}

export default function AboutDesktop() {
  const [aboutMode, setAboutMode] = useState(initialAboutMode);
  const [tabMode, setTabMode] = useState(initialAboutMode);
  const [swap, setSwap] = useState('');
  // Starts true on both server and client (a plain constant, no hydration
  // mismatch) and is flipped to false exactly once, in the useLayoutEffect
  // below. Why this needs to be state and not just an imperative
  // `classList.remove('is-pending-enter')` on mount: pageClass is a
  // *computed* string that already changes across re-renders for other
  // reasons (isPersonal, swap) -- unlike Proyectos' static JSX literal
  // (`className="page proyectos-desktop is-pending-enter"`), where the
  // string value never changes, so React never rewrites that attribute
  // once the one-time effect has removed it by hand. Here, any later
  // re-render -- e.g. clicking Personal/Professional, which touches
  // aboutMode/tabMode/swap -- recomputes a *different* pageClass string
  // (now with ' is-pro' or ' is-leaving' mixed in), and because that
  // string still unconditionally appended ' is-pending-enter', React would
  // diff it against the previous render's className, see a change, and
  // write the new value to the DOM -- silently reintroducing the class
  // (and its opacity:0) *every single time this component re-renders*,
  // including on a plain mode switch with nothing to do with page-arrival.
  // That's the "goes black when I switch to Professional" bug. Tracking
  // the resolved/unresolved state in React itself means pageClass stops
  // including it for good after the first paint, however many times the
  // component re-renders afterwards.
  const [pendingEnter, setPendingEnter] = useState(true);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [drag, setDrag] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [lastDrop, setLastDrop] = useState(null);
  const [interacted, setInteracted] = useState(false);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

  const swappingRef = useRef(false);
  const swapT1 = useRef(null);
  const swapT2 = useRef(null);
  const switchModeFitT = useRef(null);
  const lastDropT = useRef(null);
  const confettiStartT = useRef(null);
  const kbRefocusT = useRef(null);
  const confettiRaf = useRef(null);
  const dragInfoRef = useRef(null);
  const fitApplyRef = useRef(null);
  const scopeRef = useRef(null);

  // ---- Desktop fit-scaling: scales the fixed 1440-wide .page to the real
  // window width (capped at 1.25x), with a min-height compensation so the
  // page keeps scrolling past the scaled-down visual height. Navbar, chat
  // panel and cursor dot are markup siblings of [data-page], not inside it,
  // so they aren't affected by the transform. ----
  useEffect(() => {
    const stage = document.querySelector('[data-page]');
    if (!stage) return;
    const navbar = document.querySelector('[data-nav]');
    const footerEl = document.querySelector('[data-site-footer]');
    function apply() {
      const scale = Math.min(window.innerWidth / 1440, 1.25);
      stage.style.transform = 'scale(' + scale + ')';
      const navH = navbar ? navbar.offsetHeight : 0;
      const footH = footerEl ? footerEl.offsetHeight : 0;
      document.body.style.minHeight = navH + stage.offsetHeight * scale + footH + 'px';
    }
    fitApplyRef.current = apply;

    // See the identical effect in HomeDesktop.js / ProyectosDesktop.js for
    // why a single synchronous call on mount isn't reliable on its own: it
    // can run before the browser has really settled layout (web fonts
    // loading via @import in globals.css, or just the very first paint),
    // and then stay wrong forever since nothing but a real window 'resize'
    // re-triggers it. Confirmed live on Home's identical pattern. Same fix
    // here: defer the first call past a real layout pass, and re-run once
    // fonts finish loading. Not watching navbar/footer/stage via
    // ResizeObserver here, since this effect's own writes (stage's
    // transform, body's minHeight) don't change THEIR box sizes, so there's
    // nothing extra a ResizeObserver on them would catch beyond what the
    // mode-switch callers already re-trigger via fitApplyRef.
    let rafId1 = 0;
    let rafId2 = 0;
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(apply);
    });
    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) apply();
      }).catch(() => {});
    }

    apply();
    window.addEventListener('resize', apply);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.removeEventListener('resize', apply);
      fitApplyRef.current = null;
    };
  }, []);

  // Cross-page nav transition: this page has no reveal of its own (unlike
  // Home's load-time fade or Proyectos' arrive), so when reached via
  // Navbar's attachNavTransition both the blue line and a whole-page
  // fade/drift-in play. See lib/pageTransitions.js.
  //
  // .is-pending-enter is now in the JSX unconditionally (see pageClass
  // below), not only when a nav-arrival flag is present. Reasoning: this
  // component is server-rendered (Next.js App Router SSRs 'use client'
  // components for their initial HTML), and sessionStorage -- what
  // consumeEnterFlag() reads -- doesn't exist on the server. An earlier
  // version computed "is this a nav-arrival" during render via a ref and
  // only included is-pending-enter conditionally; that's necessarily
  // `false` in the server-rendered HTML (no window there) but can be
  // `true` once this same render function re-runs on the client during
  // hydration. On a flagged arrival that mismatch meant the server HTML
  // painted fully visible for however long hydration took, THEN snapped
  // invisible the instant hydration added the class, THEN faded back in
  // -- a visible/invisible/visible stutter, worse than no transition at
  // all, and more noticeable the heavier the page's hydration is (which
  // is exactly why this read as "entra de golpe" specifically on
  // Proyectos, the heaviest client component here, rather than here).
  //
  // Starting every load hidden and resolving visibility in
  // useLayoutEffect (not useEffect) fixes both sides: it runs
  // synchronously after the DOM commits but before the browser paints,
  // so whichever way the flag resolves, the class is already corrected
  // before anything is shown -- no server/client mismatch (both always
  // start hidden), and no flash on a plain direct load either (removed
  // pre-paint, same tick).
  useLayoutEffect(() => {
    const arriving = consumeEnterFlag();
    setPendingEnter(false);
    if (arriving) playEnterContentFade();
  }, []);

  // ---- Clear every tracked timer/raf and any still-attached drag
  // listeners on unmount. ----
  useEffect(() => {
    return () => {
      clearTimeout(swapT1.current);
      clearTimeout(swapT2.current);
      clearTimeout(switchModeFitT.current);
      clearTimeout(lastDropT.current);
      clearTimeout(confettiStartT.current);
      clearTimeout(kbRefocusT.current);
      if (confettiRaf.current) cancelAnimationFrame(confettiRaf.current);
      document.removeEventListener('pointermove', handleDragMove);
      document.removeEventListener('pointerup', handleDragEnd);
      document.removeEventListener('pointercancel', handleDragEnd);
      document.removeEventListener('pointerleave', handleDragCancel);
      window.removeEventListener('blur', handleDragCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPersonal() {
    switchMode('personal');
  }
  function setProfessional() {
    switchMode('professional');
  }

  // Curtain out (320ms) -> swap content -> curtain in with staggered
  // entrance. Hero, photo and tabs are outside the animated sections, so
  // they stay put. Personal/pro have different content below the hero, so
  // the fit-scale's min-height (see the effect above) goes stale the
  // moment the swap lands unless re-applied once the DOM has it -- 40ms
  // gives the new content a moment to actually mount first.
  function switchMode(mode) {
    if (swappingRef.current || tabMode === mode) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setAboutMode(mode);
      setTabMode(mode);
      setSwap('');
      switchModeFitT.current = setTimeout(() => {
        if (fitApplyRef.current) fitApplyRef.current();
      }, 40);
      return;
    }
    swappingRef.current = true;
    setTabMode(mode);
    setSwap('is-leaving');
    swapT1.current = setTimeout(() => {
      setAboutMode(mode);
      setSwap('is-entering');
      switchModeFitT.current = setTimeout(() => {
        if (fitApplyRef.current) fitApplyRef.current();
      }, 40);
      swapT2.current = setTimeout(() => {
        setSwap('');
        swappingRef.current = false;
      }, 1000);
    }, 330);
  }

  // ---- Task board: drag + full keyboard support ----

  function dragStart(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    const cardEl = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget : e.target.closest('.task-card');
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const info = { id, offX: e.clientX - rect.left, offY: e.clientY - rect.top, w: rect.width };
    dragInfoRef.current = info;
    setDrag({ id, x: e.clientX - info.offX, y: e.clientY - info.offY, w: info.w });
    setOverCol(null);
    setInteracted(true);
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
    document.addEventListener('pointercancel', handleDragEnd);
    // If the pointer leaves the browser window entirely while a card is
    // held (dragged off the top/side of the page, or the user alt-tabs
    // away) with the mouse button still down, neither pointerup nor
    // pointercancel ever reaches the document, so without this the drag
    // would get stuck. pointerleave on `document` fires only when the
    // pointer actually leaves the page, `blur` covers the keyboard-driven
    // case -- either cancels the drag outright (see handleDragCancel)
    // rather than guessing a drop target from stale coordinates.
    document.addEventListener('pointerleave', handleDragCancel);
    window.addEventListener('blur', handleDragCancel);
  }

  const removeDragListeners = useCallback(() => {
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    document.removeEventListener('pointercancel', handleDragEnd);
    document.removeEventListener('pointerleave', handleDragCancel);
    window.removeEventListener('blur', handleDragCancel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragMove = useCallback((e) => {
    const d = dragInfoRef.current;
    if (!d) return;
    setDrag({ id: d.id, x: e.clientX - d.offX, y: e.clientY - d.offY, w: d.w });
    setOverCol(colAt(e.clientX, e.clientY));
  }, []);

  // Ends the drag with no drop -- the pointer left the window (or the
  // window lost focus) while a card was held, so there's no meaningful
  // coordinate left to resolve a target column from. The card stays put.
  const handleDragCancel = useCallback(() => {
    removeDragListeners();
    dragInfoRef.current = null;
    setDrag(null);
    setOverCol(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = useCallback((e) => {
    const d = dragInfoRef.current;
    removeDragListeners();
    dragInfoRef.current = null;
    if (!d) return;
    const target = colAt(e.clientX, e.clientY);
    setTasks((prevTasks) => {
      let nextTasks = prevTasks;
      if (target) {
        const moving = prevTasks.find((t) => t.id === d.id);
        if (moving && moving.col !== target) {
          nextTasks = prevTasks.filter((t) => t.id !== d.id).concat([{ ...moving, col: target }]);
        }
      }
      const wasAllDone = prevTasks.every((t) => t.col === 'done');
      const nowAllDone = nextTasks.every((t) => t.col === 'done');
      const movedId = nextTasks !== prevTasks ? d.id : null;
      setLastDrop(movedId);
      if (movedId) lastDropT.current = setTimeout(() => setLastDrop(null), 450);
      if (nowAllDone && !wasAllDone) confettiStartT.current = setTimeout(() => startConfetti(), 40);
      if (!nowAllDone) stopConfetti();
      return nextTasks;
    });
    setDrag(null);
    setOverCol(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard alternative to dragging: a focused card moves one column over
  // on ArrowLeft/ArrowRight (same column order the board renders), since
  // cards have no meaningful order within a column. Mirrors the same
  // confetti/settle side effects as a mouse drop, re-focuses the moved card
  // once the next render has it in its new column, and announces the move
  // for screen reader users via the live region.
  function moveTaskByKeyboard(id, dir) {
    const moving = tasks.find((t) => t.id === id);
    if (!moving) return;
    const idx = COL_ORDER.indexOf(moving.col);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= COL_ORDER.length) return;
    const target = COL_ORDER[newIdx];
    const tasksNext = tasks.filter((t) => t.id !== id).concat([{ ...moving, col: target }]);
    const wasAllDone = tasks.every((t) => t.col === 'done');
    const nowAllDone = tasksNext.every((t) => t.col === 'done');
    setTasks(tasksNext);
    setLastDrop(id);
    setInteracted(true);
    setMoveAnnouncement(moving.title + ' moved to ' + COL_TITLES[target]);
    lastDropT.current = setTimeout(() => setLastDrop(null), 450);
    if (nowAllDone && !wasAllDone) confettiStartT.current = setTimeout(() => startConfetti(), 40);
    if (!nowAllDone) stopConfetti();
    kbRefocusT.current = setTimeout(() => {
      const el = document.querySelector('.task-card[data-task-id="' + id + '"]');
      if (el) el.focus();
    }, 40);
  }

  function onCardKeyDown(e, id) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveTaskByKeyboard(id, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveTaskByKeyboard(id, -1);
    }
  }

  // ---- Paper confetti (canvas, simple physics). Two poppers fire from the
  // bottom corners, pieces slow fast from air drag then drift down at a
  // steady terminal speed while tumbling, followed by a light rain. ----
  function startConfetti() {
    const cv = document.querySelector('.confetti-canvas');
    if (!cv) return;
    stopConfetti();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = [
      [0, 102, 255], [245, 183, 0], [232, 86, 58], [62, 196, 109],
      [122, 92, 240], [255, 122, 182], [245, 245, 245], [46, 196, 182], [255, 159, 28],
    ];
    const R = (a, b) => a + Math.random() * (b - a);
    const parts = [];
    const make = (x, y, vx, vy, t0) => {
      const kind = Math.random();
      let w, h, shape = 'rect';
      if (kind < 0.6) { w = R(8, 12); h = R(12, 18); }
      else if (kind < 0.76) { w = R(9, 12); h = w; }
      else if (kind < 0.9) { w = R(7, 10); h = w; shape = 'dot'; }
      else { w = R(3.5, 5); h = R(22, 30); }
      const k = R(2.3, 3.4);
      const vt = R(210, 320);
      parts.push({
        x, y, vx, vy, t0, k, g: k * vt,
        w, h, shape,
        rot: R(0, 6.28), rotV: R(-3, 3),
        flip: R(0, 6.28), flipV: R(6, 15) * (Math.random() < 0.5 ? 1 : -1),
        wph: R(0, 6.28), wf: R(3, 6), wamp: R(10, 28),
        c: palette[Math.floor(Math.random() * palette.length)],
      });
    };
    const popper = (side, count, t0) => {
      for (let i = 0; i < count; i++) {
        const a = (R(52, 80) * Math.PI) / 180;
        const speed = R(0.8, 1.45) * H * 1.7;
        const dir = side === 'L' ? 1 : -1;
        make(side === 'L' ? -10 : W + 10, H + 10, dir * Math.cos(a) * speed, -Math.sin(a) * speed, t0 + R(0, 0.12));
      }
    };
    popper('L', 55, 0);
    popper('R', 55, 0);
    popper('L', 35, 0.45);
    popper('R', 35, 0.45);
    for (let i = 0; i < 70; i++) make(R(0, W), R(-60, -10), R(-30, 30), R(40, 140), R(0.5, 2.4));

    const start = performance.now();
    let last = start;
    const draw = (p) => {
      const sh = 0.6 + 0.4 * Math.abs(Math.cos(p.flip));
      ctx.fillStyle = 'rgb(' + Math.round(p.c[0] * sh) + ',' + Math.round(p.c[1] * sh) + ',' + Math.round(p.c[2] * sh) + ')';
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      if (p.shape === 'dot') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, 6.2832);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    };
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.done) continue;
        if (t < p.t0) { alive++; continue; }
        p.vx -= p.k * p.vx * dt;
        p.vy += (p.g - p.k * p.vy) * dt;
        p.wph += p.wf * dt;
        p.x += (p.vx + Math.sin(p.wph) * p.wamp) * dt;
        p.y += p.vy * dt;
        p.rot += p.rotV * dt;
        p.flip += p.flipV * dt;
        if (p.y > H + 40 || p.x < -120 || p.x > W + 120) { p.done = true; continue; }
        alive++;
        draw(p);
      }
      confettiRaf.current = alive > 0 ? requestAnimationFrame(step) : null;
    };
    confettiRaf.current = requestAnimationFrame(step);
  }

  function stopConfetti() {
    if (confettiRaf.current) cancelAnimationFrame(confettiRaf.current);
    confettiRaf.current = null;
  }

  // ---- Derived render values ----
  const isPersonal = aboutMode !== 'professional';
  const tabPersonal = tabMode !== 'professional';
  const nudgeClass = tabPersonal ? 'is-nudging' : '';
  const pageClass =
    'page' +
    (isPersonal ? '' : ' is-pro') +
    (swap ? ' ' + swap : '') +
    // `pendingEnter` starts true identically on server and client (see its
    // declaration above), so this is still present at first paint either
    // way -- no hydration mismatch -- but unlike the old unconditional
    // string suffix, it actually stops appearing once the useLayoutEffect
    // resolves it, instead of being silently reapplied by React on every
    // later re-render this component does for unrelated reasons.
    (pendingEnter ? ' is-pending-enter' : '');

  const dragId = drag ? drag.id : null;
  const boardCols = BOARD_COLS.map((c) => {
    const list = tasks.filter((t) => t.col === c.id);
    return {
      id: c.id,
      title: c.title,
      count: list.length,
      isEmpty: list.length === 0 && !drag,
      dotClass: 'is-' + c.id,
      showSlot: !!drag && overCol === c.id && (tasks.find((x) => x.id === drag.id) || {}).col !== c.id,
      overClass: overCol === c.id ? 'is-over' : '',
      cards: list.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        pillClass: 'is-' + t.priority.toLowerCase(),
        titleClass: c.id === 'done' ? 'is-done' : '',
        isDone: c.id === 'done',
        stateClass: [
          c.id === 'done' ? 'is-done' : '',
          lastDrop === t.id ? 'is-settle' : '',
          !interacted && t.id === 't1' && c.id === 'backlog' ? 'is-nudge' : '',
        ].join(' '),
        dragClass: dragId === t.id ? 'is-dragging' : '',
      })),
    };
  });
  const allDone = tasks.every((t) => t.col === 'done');
  const dragged = drag ? tasks.find((t) => t.id === drag.id) : null;
  const progressStyle = {
    width: Math.round((100 * tasks.filter((t) => t.col === 'done').length) / tasks.length) + '%',
  };
  const progressText = tasks.filter((t) => t.col === 'done').length + '/' + tasks.length + ' done';

  return (
    <VictorAIChatProvider topics={TOPICS} starters={STARTERS}>
      <Navbar current="about" />
      <CursorDot />

      {/* Scope wrapper: isolates about.css's selectors (e.g. .page,
          .about-grid) from AboutMobile's about-mobile.css, which Next.js
          bundles into this route's client CSS regardless of which variant
          actually renders -- see about-desktop-scope / about-mobile-scope
          in the matching .css files. */}
      <div className="about-desktop-scope" ref={scopeRef}>
      <main data-page className={pageClass}>
        <section className="about-hero">
          <div className="about-hero-left">
            <h1 className="is-pro">
              I&apos;m Victoria, a product
              <br />
              designer who invests in what
              <br />
              <span className="accent-italic">moves the needle</span>
            </h1>
            <p className="about-hero-sub">Based in Eindhoven, originally from México</p>
            <div className="mode-tabs" style={{ backgroundColor: '#2A2A2A' }}>
              <div
                className={`mode-indicator ${nudgeClass}`}
                style={{ transform: 'translateX(' + (tabPersonal ? 0 : 42) + 'px)' }}
              />
              <button
                className={`mode-tab ${tabPersonal ? 'is-active' : ''} ${nudgeClass}`}
                type="button"
                aria-label="Personal"
                onClick={setPersonal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </button>
              <button
                className={`mode-tab ${tabPersonal ? '' : 'is-active'}`}
                type="button"
                aria-label="Professional"
                onClick={setProfessional}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="about-hero-right">
            <div className="portrait" style={{ height: 232, width: 232 }}>
              <img src="/about-portrait.png" alt="Portrait of Victoria" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            {!isPersonal && (
              <a className="resume-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
                <span>Download Resume</span>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
            )}
          </div>
        </section>

        {isPersonal && (
          <div className="about-grid">
            <div className="about-cell is-text is-centered" style={{ height: 306 }} data-cursor-label="¡Hola! Mucho gusto">
              <p className="about-copy" style={{ margin: 0, fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: 2, textAlign: 'start' }}>
                Outside of design I&apos;m a person who loves photography, coffee hopping, hiking and during the last year I&apos;ve taken back the habit of reading.
              </p>
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Nederlandse uitzichten">
              <img src="/about-horses.png" alt="Horses in a misty field" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Left... Right...">
              <img src="/about-skiers.png" alt="Aerial view of skiers on a slope" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Moo">
              <img src="/about-cow.png" alt="Close-up of a cow" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>

            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Smile!">
              <img src="/about-snow-photo.png" alt="Victoria taking a photo in the snow" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Hiking & photos">
              <img src="/about-hiking.png" alt="Victoria hiking with a friend" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell is-text is-block" style={{ height: 306 }} data-cursor-label="At least it's not Portra...">
              <div className="about-text-block">
                <p className="about-list-title" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 14, lineHeight: '20px' }}>
                  My go to photography films:
                </p>
                <ul className="about-list">
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '20px' }}>Kodak Gold 200, for warm tinted pictures.</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '20px' }}>Fujifilm 200, is my go to neutral film.</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '20px' }}>Ilford HP5 Plus 400, for a nice crisp of B&amp;W.</li>
                </ul>
              </div>
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Zoomies time">
              <img src="/about-film-canisters.png" alt="Victoria looking through film canisters" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>

            <div className="about-cell" style={{ height: 306 }} data-cursor-label="My type of book club">
              <img src="/about-reading-outdoors.png" alt="Victoria reading with a friend outdoors" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell is-text is-block" style={{ height: 306 }} data-cursor-label="Now tell me yours!">
              <div className="about-text-block">
                <p className="about-list-title" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 14, lineHeight: 1.6 }}>
                  My book recommendations at the moment:
                </p>
                <ul className="about-list">
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: 1.6 }}>Recollections of Things to Come by Elena Garro</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: 1.6 }}>The Servant by James C. Hunter</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14, lineHeight: 1.6 }}>The Shadow of the Wind by Carlos Ruiz Zafón</li>
                </ul>
              </div>
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="All I want for Christmas... is a job">
              <img src="/about-snowy-cabin.png" alt="Snowy cabin in the woods" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="I don't even like coffee...">
              <img src="/about-restaurant.png" alt="Restaurant table setting" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>

            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Dramatic look away...">
              <img src="/about-bear.png" alt="Close-up of a black bear" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Mountains in my home city">
              <img src="/about-mountain.png" alt="Mountain landscape" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell" style={{ height: 306 }} data-cursor-label="Yes, I was doing my portfolio here">
              <img src="/about-cafe-group.png" alt="Group at a cafe" style={{ objectPosition: '50% 50%', objectFit: 'cover' }} />
            </div>
            <div className="about-cell is-text is-block" style={{ height: 306 }} data-cursor-label="Insert mariachi music">
              <div className="about-text-block">
                <p className="about-list-title" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 14 }}>
                  Few reasons why I&apos;m proud to be Mexican:
                </p>
                <ul className="about-list">
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14 }}>Warm feeling and community sense</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14 }}>Amazing food that is a world heritage</li>
                  <li style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 14 }}>Our resilience and improvisation</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isPersonal && (
          <>
            <section className="pro-cols">
              <div>
                <h2 className="pro-h2">Full-cycle product designer</h2>
                <p className="pro-body">
                  I define the problem behind a product flow and design the solution, stay hands on while it gets built, then read the data and decide what to improve next. The cycle never really ends: every release is the starting point for the next one.
                </p>
              </div>
              <div>
                <h2 className="pro-h2">Where I am now</h2>
                <p className="pro-body">
                  I have 2+ years designing products where I started as a Product Designer and grew into the position of Lead Product Designer. I co-lead 3 designers and 6 engineers and use AI throughout that cycle, including discovery to vibe coding to prototype ideas early.
                </p>
              </div>
              <div>
                <h2 className="pro-h2">Clearing the path</h2>
                <p className="pro-body">
                  I clear the stones from my team&apos;s path, starting with context. I tell the user&apos;s problem almost like gossip so everyone gets hooked on the story and wants to solve it. I give work as small challenges, imagining the ideal solution first and working backwards, guided by servant leadership.
                </p>
              </div>
            </section>

            <section className="pro-lower">
              <div>
                <div className="board-wrap">
                  <div className={`board ${drag ? 'is-dragging' : ''}`}>
                    {boardCols.map((col) => (
                      <div key={col.id} className={`board-col ${col.overClass}`} data-col={col.id} role="group" aria-label={`${col.title} column`}>
                        <div className="board-col-head">
                          <span className="board-col-name">
                            <i className={`board-dot ${col.dotClass}`} />
                            <span className="board-col-title">{col.title}</span>
                          </span>
                          <span className="board-col-count">{col.count}</span>
                        </div>
                        {col.cards.map((card) => (
                          <div
                            key={card.id}
                            className={`task-card ${card.dragClass} ${card.stateClass}`}
                            onPointerDown={(e) => dragStart(e, card.id)}
                            onKeyDown={(e) => onCardKeyDown(e, card.id)}
                            data-task-id={card.id}
                            tabIndex={0}
                            role="button"
                            aria-label={`${card.title}, ${card.priority} priority, in ${col.title} column. Press left or right arrow to move it to another column.`}
                          >
                            <div className={`task-title ${card.titleClass}`}>{card.title}</div>
                            <span className={`task-pill ${card.pillClass}`}>{card.priority}</span>
                            {card.isDone && (
                              <svg className="task-check" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                            )}
                          </div>
                        ))}
                        {col.showSlot && <div className="board-slot" />}
                        {col.isEmpty && <div className="board-empty">Drop a task here</div>}
                      </div>
                    ))}
                  </div>
                  {/* The ghost drag-card and the confetti canvas both need
                      position:fixed in real viewport pixels, which means
                      escaping the scaled [data-page] box (see the fit-scale
                      effect above). They used to be rendered here and then
                      moved to document.body by hand with appendChild -- but
                      document.body sits outside .about-desktop-scope, so
                      that both stripped their CSS (scoped under that class)
                      and, worse, crashed React: once the card/canvas
                      condition went false again, React tried to remove the
                      node from the parent it originally mounted it under,
                      not the body it had been manually moved to, throwing
                      "Failed to execute 'removeChild' on 'Node'" and taking
                      down the whole page. A portal into .about-desktop-scope
                      itself (a sibling of [data-page], so still unscaled)
                      fixes both: React owns the move, and the scoped CSS
                      still applies. */}
                  {allDone && scopeRef.current && createPortal(
                    <canvas className="confetti-canvas" aria-hidden="true" />,
                    scopeRef.current
                  )}
                  <div className="sr-only" aria-live="polite">{moveAnnouncement}</div>
                </div>
                {dragged && scopeRef.current && createPortal(
                  <div className="task-card is-floating" style={{ left: drag.x, top: drag.y, width: drag.w }}>
                    <div className="task-title">{dragged.title}</div>
                    <span className={`task-pill is-${dragged.priority.toLowerCase()}`}>{dragged.priority}</span>
                  </div>,
                  scopeRef.current
                )}
                <div className="board-progress" aria-label="Progress">
                  <div className="board-progress-track">
                    <div className={`board-progress-fill ${allDone ? 'is-complete' : ''}`} style={progressStyle} />
                  </div>
                  <span className="board-progress-text">{progressText}</span>
                </div>
                <p className="board-caption">Move the cards to finish the tasks, it comes with a small reward.</p>

                <div className="impact">
                  <h2 className="pro-h2" style={{ marginBottom: 28 }}>Impact across products, teams and data</h2>
                  <div className="impact-group">
                    <p className="impact-role">Product Designer to Lead Product Designer</p>
                    <p className="impact-meta">Guros (Aug 2024 to Oct 2026)</p>
                    <ul className="impact-list">
                      <li className="impact-row">Raised the share of users completing a key step of the quote flow from 56.5% to 97.4%, contributing to <b>+35.2% total sales year</b> over year.</li>
                      <li className="impact-row">Lead the design of <b>3 connected products</b> (customer site, Contact Center BackOffice and performance dashboard). Won the account with a live prototype built with vibe coding during the pitch.</li>
                      <li className="impact-row"><b>Co-lead a cross-functional team of designers and engineers</b> with an Engineering Manager, sharing ownership of priorities, scope and delivery. Grew the design team from the ground up.</li>
                      <li className="impact-row"><b>Prioritize work by expected impact</b> against implementation cost, and use AI in discovery and prototyping to test ideas early.</li>
                    </ul>
                  </div>
                  <div className="impact-group">
                    <p className="impact-role">UX/UI Designer</p>
                    <p className="impact-meta">Binnacle (Feb to Aug 2024)</p>
                    <p className="impact-solo">Designed desktop, mobile and web interfaces for a metrics dashboard startup and built its design system from scratch.</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="pro-h2">Day to day</h2>
                <ul className="dtd-list">
                  <li className="dtd-row"><span className="dtd-label">Leading projects</span><span className="dtd-desc">Setting design direction and following each flow from problem definition to launch, side by side with engineering.</span></li>
                  <li className="dtd-row"><span className="dtd-label">Designing key flows</span><span className="dtd-desc">Designing critical flows and presenting the reasoning to the team and stakeholders.</span></li>
                  <li className="dtd-row"><span className="dtd-label">AI in the workflows</span><span className="dtd-desc">Using AI in discovery and ideation, including vibe coding prototypes, to test ideas before committing.</span></li>
                  <li className="dtd-row"><span className="dtd-label">Metrics &amp; priorization</span><span className="dtd-desc">Finding where users drop off, prioritizing by impact against cost, and measuring every release to decide what&apos;s next.</span></li>
                  <li className="dtd-row"><span className="dtd-label">Managing &amp; growing people</span><span className="dtd-desc">One-on-ones with growth plans and clear goals for each designer.</span></li>
                  <li className="dtd-row"><span className="dtd-label">Hiring</span><span className="dtd-desc">Designing the case study, reviewing submissions and joining interviews and decisions.</span></li>
                  <li className="dtd-row"><span className="dtd-label">Cross-functional collaboration</span><span className="dtd-desc">Co-leading designers and engineers with an Engineering Manager, sharing ownership of priorities and delivery.</span></li>
                </ul>
              </div>
            </section>
          </>
        )}

        <section className="wordmark-section" aria-hidden="true">
          <div className="wordmark-illustration">
            <svg width="780" height="324" viewBox="0 0 780 324" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M356.756 48.3501C352.947 51.245 350.584 59.5522 350.584 69.8733C350.584 78.4322 346.907 95.0467 344.412 97.6899C342.048 100.207 343.886 100.837 346.513 98.3192C347.957 97.0605 348.089 97.3123 346.907 99.452C346.119 100.962 345.725 102.473 346.119 102.85C347.301 103.983 342.704 104.738 329.835 105.619C316.572 106.626 314.208 108.011 318.541 112.668C320.642 114.934 321.956 115.059 331.28 114.304L341.654 113.423L340.866 120.22C339.29 133.688 334.694 153.826 329.441 169.182C311.713 221.543 312.501 248.101 332.067 253.513C345.068 257.037 361.615 239.416 361.615 222.046C361.615 215.124 360.827 213.236 352.16 197.502C346.381 187.055 346.775 172.077 353.473 138.974C358.857 113.171 360.17 111.913 384.99 109.27C403.9 107.256 408.759 105.494 409.416 99.7037C409.941 95.1725 407.183 93.5363 401.668 94.9208C394.051 96.8088 375.141 99.9555 370.807 99.9555C365.686 99.9555 362.797 97.1864 365.423 94.7949C367.261 92.9069 372.908 66.7266 372.908 60.0557C372.908 53.8882 370.807 49.9863 366.474 47.7207C361.483 45.3293 360.827 45.3293 356.756 48.3501ZM366.999 49.6087C368.575 52.0002 366.211 56.0279 363.584 55.6503C362.14 55.3986 361.089 54.7693 361.089 54.1399C361.221 53.5106 360.564 52.6295 359.776 52.1261C358.857 51.6226 358.594 50.4898 358.988 49.7346C360.17 47.9725 365.948 47.8466 366.999 49.6087ZM338.765 207.446C338.765 208.201 337.846 207.697 336.795 206.439C335.744 205.054 334.825 203.292 334.825 202.663C334.825 201.908 335.744 202.411 336.795 203.67C337.846 205.054 338.765 206.816 338.765 207.446Z" fill="black" />
              <path d="M580.132 60.5591C562.666 69.7474 566.474 93.6621 585.516 93.6621C608.103 93.6621 610.861 63.5799 588.799 58.1677C587.092 57.7901 583.546 58.797 580.132 60.5591ZM594.708 62.8247C597.86 65.7197 594.971 67.2301 586.172 67.1042C577.243 66.8525 576.323 66.349 580.132 63.2023C584.465 59.5522 590.769 59.3005 594.708 62.8247Z" fill="black" />
              <path d="M215.718 59.6784C208.101 62.6992 203.111 75.7893 206.788 83.5931C215.061 101.214 242.113 90.1381 238.305 70.6288C236.335 60.937 225.829 55.7765 215.718 59.6784ZM230.557 62.6992C233.052 64.5872 233.052 64.5872 230.426 66.4752C228.981 67.608 227.011 68.1115 226.092 67.8597C225.042 67.4821 223.072 67.2304 221.758 67.2304C220.183 67.2304 219.526 66.7269 220.051 65.8459C220.577 64.9648 219.92 64.713 218.475 64.9648C217.031 65.2165 216.112 66.3493 216.112 67.608C216.374 69.9995 214.667 70.5029 213.223 68.3632C210.334 63.832 225.304 59.049 230.557 62.6992Z" fill="black" />
              <path d="M496.22 91.6488C498.321 94.0403 495.957 98.6974 492.674 98.6974C491.492 98.6974 489.26 99.075 487.815 99.3267C483.744 100.334 480.986 98.1939 483.087 95.6766C484.269 94.4179 484.401 93.6627 483.35 93.6627C477.441 93.6627 475.733 105.242 478.623 127.773C482.562 158.484 477.703 194.356 463.915 234.508C456.692 255.527 457.611 267.611 466.541 272.268C471.663 274.911 479.542 272.142 484.532 266.1C492.28 256.786 492.937 252.758 493.199 215.124C493.199 196.37 493.987 176.861 494.775 171.7C495.563 166.54 496.614 158.61 497.139 154.079C498.715 139.101 505.281 128.905 513.554 128.905C518.544 128.905 519.595 133.185 516.837 141.114C511.321 156.596 518.675 166.288 532.727 161.883C548.354 156.974 555.183 133.311 545.202 118.962C533.383 102.222 525.635 98.8232 509.483 103.606C505.018 104.865 505.018 104.991 510.796 104.236C514.079 103.858 518.544 103.229 520.777 102.851C525.373 102.096 536.141 109.648 536.404 113.927C536.666 117.074 535.879 116.948 530.494 113.172C525.373 109.522 520.12 109.144 512.109 111.913C502.129 115.312 497.533 112.417 502.129 105.62C504.361 102.348 503.18 96.18 499.503 92.2782C496.876 89.5091 493.987 89.0056 496.22 91.6488Z" fill="black" />
              <path d="M388.535 91.7752C388.141 92.0269 384.595 93.1598 380.656 94.1667C376.847 95.1736 374.746 96.0547 376.191 96.0547C377.635 96.0547 383.282 95.0478 388.666 93.6632C396.545 91.7752 397.596 91.2717 393.788 91.2717C391.161 91.1459 388.798 91.3976 388.535 91.7752Z" fill="black" />
              <path d="M97.3947 98.3206C89.7781 101.845 84 110.907 84 119.34C84 122.99 89.2528 138.976 92.5359 145.269C97.3947 154.583 104.749 177.743 106.981 190.581C108.163 197.126 110.527 208.202 112.234 215.125C113.941 222.048 116.042 232.495 116.83 238.41C120.376 264.213 122.214 269.499 129.174 273.024C132.983 275.038 134.165 275.163 137.579 273.779C145.327 270.632 148.61 262.954 158.984 223.306C167.52 190.581 169.49 185.043 178.289 168.554C192.209 142.5 193.522 139.731 193.522 133.941C193.653 125.256 192.209 122.487 189.319 126.011C187.875 127.773 185.38 128.906 181.834 129.158C175.005 129.536 169.884 132.053 168.965 135.2C168.177 137.969 165.419 138.724 165.419 136.081C165.419 133.437 173.43 126.766 179.864 123.997C184.986 121.732 185.38 121.354 182.228 121.354C178.814 121.354 169.359 125.76 169.359 127.396C169.359 127.899 167.258 130.417 164.894 133.06C155.701 142.752 148.347 166.54 143.751 200.65C142.701 209.335 140.862 219.782 139.811 223.936C138.761 228.089 137.842 232.998 137.842 234.76C137.842 238.662 133.771 242.564 130.75 241.431C128.518 240.55 127.993 237.152 129.831 235.264C130.488 234.508 129.831 225.446 128.387 213.866C125.76 194.483 125.76 192.972 127.861 172.96C131.538 138.095 130.356 120.096 123.659 108.264C117.487 97.3136 107.506 93.5376 97.3947 98.3206ZM116.699 102.222C120.113 104.866 120.901 106.376 120.507 109.271L120.113 112.921L113.022 106.376L106.062 99.9568L102.779 102.474C98.9706 105.243 93.9804 105.873 94.7683 103.355C96.7381 97.943 110.396 97.0619 116.699 102.222Z" fill="black" />
              <path d="M641.328 101.09C636.863 102.349 629.377 107.761 627.145 111.411C624.65 115.439 624.519 116.823 626.62 115.565C627.539 115.061 627.67 115.187 627.145 116.194C626.62 116.949 625.7 117.327 625.044 116.949C623.862 116.194 615.326 134.445 608.629 152.192C603.901 164.904 597.204 191.714 592.87 215.125C591.557 222.048 588.274 233.879 585.516 241.557C577.9 262.325 579.081 272.646 589.718 276.674C603.245 281.835 609.679 272.017 609.811 245.711C609.942 224.439 610.205 224.062 629.246 214.496C636.731 210.72 644.348 206.566 646.055 205.308C655.642 198.763 657.874 203.294 657.743 229.348C657.48 259.556 661.814 268.619 676.128 268.619C693.068 268.619 700.816 248.606 690.573 231.362C677.835 209.839 675.208 201.028 673.633 172.96C670.875 126.893 666.016 108.39 655.51 103.23C650.914 101.09 644.742 100.083 641.328 101.09ZM653.672 104.488C658.137 107.383 656.036 108.768 646.974 108.516C642.51 108.516 637.125 108.894 635.024 109.397C630.165 110.656 631.347 108.39 637.388 104.866C642.378 101.971 649.732 101.719 653.672 104.488ZM647.106 125.382C647.762 126.263 649.207 138.724 649.995 153.199C651.833 183.659 651.965 183.281 639.752 189.197C635.681 191.336 632.792 192.973 633.317 193.099C635.418 193.224 643.56 189.323 648.025 186.05C653.278 182.274 654.722 184.665 649.732 188.945C639.752 197.378 623.862 201.783 619.266 197.378C617.165 195.364 617.033 194.987 618.872 193.728C620.842 192.343 620.842 192.092 618.872 190.204C614.013 185.547 626.882 140.109 636.337 127.9C639.752 123.746 644.611 122.487 647.106 125.382ZM592.476 237.152C591.688 239.166 591.163 239.543 590.638 238.285C590.244 237.278 590.506 235.138 591.294 233.376C593.001 229.348 594.183 232.872 592.476 237.152ZM590.9 241.557C590.9 241.935 590.638 242.187 590.244 242.187C589.85 242.187 589.587 241.935 589.587 241.557C589.587 241.18 589.85 240.928 590.244 240.928C590.638 240.928 590.9 241.18 590.9 241.557Z" fill="black" />
              <path d="M574.354 106.25C566.081 110.152 562.929 117.452 562.404 133.311C562.142 140.234 561.748 147.283 561.354 149.045C560.04 154.079 547.828 185.169 544.413 191.588C532.069 215.251 531.412 238.033 542.969 246.466C547.565 249.864 549.272 250.242 556.363 249.99C561.616 249.738 568.97 243.697 572.779 236.648C576.587 229.474 576.324 218.901 571.991 207.069C565.293 188.819 569.233 168.932 584.203 143.758C592.608 129.787 595.497 120.725 593.659 114.054C592.083 108.767 587.093 102.852 587.486 107.005C587.618 108.893 575.93 116.193 571.859 116.823C571.203 116.949 569.758 117.452 568.97 117.956C566.081 119.718 567.132 116.697 570.809 112.543C572.779 110.278 576.718 107.383 579.607 106.124C583.153 104.74 584.072 103.859 582.365 103.859C580.92 103.733 577.375 104.865 574.354 106.25ZM550.585 187.434C550.191 188.567 549.535 189.196 549.272 188.819C548.878 188.441 549.009 187.686 549.535 186.931C550.717 184.917 551.505 185.294 550.585 187.434ZM544.544 200.273C544.019 200.65 543.625 200.273 543.625 199.391C543.625 198.51 544.019 198.133 544.544 198.51C544.938 199.014 544.938 199.769 544.544 200.273ZM568.576 206.314C568.576 206.692 568.314 206.943 567.92 206.943C567.526 206.943 567.263 206.692 567.263 206.314C567.263 205.937 567.526 205.685 567.92 205.685C568.314 205.685 568.576 205.937 568.576 206.314Z" fill="black" />
              <path d="M214.666 106.501C203.504 112.417 200.878 118.081 200.878 136.458C200.878 155.086 199.564 159.365 185.119 186.679C171.987 211.6 170.148 218.145 170.148 237.78C170.148 260.185 175.664 270.38 188.665 272.016C205.342 274.03 211.909 258.674 204.292 235.892C197.201 214.873 198.251 205.433 209.939 181.518C227.667 145.017 234.364 118.836 228.455 108.767L226.485 105.62L226.091 108.515C225.172 114.179 210.07 118.459 210.07 113.172C210.07 111.284 216.505 107.382 221.889 106.124C225.041 105.369 224.909 105.243 221.232 105.117C219.131 105.117 216.111 105.746 214.666 106.501ZM208.757 115.564C208.757 115.941 208.1 116.571 207.181 117.074C206.262 117.578 206.13 117.452 206.656 116.571C207.575 115.06 208.757 114.557 208.757 115.564Z" fill="black" />
              <path d="M274.81 110.278C267.587 113.55 249.859 132.053 242.899 143.507C233.444 158.988 220.18 204.048 220.049 220.789C219.918 262.451 272.446 275.918 293.72 239.669C304.751 220.915 311.842 182.022 301.337 197.881C297.791 203.293 296.478 202.916 298.842 197.126L300.812 192.469L297.397 196.245C295.427 198.259 291.356 203.545 288.073 207.95C284.922 212.23 280.325 216.887 277.962 218.271C274.81 220.159 274.416 220.789 276.254 220.789C277.699 220.789 281.376 218.271 284.528 215.125C287.679 211.978 290.175 210.09 290.175 210.971C290.175 211.852 286.891 215.754 282.952 219.656C272.84 229.599 266.274 230.606 258.395 223.558C254.324 220.034 253.273 215.377 256.819 216.635C258.657 217.265 258.657 216.887 256.556 213.111C252.091 205.055 253.536 192.091 261.678 163.142C269.426 136.206 272.971 128.277 278.618 125.256C284.79 121.857 286.629 124.878 285.578 136.584C284.79 145.395 284.922 146.527 287.417 148.919C293.852 155.086 305.408 149.045 308.559 137.843C314.206 117.83 293.983 101.341 274.81 110.278ZM297.529 112.795C302.781 116.697 303.569 117.956 301.205 119.214C299.761 119.969 298.185 119.466 295.953 117.452C293.326 115.061 290.831 114.431 283.608 114.054L274.547 113.55L267.85 119.592C264.173 122.864 261.547 124.627 261.94 123.62C262.728 121.606 271.396 114.431 276.254 111.662C281.113 109.019 293.195 109.648 297.529 112.795ZM256.162 131.297C255.374 132.556 255.243 133.941 255.637 134.444C256.031 134.822 255.506 135.199 254.455 135.199C253.273 135.199 252.091 135.955 251.697 136.71C251.435 137.591 250.778 138.094 250.384 137.717C249.99 137.339 251.041 135.199 252.879 132.934C256.556 128.403 258.132 127.647 256.162 131.297ZM244.343 149.171C243.687 150.807 243.03 151.562 243.03 150.681C242.899 148.793 244.343 145.017 245 145.646C245.394 145.898 245 147.534 244.343 149.171ZM246.839 239.039C246.839 239.417 246.576 239.669 246.182 239.669C245.788 239.669 245.525 239.417 245.525 239.039C245.525 238.662 245.788 238.41 246.182 238.41C246.576 238.41 246.839 238.662 246.839 239.039ZM249.465 241.557C249.465 241.934 249.202 242.186 248.808 242.186C248.414 242.186 248.152 241.934 248.152 241.557C248.152 241.179 248.414 240.927 248.808 240.927C249.202 240.927 249.465 241.179 249.465 241.557ZM257.344 244.074C257.344 244.452 257.082 244.703 256.688 244.703C256.294 244.703 256.031 244.452 256.031 244.074C256.031 243.697 256.294 243.445 256.688 243.445C257.082 243.445 257.344 243.697 257.344 244.074ZM261.284 244.074C261.284 244.452 261.021 244.703 260.627 244.703C260.233 244.703 259.971 244.452 259.971 244.074C259.971 243.697 260.233 243.445 260.627 243.445C261.021 243.445 261.284 243.697 261.284 244.074Z" fill="black" />
              <path d="M418.082 125.004C399.828 133.185 388.272 154.079 380.918 191.839C374.352 225.571 376.978 242.941 390.504 256.157C413.748 278.813 447.366 254.52 459.711 206.313C463.782 190.832 464.176 152.065 460.499 141.996C453.67 123.241 436.861 116.445 418.082 125.004ZM443.558 124.374C448.811 127.017 453.801 132.43 452.225 133.94C451.437 134.695 449.205 133.94 445.922 131.8C441.982 129.031 439.619 128.402 433.972 128.402C423.991 128.654 417.819 131.8 402.849 144.513C398.778 147.911 398.909 146.778 402.98 140.989C413.354 126.64 432.396 118.836 443.558 124.374ZM440.538 148.415C445.791 158.736 443.164 187.433 435.285 203.922C433.446 207.698 432.002 211.096 432.002 211.348C432.002 213.236 422.284 225.949 419.264 228.214C417.294 229.599 416.243 230.858 417.163 230.858C417.951 230.858 420.84 228.844 423.597 226.452C429.638 220.914 429.901 220.914 426.486 226.578C419.92 237.151 408.495 241.053 402.849 234.508C399.566 230.732 399.96 229.221 403.768 230.102L407.051 230.858L403.768 226.326C396.283 215.753 402.323 183.028 416.506 157.477C425.042 142.247 435.285 138.345 440.538 148.415ZM434.628 212.984C434.628 213.614 433.709 215.124 432.659 216.509C430.82 218.774 430.82 218.648 432.133 215.376C433.709 211.977 434.628 211.096 434.628 212.984Z" fill="black" />
            </svg>
          </div>
        </section>
      </main>
      </div>

      <ChatPanel />
      <Footer />
    </VictorAIChatProvider>
  );
}
