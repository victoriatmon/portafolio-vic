'use client';

// Ported from MainMobile.dc.html. See HomeDesktop.js's file header for the
// illustrated-cards simplification, which applies here too (flat gradient
// `.card-art` panel). The cross-page zoom transition (_xOpen) is re-ported
// though, same as desktop: see handleCardOpen below + lib/cardTransition.js
// (mobile's overlay just grows to fill the viewport instead of landing on
// a centered card, matching MainMobile.dc.html's own MOBILE=true branch).
//
// Also specific to the old mobile build: its hamburger "menu-sheet" nav
// (which folds Home/Projects/About together with the LinkedIn/Email/Resume
// links and a small credit line, since there's nowhere else to put a
// footer without forcing a scroll) and the sticky navbar's hide-on-scroll
// behavior. Both are reproduced via the shared Navbar's variant="mobile" --
// its menu sheet carries the contact links + credit line itself, so this
// page (like AboutMobile/ProyectosMobile) renders no separate <Footer/>,
// matching MainMobile.dc.html exactly. No scale-to-fit here (that was
// desktop only in the original too) -- the page flows normally and scrolls
// if its content needs more height than the viewport.
//
// Preserved: the same flat-arc carousel geometry and physics (sized for a
// 390px-wide screen), its touch affordances -- a finger resting briefly on
// a card counts as hover (`.is-held`, feeding the same CSS lift as
// desktop's :hover), a drag never opens a card, a quick tap does -- wheel
// support for a touch-capable trackpad, keyboard-focus recentring, and a
// simplified load-time reveal standing in for the dropped transition's
// entrance choreography.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { VictorAIChatProvider } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import { playCardOpenTransition, prefersReducedMotion, markArrival, hardNavigate } from '@/lib/cardTransition';
import MapfreCard from './cards/MapfreCard';
import PhantomCard from './cards/PhantomCard';
import PulsoCard from './cards/PulsoCard';
import AXACard from './cards/AXACard';
import VictorCard from './cards/VictorCard';
import UndpCard from './cards/UndpCard';
import './home-mobile.css';

// Same six bespoke card illustrations as HomeDesktop.js (see that file's
// CARD_ART for the full background on each one), now ported here too.
// Mobile has no :hover, so each card's CSS trigger in home-mobile.css
// swaps :hover for .is-held -- the class this file's drag effect already
// adds to a card-face on a brief press (see the holdOn/holdOff helpers
// below), reusing the same touch affordance rather than inventing a
// second one. The two JS-driven cards (AXA/UNDP) need no mobile-specific
// code at all: they already listen for pointerover/pointerout, which
// fire for touch pointers the same as mouse ones.
const CARD_ART = [MapfreCard, PhantomCard, PulsoCard, AXACard, VictorCard, UndpCard];

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
const RC = 900; // radius of the arc the cards sit on (screen px)
const CARD_SCALE = 0.85; // card scale on mobile
const STEP = (Math.asin(275 / RC) * 180) / Math.PI; // degrees between cards: 275px apart along the arc
const SPACING = RC * Math.sin((STEP * Math.PI) / 180);

