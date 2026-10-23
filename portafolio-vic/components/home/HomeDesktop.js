'use client';

// Ported from Main.dc.html (desktop). Two deliberate, large simplifications
// were made given this page's size -- see README-style notes inline below
// and the summary this conversion reports back:
//
// 1. The six project cards each carried a bespoke, hand-illustrated inline
//    SVG (Mapfre's tile mosaic, Pulso's sliding circles, Phantom's spinning
//    star, UNDP's glitch swap, victorai's "boiling" stars, AXA's marquee
//    text), several embedding multi-hundred-KB base64 raster images and
//    dozens of hand-tuned keyframe/filter declarations. Porting that
//    verbatim would mean multi-megabyte JS files and thousands of
//    hand-converted SVG attributes with no reliable way to verify
//    correctness here. They're replaced with a flat gradient `.card-art`
//    panel (same gradient each card used as its CSS fallback) plus the
//    project label, which was hidden in the original. The per-card hover
//    micro-interactions tied to that artwork (_udInit/_axInit) are dropped
//    along with it.
// 2. The original's cross-page "card expands into the open project" zoom
//    transition (_xOpen/_xGoTo/_xInit) cloned the clicked card's DOM into a
//    full-viewport overlay and animated it into place on Projects.dc.html,
//    synchronized across the desktop/mobile duplicate tabs of the same
//    logical page via BroadcastChannel + sessionStorage flags -- all
//    machinery for the old multi static-HTML-file architecture. Re-ported
//    (see handleCardOpen below + lib/cardTransition.js) as a plain
//    DOM/WAAPI helper, dropping only the BroadcastChannel sync (no more
//    duplicate desktop/mobile tabs to keep in step) and the SVG id-dodge
//    (these cards have no inline SVG ids to collide). It still ends with a
//    real top-level navigation, same as the original's hidden <a>+.click().
//
// Preserved: the flat-arc carousel's drag/flick/wheel physics and its
// scale-to-fit viewport behavior (_fitInit/_fitApply, desktop only, capped
// at 1.25x), keyboard-focus recentring, the hero copy and CTA cards into
// /proyectos, and a simplified load-time reveal (fade/blur in) standing in
// for the dropped cross-page transition's entrance choreography.
//
// The custom cursor's "Drag" circle while hovering the carousel IS
// reproduced: the shared CursorDot component blooms into an 84px "Drag"
// circle over .car2 (see DRAG_ZONE_SELECTOR there), and this file toggles
// its extra "is-dragging" shrink state directly from onDragStart/onWinUp
// below, matching the artifact's own split between the two files.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { VictorAIChatProvider } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/layout/Footer';
import CursorDot from '@/components/layout/CursorDot';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import { playCardOpenTransition, prefersReducedMotion, markArrival, hardNavigate } from '@/lib/cardTransition';
import './home.css';

const LABELS = [
  'Driving 35% YoY growth',
  'AI Cash Flow Predictor',
  'Unlocking Health Access',
  'Scaling enterprise sales',
  'victorai',
  'Inclusive finance architecture',
];
const GRADIENTS = [
  'linear-gradient(135deg,#f6d34a,#e8563a)',
  'linear-gradient(135deg,#3a6df0,#122a6e)',
  'linear-gradient(135deg,#e14b4b,#7a1414)',
  'linear-gradient(135deg,#7a5cf0,#241a6e)',
  'linear-gradient(135deg,#3ec46d,#12592f)',
  'linear-gradient(135deg,#4ac4c4,#123b59)',
];
const COUNT = LABELS.length;
const CARD_W = 300;
const CARD_H = 400;
const RC = 1400; // radius of the arc the cards sit on
const STEP = 17; // degrees between cards
const SPACING = RC * Math.sin((STEP * Math.PI) / 180);

