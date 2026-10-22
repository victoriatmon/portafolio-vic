'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VictorAIChatProvider } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/layout/Footer';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import './about-mobile.css';

// Ported from AboutMeMobile.dc.html. Same page logic as AboutDesktop (mode
// toggle, photo grid, task board with drag + keyboard + confetti) minus the
// desktop-only bits: no custom cursor (mobile hides it entirely -- touch
// input has no pointer to track) and no fit-scaling transform (the mobile
// layout just flows at its own 390px design width via CSS, see
// about-mobile.css). On touch, a card only starts dragging from its
// `.task-grip` handle instead of anywhere on the card, so a vertical swipe
// over the card body still scrolls the page normally.
//
// The original mobile page's hamburger/menu-sheet nav and scroll-to-hide
// navbar are reproduced via the shared Navbar's variant="mobile" (see
// components/nav/Navbar.js) -- its menu sheet links only to Home/Projects/
// About (not the LinkedIn/Email/Resume links the old MainMobile.dc.html
// also folded in there), since the shared Footer is now always rendered on
// every route instead of being buried in the menu on mobile.

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

export default function AboutMobile() {
  const [aboutMode, setAboutMode] = useState(initialAboutMode);
  const [tabMode, setTabMode] = useState(initialAboutMode);
  const [swap, setSwap] = useState('');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [drag, setDrag] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [lastDrop, setLastDrop] = useState(null);
  const [interacted, setInteracted] = useState(false);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

  const swappingRef = useRef(false);
  const swapT1 = useRef(null);
  const swapT2 = useRef(null);
  const lastDropT = useRef(null);
  const confettiStartT = useRef(null);
  const kbRefocusT = useRef(null);
  const confettiRaf = useRef(null);
  const dragInfoRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(swapT1.current);
      clearTimeout(swapT2.current);
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

  function switchMode(mode) {
    if (swappingRef.current || tabMode === mode) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setAboutMode(mode);
      setTabMode(mode);
      setSwap('');
      return;
    }
    swappingRef.current = true;
    setTabMode(mode);
    setSwap('is-leaving');
    swapT1.current = setTimeout(() => {
      setAboutMode(mode);
      setSwap('is-entering');
      swapT2.current = setTimeout(() => {
        setSwap('');
        swappingRef.current = false;
      }, 1000);
    }, 330);
  }

  // ---- Task board: drag + full keyboard support ----

  function dragStart(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    // On touch, only the grip handle starts a drag -- the rest of the card
    // stays free for the page's own vertical scroll (touch-action: pan-y).
    if (e.pointerType === 'touch' && !(e.target.closest && e.target.closest('.task-grip'))) return;
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
    // If the pointer leaves the page entirely while a card is held (dragged
    // off the edge, or the OS notification shade/app switcher takes over
    // mid-drag) neither pointerup nor pointercancel ever reaches the
    // document, so without this the drag would get stuck. Either listener
    // cancels the drag outright (see handleDragCancel) rather than
    // guessing a drop target from stale coordinates.
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
  const pageClass = 'page' + (isPersonal ? '' : ' is-pro') + (swap ? ' ' + swap : '');

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
      <Navbar current="about" variant="mobile" />

      <main data-page className={pageClass}>
        <section className="about-hero">
          <div className="about-hero-left">
            <h1 className="is-pro">
              I&apos;m Victoria, a product designer who invests in what{' '}
              <span className="accent-italic">moves the needle</span>
            </h1>
            <p className="about-hero-sub">
              Based in Eindhoven,
              <br />
              originally from México
            </p>
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
              <img src="/about-reading-outdoors.png" alt="Victoria reading with a friend outdoors" style={{ objectPosition: '63% 50%', objectFit: 'cover' }} />
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
                            <i className="task-grip" aria-hidden="true" />
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
                  {allDone && <canvas className="confetti-canvas" aria-hidden="true" />}
                  <div className="sr-only" aria-live="polite">{moveAnnouncement}</div>
                </div>
                {dragged && (
                  <div className="task-card is-floating" style={{ left: drag.x, top: drag.y, width: drag.w }}>
                    <div className="task-title">{dragged.title}</div>
                    <span className={`task-pill is-${dragged.priority.toLowerCase()}`}>{dragged.priority}</span>
                  </div>
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
            <div className="resume-bottom">
              {/* TODO(Vic): swap for the real file once it's in /public (same resume asset Footer links to). */}
              <a className="resume-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
                <span>Download Resume</span>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </main>

      <ChatPanel />
      <Footer />
    </VictorAIChatProvider>
  );
}