function buildCards(pos) {
  return LABELS.map((label, i) => {
    const d = ((((i - pos + COUNT / 2) % COUNT) + COUNT) % COUNT) - COUNT / 2; // signed distance from centre
    const ang = d * STEP;
    const th = (ang * Math.PI) / 180;
    const x = RC * Math.sin(th);
    const y = RC * (1 - Math.cos(th));
    const hidden = Math.abs(d) > 2.3;
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
        transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${ang.toFixed(3)}deg) scale(${CARD_SCALE})`,
        zIndex: Math.round(100 - Math.abs(d) * 10),
        visibility: hidden ? 'hidden' : 'visible',
        '--d': Math.abs(d).toFixed(2),
      },
    };
  });
}

export default function HomeMobile() {
  const [pos, setPos] = useState(0);
  const [entered, setEntered] = useState(false);
  const carRef = useRef(null);

  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce) {
      setEntered(true);
      return;
    }
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let posVal = 0;
    let targetVal = 0;
    let dragging = false;
    let samples = [];
    let startX = 0;
    let startPos = 0;
    let downX = 0;
    let downY = 0;
    let moved = false;
    let heldFace = null;
    let holdTimer = null; // named timer, cleared below on unmount
    let wheelIdle = null; // named timer, cleared below on unmount
    let last = performance.now();
    let rafId = null;
    // Set (not applied) by onWinMove below; consumed here, at most once per
    // rendered frame. Touch `pointermove` can dispatch more than once per
    // vsync on some mobile browsers, and calling `setPos()` straight from
    // that handler commits a React re-render per event rather than per
    // frame -- wasted work (several renders that never even get painted)
    // that was the main cause of the sluggish/non-smooth drag feel on
    // mobile. Routing every update through this already-running rAF loop
    // instead caps it at one commit per frame, same cadence as the
    // momentum settle below.
    let dragDirty = false;

    function tick(t) {
      const dt = Math.min(48, t - last);
      last = t;
      if (dragging) {
        if (dragDirty) {
          dragDirty = false;
          setPos(posVal);
        }
      } else {
        const diff = targetVal - posVal;
        if (Math.abs(diff) > 0.0008) {
          // Settle-to-target ease. Time-constant kept short (vs. the old
          // 120ms) because the guided swipe above (onWinUp) now routinely
          // asks this to cover a near-full card's distance on every commit
          // -- a short, decisive swipe can leave posVal barely past the
          // drag threshold with targetVal already a whole card away. At
          // 120ms that catch-up tween took ~500ms+ to fully settle, which
          // read as slow motion for what's meant to be a snappy paginated
          // swipe. 60ms settles the same jump in ~250-300ms.
          posVal += diff * (reduce ? 1 : 1 - Math.exp(-dt / 60));
          setPos(posVal);
        } else if (diff !== 0) {
          posVal = targetVal;
          setPos(posVal);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Touch: a finger resting on a card for a moment counts as hover (the
    // card lift plays). Moving the finger turns it into a drag. A quick
    // tap opens the project; a hold or a drag never does.
    function holdOn(face) {
      if (heldFace) return;
      heldFace = face;
      face.classList.add('is-held');
    }
    function holdOff() {
      if (!heldFace) return;
      heldFace.classList.remove('is-held');
      heldFace = null;
    }

    function onDragStart(e) {
      if (e.button !== undefined && e.button !== 0) return;
      // A touch starting right at the screen edge is left alone so it
      // doesn't fight the OS's own edge swipe-back gesture. Mouse/trackpad
      // pointers are exempt (no such gesture).
      if (e.pointerType !== 'mouse') {
        const EDGE = 28;
        if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
      }
      dragging = true;
      startX = e.clientX;
      startPos = posVal;
      targetVal = posVal;
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      samples = [{ t: performance.now(), x: e.clientX }];
      clearTimeout(holdTimer);
      if (e.pointerType !== 'mouse') {
        const face = e.target && e.target.closest ? e.target.closest('.card-face') : null;
        if (face) holdTimer = setTimeout(() => holdOn(face), 240);
      }
      window.addEventListener('pointermove', onWinMove);
      window.addEventListener('pointerup', onWinUp);
      window.addEventListener('pointercancel', onWinUp);
    }

    function onWinMove(e) {
      if (!dragging) return;
      if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 10) {
        moved = true;
        clearTimeout(holdTimer);
        if (heldFace) {
          holdOff();
          startX = e.clientX;
          startPos = posVal;
        }
      }
      if (heldFace || !moved) return;
      const dx = e.clientX - startX;
      // Guided swipe, part 1/2 (see onWinUp for the release/commit side):
      // the live drag still tracks the finger 1:1 for tactile feel, but is
      // clamped to +-1 card (a touch of overshoot for a rubber-band feel)
      // off the card the gesture started on. Before this clamp, dragging
      // further just kept scrolling the ring continuously past however
      // many cards the raw px distance implied -- which is also why a
      // *short* swipe used to barely move anything (this is a proportional
      // mapping: ~SPACING px of travel, nearly a full mobile screen width,
      // for one card). A swipe now always reads as "pick the next/prev
      // card", not "scroll the whole ring", so it shouldn't visually run
      // past that either.
      const rawDelta = -dx / SPACING;
      const clampedDelta = Math.max(-1.15, Math.min(1.15, rawDelta));
      posVal = startPos + clampedDelta;
      targetVal = posVal;
      const now = performance.now();
      samples.push({ t: now, x: e.clientX });
      while (samples.length > 2 && now - samples[0].t > 120) samples.shift();
      dragDirty = true;
    }

    function onWinUp() {
      if (!dragging) return;
      dragging = false;
      clearTimeout(holdTimer);
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      if (heldFace) holdOff();
      if (!moved) return;
      let v = 0;
      if (samples.length > 1) {
        const a = samples[0];
        const b = samples[samples.length - 1];
        v = (b.x - a.x) / Math.max(1, b.t - a.t);
      }
      // Guided swipe, part 2/2: commit to exactly one card over -- never
      // more than one, however far or fast the gesture was -- or snap back
      // to the current one. Old behaviour rounded the raw accumulated drag
      // distance (+ a velocity-based "flick" nudge) to the nearest integer,
      // which is why a quick, short, deliberate swipe (small distance, not
      // quite enough velocity to flick past the 0.5-card rounding line)
      // could fail to advance at all and spring back -- reading as "slow"/
      // unresponsive even though a real swipe gesture had just happened.
      // Two independent triggers, either one is enough: a clear flick
      // (fast enough, almost regardless of distance -- someone flicking
      // the ring expects it to move) or a deliberate drag past a small
      // fraction of a card's spacing (~16%, well under the old ~100%
      // needed) -- in whichever direction the gesture went. Below both, it
      // springs back to the card it started on (tick()'s existing ease-to-
      // target already animates that return).
      const dragCards = posVal - startPos; // net cards moved this gesture (already +-1.15 clamped above)
      const FLICK_V = 0.3; // px/ms (~300px/s) -- a normal quick flick, whatever the distance
      const DRAG_THRESHOLD = 0.16; // ~16% of a card's spacing (~44px) of deliberate drag
      let dir = 0;
      if (Math.abs(v) > FLICK_V) {
        dir = v < 0 ? 1 : -1; // dragging/flicking left (negative v) advances to the next card
      } else if (Math.abs(dragCards) > DRAG_THRESHOLD) {
        dir = dragCards > 0 ? 1 : -1;
      }
      const tr = Math.round(startPos) + dir;
      const shift = Math.floor(tr / COUNT) * COUNT;
      posVal -= shift;
      targetVal = tr - shift;
      setPos(posVal);
    }

    // Suppresses the click a drag/hold release leaves behind.
    function onCarClick(e) {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Trackpad/mouse wheel on a touch-capable device drives the carousel
    // too, alongside drag -- the two never conflict since drag writes
    // posVal directly while this only nudges targetVal, which tick() eases
    // posVal toward.
    function onWheel(e) {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      targetVal -= delta / 340;
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => {
        const tr = Math.round(targetVal);
        const shift = Math.floor(tr / COUNT) * COUNT;
        posVal -= shift;
        targetVal = tr - shift;
      }, 140);
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
      clearTimeout(holdTimer);
      clearTimeout(wheelIdle);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
      document.removeEventListener('focusin', onCardFocus);
      if (carEl) {
        carEl.removeEventListener('pointerdown', onDragStart);
        carEl.removeEventListener('click', onCarClick, true);
      }
    };
  }, []);

  const cards = buildCards(pos);
  const ticksStyle = { transform: `rotate(${(-pos * STEP).toFixed(3)}deg)` };

  // Ported from MainMobile.dc.html's _xOpen/_xGoTo -- see HomeDesktop.js's
  // matching handleCardOpen and lib/cardTransition.js. The existing tap-
  // vs-drag/hold guard (onCarClick, registered with capture above) already
  // stops this from firing after a drag or a long-press release.
  function handleCardOpen(e, card) {
    if (prefersReducedMotion()) return; // plain Link navigation, no overlay, no arrive flag
    e.preventDefault();
    const slot = e.currentTarget.closest('.card-slot');
    if (!slot) {
      hardNavigate(card.href);
      return;
    }
    playCardOpenTransition({ slot, gradient: card.gradient, mobile: true }).then(() => {
      markArrival();
      hardNavigate(card.href);
    });
  }

  return (
    <VictorAIChatProvider topics={TOPICS} starters={STARTERS}>
      <Navbar current="home" variant="mobile" />
      {/* Scope wrapper: see HomeDesktop.js -- isolates home-mobile.css from
          home.css, both of which Next.js bundles into this route's client
          CSS regardless of which variant renders. */}
      <div className="home-mobile-scope">
      <main data-page className="page">
        <section className={`stage2${entered ? ' is-entered' : ''}`} id="home">
          <div className="intro2">
            <h1 className="intro2-title">
              I&apos;m Victoria, a product designer who invests in what{' '}
              <span className="accent-italic">moves the needle</span>
            </h1>
          </div>

          <div className="car2" ref={carRef}>
            <div className="car2-ticks" style={ticksStyle} />
            <div className="car2-ring">
              {cards.map((card) => {
                const Art = CARD_ART[card.index];
                return (
                <div className="card-slot" style={card.wrapperStyle} key={card.index}>
                  <Link
                    className="card-face"
                    href={card.href}
                    draggable="false"
                    aria-label={`Open project: ${card.label}`}
                    onClick={(e) => handleCardOpen(e, card)}
                  >
                    {Art ? (
                      <Art />
                    ) : (
                      <>
                        <div className="card-art" style={{ background: card.gradient }} aria-hidden="true" />
                        <span className="card-tag">{card.label}</span>
                      </>
                    )}
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
                );
              })}
            </div>
          </div>
        </section>
      </main>
      </div>
      <ChatPanel />
    </VictorAIChatProvider>
  );
}