function buildCards(pos) {
  return LABELS.map((label, i) => {
    const d = ((((i - pos + COUNT / 2) % COUNT) + COUNT) % COUNT) - COUNT / 2; // signed distance from centre
    const ang = d * STEP;
    const th = (ang * Math.PI) / 180;
    const x = RC * Math.sin(th);
    const y = RC * (1 - Math.cos(th));
    const hidden = Math.abs(d) > 2.45;
    return {
      index: i,
      label,
      gradient: GRADIENTS[i],
      href: `/proyectos#${i}`,
      wrapperStyle: {
        position: 'absolute',
        left: -CARD_W / 2,
        top: -CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${ang.toFixed(3)}deg)`,
        zIndex: Math.round(100 - Math.abs(d) * 10),
        visibility: hidden ? 'hidden' : 'visible',
        '--d': Math.abs(d).toFixed(2),
      },
    };
  });
}

export default function HomeDesktop() {
  const [pos, setPos] = useState(0);
  const [entered, setEntered] = useState(false);

  const movedRef = useRef(false);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const carRef = useRef(null);

  // Load-time reveal: a simplified stand-in for the original's cross-page
  // XT entrance choreography (see the file header note).
  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce) {
      setEntered(true);
      return;
    }
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Carousel physics: drag-to-spin with momentum, wheel support once the
  // page can't scroll further, and keyboard-focus recentring. Ported from
  // tick/onDragStart/_onWinMove/_onWinUp/onWheel/_initCardFocus.
  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let posVal = 0;
    let targetVal = 0;
    let dragging = false;
    let samples = [];
    let startX = 0;
    let startPos = 0;
    let last = performance.now();
    let rafId = null;
    let wheelIdle = null; // named timer, cleared below on unmount
    let lastWheelDrive = 0;
    let lastPageWheel = 0;

    function tick(t) {
      const dt = Math.min(48, t - last);
      last = t;
      if (!dragging) {
        const diff = targetVal - posVal;
        if (Math.abs(diff) > 0.0008) {
          posVal += diff * (reduce ? 1 : 1 - Math.exp(-dt / 120));
          setPos(posVal);
        } else if (diff !== 0) {
          posVal = targetVal;
          setPos(posVal);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function onWinMove(e) {
      if (!dragging) return;
      if (e.buttons === 0) {
        onWinUp();
        return;
      }
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) movedRef.current = true;
      posVal = startPos - dx / SPACING;
      targetVal = posVal;
      const now = performance.now();
      samples.push({ t: now, x: e.clientX });
      while (samples.length > 2 && now - samples[0].t > 120) samples.shift();
      setPos(posVal);
    }

    function onWinUp() {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      window.removeEventListener('blur', onWinUp);
      const dot = document.querySelector('.cursor-dot');
      if (dot) dot.classList.remove('is-dragging');
      let v = 0;
      if (samples.length > 1) {
        const a = samples[0];
        const b = samples[samples.length - 1];
        v = (b.x - a.x) / Math.max(1, b.t - a.t); // px per ms
      }
      const flick = Math.max(-3, Math.min(3, (-v * 220) / SPACING));
      const tr = Math.round(posVal + flick);
      const shift = Math.floor(tr / COUNT) * COUNT; // keep the resting card inside 0..N-1
      posVal -= shift;
      targetVal = tr - shift;
      setPos(posVal);
    }

    function onDragStart(e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      movedRef.current = false;
      startX = e.clientX;
      startPos = posVal;
      samples = [{ t: performance.now(), x: e.clientX }];
      const dot = document.querySelector('.cursor-dot');
      if (dot) dot.classList.add('is-dragging');
      window.addEventListener('pointermove', onWinMove);
      window.addEventListener('pointerup', onWinUp);
      window.addEventListener('pointercancel', onWinUp);
      // Safety net for when the release happens somewhere this window never
      // sees a pointerup for.
      window.addEventListener('blur', onWinUp);
    }

    function onWheel(e) {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!delta) return;
      const now = performance.now();
      const doc = document.documentElement;
      const atBottom = (window.scrollY || 0) + window.innerHeight >= doc.scrollHeight - 2;
      const burstStart = now - lastWheelDrive > 260; // a new gesture, not the tail of the previous one
      if (!horizontal) {
        if (!atBottom) {
          lastPageWheel = now;
          return;
        }
        if (now - lastPageWheel < 220) return; // momentum from the page scroll that just ended
        const rest = Math.abs(posVal - targetVal) < 0.02 && Math.abs(((targetVal % COUNT) + COUNT) % COUNT) < 0.02;
        if (delta < 0 && rest && burstStart) return; // resting on the first card: let the page scroll back up
      }
      e.preventDefault();
      lastWheelDrive = now;
      targetVal += delta / 340; // no end: keeps looping like the drag
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => {
        const tr = Math.round(targetVal);
        const shift = Math.floor(tr / COUNT) * COUNT;
        posVal -= shift;
        targetVal = tr - shift;
      }, 140);
    }

    // Suppresses the click a drag release leaves behind so letting go of a
    // drag doesn't also open whichever card the pointer lands on.
    function onCarClick(e) {
      if (movedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function onCardFocus(e) {
      const a = e.target && e.target.closest ? e.target.closest('.card-face') : null;
      if (!a) return;
      const all = Array.prototype.slice.call(document.querySelectorAll('.card-face'));
      const idx = all.indexOf(a);
      if (idx < 0) return;
      targetVal = Math.round((posVal - idx) / COUNT) * COUNT + idx;
    }

    const carEl = carRef.current;
    if (carEl) {
      carEl.addEventListener('pointerdown', onDragStart);
      carEl.addEventListener('click', onCarClick, true);
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('focusin', onCardFocus);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(wheelIdle);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      window.removeEventListener('blur', onWinUp);
      document.removeEventListener('focusin', onCardFocus);
      if (carEl) {
        carEl.removeEventListener('pointerdown', onDragStart);
        carEl.removeEventListener('click', onCarClick, true);
      }
    };
  }, []);

  // Scales the fixed 1440-wide design to fit whatever real viewport this
  // ends up in, desktop only, capped at 1.25x -- ported from _fitInit/
  // _fitApply. Navbar/Footer are now true siblings of this page (per the
  // shared layout contract) rather than flex children inside one `.page`
  // column, so instead of `.stage-wrap{flex:1}` doing the sizing, this
  // sets .stage-wrap's own height directly from the room left over between
  // the navbar and footer's real rendered heights.
  useEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) return;

    function fitApply() {
      const dh = stage.offsetHeight || 890;
      const navbar = document.querySelector('[data-nav]');
      const footerEl = document.querySelector('[data-site-footer]');
      const navH = navbar ? navbar.offsetHeight : 0;
      const footH = footerEl ? footerEl.offsetHeight : 0;
      const availH = window.innerHeight - navH - footH;
      wrap.style.height = Math.max(0, availH) + 'px';
      const availW = wrap.clientWidth || window.innerWidth;
      // Capped at 1.25x: on a big external/secondary monitor the design
      // still grows to fill more of the screen, but text and touch targets
      // never get oversized past a comfortable reading scale.
      const scale = Math.min(availH / dh, 1.25);
      // The stage's own width is stretched (never below the 1440 design
      // width) so that once scaled it always spans exactly the available
      // width, revealing more of the carousel's ring/side-cards on wide
      // screens instead of leaving empty margin on the sides.
      const stageW = Math.max(1440, availW / scale);
      stage.style.width = stageW + 'px';
      stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    }
    // A single synchronous call right on mount can run before the browser
    // has actually settled layout -- most likely culprit: the Google Fonts
    // pulled in via @import in globals.css are still loading, so navbar/
    // footer/stage still have fallback-font metrics, or this is simply the
    // very first paint and the browser hasn't finished laying out the real
    // viewport yet. Whatever the exact cause, a bad read here is silent and
    // sticks forever, because nothing but a real window 'resize' event
    // re-triggers fitApply otherwise -- confirmed live: a fresh load can
    // compute a tiny scale and leave the whole carousel shrunk into a
    // corner. Guard against it with a double rAF before the first call (lets
    // a real layout pass land first), a re-run once web fonts finish
    // loading (they can shift text/box heights after that first call), and
    // a ResizeObserver on navbar/footer specifically -- not on `stage` or
    // `wrap`, since fitApply itself writes their size and observing those
    // would retrigger itself.
    let rafId1 = 0;
    let rafId2 = 0;
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(fitApply);
    });

    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) fitApply();
      }).catch(() => {});
    }

    const navbarEl = document.querySelector('[data-nav]');
    const footerEl2 = document.querySelector('[data-site-footer]');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitApply) : null;
    if (ro) {
      if (navbarEl) ro.observe(navbarEl);
      if (footerEl2) ro.observe(footerEl2);
    }

    fitApply();
    window.addEventListener('resize', fitApply);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.removeEventListener('resize', fitApply);
      if (ro) ro.disconnect();
    };
  }, []);

  const cards = buildCards(pos);
  const ticksStyle = { transform: `rotate(${(-pos * STEP).toFixed(3)}deg)` };

  // Ported from Main.dc.html's _xOpen/_xGoTo (see file header note #2 and
  // lib/cardTransition.js). Shared by the card-face and Discover links --
  // the original's onOpen always animated the slot's .card-face regardless
  // of which of the two triggered it. The existing drag-suppression
  // (onCarClick, registered with capture above) already stops this from
  // firing right after a drag/flick release.
  function handleCardOpen(e, card) {
    if (prefersReducedMotion()) return; // plain Link navigation, no overlay, no arrive flag
    e.preventDefault();
    const slot = e.currentTarget.closest('.card-slot');
    if (!slot) {
      hardNavigate(card.href);
      return;
    }
    playCardOpenTransition({ slot, gradient: card.gradient, mobile: false }).then(() => {
      markArrival();
      hardNavigate(card.href);
    });
  }

  return (
    <VictorAIChatProvider topics={TOPICS} starters={STARTERS}>
      <Navbar current="home" />
      <CursorDot />
      {/* Scope wrapper: isolates home.css's selectors (e.g. .page, .stage-wrap)
          from HomeMobile's home-mobile.css, which Next.js bundles into this
          same route's client CSS regardless of which variant actually
          renders -- see home-desktop-scope / home-mobile-scope in the
          matching .css files. */}
      <div className="home-desktop-scope">
      <main data-page className="page">
        <div className="stage-wrap" ref={wrapRef}>
          <div className="x-stage" ref={stageRef}>
            <section className={`stage2${entered ? ' is-entered' : ''}`} id="home">
              <div className="intro2">
                <h1 className="intro2-title">
                  I&apos;m Victoria, a product designer who
                  <br />
                  invests in what <span className="accent-italic">moves the needle</span>
                </h1>
                <p className="intro2-sub">
                  I untangle complex ecosystems to design seamless products. Focused on driving end-to-end
                  product strategy to turn user needs into significant business impact.
                </p>
              </div>

              <div className="car2" ref={carRef}>
                <div className="car2-ticks" style={ticksStyle} />
                <div className="car2-ring">
                  {cards.map((card) => (
                    <div className="card-slot" style={card.wrapperStyle} key={card.index}>
                      <Link
                        className="card-face"
                        href={card.href}
                        draggable="false"
                        aria-label={`Open project: ${card.label}`}
                        onClick={(e) => handleCardOpen(e, card)}
                      >
                        <div className="card-art" style={{ background: card.gradient }} aria-hidden="true" />
                        <span className="card-tag">{card.label}</span>
                      </Link>
                      <Link
                        className="btn-primary btn-discover"
                        href={card.href}
                        draggable="false"
                        onClick={(e) => handleCardOpen(e, card)}
                      >
                        Discover
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      </div>
      <ChatPanel />
      <Footer />
    </VictorAIChatProvider>
  );
}
