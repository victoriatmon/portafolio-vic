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
// ===== Carousel, rebuilt 2026-10-28, arc visual restored same day =====
// The project carousel below was rewritten from scratch, replacing a
// trigonometric ARC layout (each card placed via sin/cos around a 900px-
// radius circle, advanced by a hand-rolled pointer-drag + CSS-transition
// "settle" -- see contexto-portafolio-vercel.md for that system's full
// history) with a native horizontal CSS scroll-snap strip for the actual
// HORIZONTAL motion. Victoria reported the old system could never reliably
// land the next card centred on a swipe or an arrow tap, through many
// rounds of tuning its easing/duration -- scroll-snap fixed that (well-
// supported in both Chrome and Safari/iOS, the same mechanism basically
// every other horizontally-paged mobile UI on the web already relies on),
// so "advance -> next card lands centred, smoothly" is no longer something
// this file reconstructs by hand.
//
// The first version of that rebuild, however, left the cards sitting flat
// in a straight strip -- Victoria then asked for mobile to look curved
// like desktop again: the centre card prominent, the previous/next cards
// visibly arcing away at the sides. So, same day: the native scroll-snap
// strip stays (still the thing that fixed reliability), but each
// `.card-slot` now ALSO gets a `rotate()`/`translateY()` transform layered
// on top -- the same arc math HomeDesktop.js uses (RC/STEP below), just
// re-tuned for this narrower viewport -- recomputed continuously from the
// track's live scrollLeft and written straight to the DOM via refs (see
// applyArc() in the effect below), never through React state/re-render
// per scroll frame (same reasoning as fix #13's dropped-frame lesson,
// documented in contexto-portafolio-vercel.md). Since a CSS transform is
// purely visual (doesn't affect layout or the scroll-snap calculation,
// which is based on the untransformed layout box), this composes cleanly
// with the native scroll: the browser still decides exactly where a card
// sits left-to-right, in perfect sync with the user's finger; the arc only
// adds the curve on top.
//
// What's left for JS to do:
//   1. Know which card is centred, to drive the same `.is-current` trigger
//      the six bespoke card-art animations in home-mobile.css already key
//      off (unchanged -- see CARD_ART below) -- done by reading the
//      track's scrollLeft once scrolling goes idle (see the big effect
//      below), the same "wait for rest, not just proximity to centre"
//      principle the old system's `settled` gate existed for, just driven
//      by the browser's own scroll state instead of a hand-tracked one.
//   2. Drive a prev/next BUTTON tap's glide to the next card (scrollToIndex
//      below) -- native swipe/wheel scrolling never touches this at all,
//      the browser handles that motion entirely on its own. (Both this and
//      native scrolling fire the same 'scroll' events, so both drive the
//      arc update the same way -- see applyArc()/scheduleArc().)
//   3. Continuously recompute and write each card's arc transform (this
//      fix) -- see applyArc()/scheduleArc() in the effect below.
// Card width (CARD_W/CARD_GAP below) is direct pixel sizing, no extra scale
// transform -- see home-mobile.css's matching .card-slot/.car2-track rules,
// which MUST stay numerically in sync with these. Card HEIGHT lives only in
// CSS (340px, both `.card-slot` and `.card-face` as of this fix -- see
// that file) -- the math below never needs it directly.
//
// Each card's bespoke art animation (the tile mosaic, the spinning star,
// the glitch swap, etc. -- see CARD_ART below) plays on its own, in a loop,
// for as long as that card sits centred in the carousel AND the carousel
// itself has fully stopped moving: the render applies that as `.is-current`
// on `.card-face` (home-mobile.css's trigger selectors) and as an `active`
// prop on <Art/> (for AXA/UNDP's JS-driven art) -- same convention as
// before the rebuild, just now driven by `currentIndex` below.

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
// swaps :hover for .is-current -- applied below to whichever card is
// centred in the carousel. The two JS-driven cards (AXA/UNDP) take a
// matching `active` prop instead of relying on their own pointerover/
// pointerout listeners on mobile: those components now skip wiring up real
// pointer events whenever an `active` prop is passed at all (mobile always
// passes one; HomeDesktop.js never does, so desktop's hover behaviour is
// untouched).
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

// On-screen card size, px -- no extra scale transform any more (the old
// arc system rendered a 300x400 box through a 0.85 CSS scale; this sizes
// directly at the same effective on-screen size instead). MUST stay in
// sync with home-mobile.css's `.card-slot`/`.car2-track` rules, which
// hardcode these same numbers (cross-referenced in a comment there too).
const CARD_W = 255;
const CARD_GAP = 20;
// Centre-to-centre scroll distance between adjacent cards. Since every
// card is the same width with a fixed gap, and the track's side padding is
// exactly (viewport - CARD_W)/2 (see home-mobile.css), each card's
// scroll-snap position lands at exactly `index * PAGE_W` -- no drift, no
// per-viewport-width special-casing needed to find "which card is this
// scrollLeft pointing at".
const PAGE_W = CARD_W + CARD_GAP;

// Arc visual (this fix): rotate()/translateY() layered on top of the
// native scroll position, same shape of math as HomeDesktop.js's own
// RC/STEP (see that file) -- `ang = d*STEP`, `translateY = RC*(1-cos(ang))`
// -- but re-tuned for mobile's narrower viewport rather than copying
// desktop's RC=1400/STEP=17deg verbatim. These numbers reuse the pre-
// fix-#20 mobile arc's own RC=900, with STEP derived the same way that
// system derived it: the angle at which the arc's chord length equals
// PAGE_W, so adjacent cards keep landing visually close to PAGE_W apart
// even though the arc's true horizontal placement is non-linear (this
// value is only used for the rotation/vertical-drop added on top here;
// actual left-right placement still comes from native scroll, see the
// effect below and this file's header comment).
const RC = 900;
const STEP = (Math.asin(PAGE_W / RC) * 180) / Math.PI;
// Cards beyond this many slots from centre are hidden outright (matches
// desktop's own cutoff, scaled -- six cards never need more than ~2 to be
// visible either side in a strip this narrow anyway).
const ARC_HIDE_AT = 2.3;

// Duration/easing for the prev/next BUTTON glide only -- native swipe/wheel
// scrolling bypasses this entirely and is driven purely by the browser's
// own scroll-snap physics (no JS in the loop, so no per-frame React cost
// to worry about, unlike the old arc system's settle tween). Chosen to
// read as a deliberate, soft glide; not tuned against the old system's
// NAV_EASE_DUR_MS/CURVE numbers, since the underlying motion mechanism
// (compositor-driven native scroll vs. a CSS transform transition) is
// fundamentally different now.
const NAV_EASE_MS = 420;
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function HomeMobile() {
  // -1 while the track is mid-scroll (dragging, flicking, or an in-flight
  // button glide) so no card is ever marked `.is-current` while the
  // carousel hasn't actually come to rest -- same "wait for rest" principle
  // the old system's `settled` state existed for (see this file's header
  // comment), just read off the track's own scroll state instead of a
  // hand-tracked tween. Starts at 0 (not -1): nothing has scrolled yet on
  // first paint, card 0 is simply already centred.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const trackRef = useRef(null);
  // Imperative prev()/next(), wired up inside the scroll-tracking effect
  // below (same ref-exposing-a-closure pattern as AXACard.js's apiRef) so
  // the prev/next buttons rendered on the centred card (see render below)
  // can reach the scrollToIndex() closure defined inside that effect
  // without re-creating it on every render.
  const navRef = useRef({ prev() {}, next() {} });
  // One DOM node per card (`.card-slot`), set via the inline ref callback
  // in the render below -- applyArc() (in the effect below) writes the
  // rotate()/translateY() arc transform straight to these on every scroll
  // frame, bypassing React state/re-render entirely (see this file's
  // header comment, point 3).
  const cardSlotRefs = useRef([]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let scrollTimer = null; // idle-detection fallback, cleared below on unmount
    let autoScrollCancel = null; // cancels an in-flight prev/next glide, see scrollToIndex()
    let autoScrolling = false; // true only while scrollToIndex()'s own rAF loop is writing scrollLeft
    // Newer engines fire a real 'scrollend' event the instant native
    // scrolling (including momentum/snap) comes to rest -- far more
    // precise than guessing from an idle timer. Where it's missing
    // (older Safari), fall back to the same idle-timeout principle the old
    // wheel handler used (140ms of no new scroll events).
    const hasScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;

    // Writes the arc transform (rotate + vertical drop, see RC/STEP above)
    // to every `.card-slot` for a given continuous centre position `pos`
    // (a float -- the fractional index the track is currently scrolled
    // to, NOT just the settled integer index). Direct DOM writes, no
    // setState -- this runs on every scroll frame, so going through React
    // here would reintroduce exactly the per-frame-re-render cost fix #13
    // moved away from (see contexto-portafolio-vercel.md).
    function applyArc(pos) {
      const cards = cardSlotRefs.current;
      for (let i = 0; i < COUNT; i++) {
        const el = cards[i];
        if (!el) continue;
        const d = i - pos; // signed, continuous distance from centre -- no wraparound, this carousel is bounded (see scrollToIndex's clamp below)
        const ang = d * STEP;
        const y = RC * (1 - Math.cos((ang * Math.PI) / 180));
        el.style.transform = `rotate(${ang.toFixed(3)}deg) translateY(${y.toFixed(2)}px)`;
        el.style.visibility = Math.abs(d) > ARC_HIDE_AT ? 'hidden' : 'visible';
        el.style.zIndex = String(Math.round(100 - Math.abs(d) * 10));
      }
    }
    let arcScheduled = false;
    // Scroll fires far more often than once per frame during native
    // momentum on some engines -- this collapses any number of scroll
    // events landing in the same frame into a single DOM write, always
    // reading scrollLeft fresh at the moment the frame actually runs
    // (not whatever stale value the event that scheduled it happened to
    // carry).
    function scheduleArc() {
      if (arcScheduled) return;
      arcScheduled = true;
      requestAnimationFrame(() => {
        arcScheduled = false;
        applyArc(track.scrollLeft / PAGE_W);
      });
    }
    applyArc(track.scrollLeft / PAGE_W); // correct from first paint, before any 'scroll' event has fired

    // Reads the track's current rest position and converts it to a card
    // index. Exact (not just "close enough"), because every card is the
    // same width+gap and the track's side padding was built to make each
    // snap point land at exactly `index * PAGE_W` -- see PAGE_W's comment
    // above.
    function settle() {
      const idx = Math.max(0, Math.min(COUNT - 1, Math.round(track.scrollLeft / PAGE_W)));
      setCurrentIndex(idx);
    }

    function onScroll() {
      // Runs every scroll frame regardless of source -- native swipe/
      // wheel AND the programmatic prev/next glide below both change
      // scrollLeft, which fires this same event either way.
      scheduleArc();
      if (autoScrolling) return; // scrollToIndex() drives its own currentIndex updates, see below
      setCurrentIndex((prev) => (prev === -1 ? prev : -1));
      if (!hasScrollEnd) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(settle, 120);
      }
    }
    function onScrollEnd() {
      if (autoScrolling) return;
      clearTimeout(scrollTimer);
      settle();
    }
    // A real touch/mouse drag starting on the track takes over scrollLeft
    // natively -- cancel any JS-driven prev/next glide still in flight so
    // the two never fight over the same property in the same frame (same
    // "an interrupt always wins cleanly" principle as the old system's
    // stopEasing(), just far simpler here since there's no visual position
    // to reconstruct -- the browser already knows exactly where the
    // content is mid-drag).
    function onPointerDown() {
      if (autoScrollCancel) {
        autoScrollCancel();
        autoScrollCancel = null;
      }
      autoScrolling = false;
    }

    // Animates track.scrollLeft to the target index's snap position over
    // NAV_EASE_MS with easeInOutCubic. Used by the prev/next buttons only --
    // see this file's header comment for why native swipe/wheel never run
    // this. Safe to call again mid-glide (a quick double-tap on an arrow):
    // it starts its `from` at the track's actual current scrollLeft, same
    // "pick up from wherever it visually is" principle as the old
    // commitTo()/currentVisualPos(), simpler here because scrollLeft IS the
    // visual position already, nothing to reconstruct.
    function scrollToIndex(idx) {
      const clamped = Math.max(0, Math.min(COUNT - 1, idx));
      const target = clamped * PAGE_W;
      if (autoScrollCancel) {
        autoScrollCancel();
        autoScrollCancel = null;
      }
      const start = track.scrollLeft;
      const change = target - start;
      if (Math.abs(change) < 1 || prefersReducedMotion()) {
        track.scrollLeft = target;
        autoScrolling = false;
        setCurrentIndex(clamped);
        return;
      }
      autoScrolling = true;
      setCurrentIndex(-1);
      const startTime = performance.now();
      let rafId;
      function step(now) {
        const frac = Math.min(1, (now - startTime) / NAV_EASE_MS);
        track.scrollLeft = start + change * easeInOutCubic(frac);
        if (frac < 1) {
          rafId = requestAnimationFrame(step);
          autoScrollCancel = () => cancelAnimationFrame(rafId);
        } else {
          autoScrolling = false;
          autoScrollCancel = null;
          setCurrentIndex(clamped);
        }
      }
      rafId = requestAnimationFrame(step);
      autoScrollCancel = () => cancelAnimationFrame(rafId);
    }

    // Prev/next buttons (rendered on the centred card only -- see render
    // below): advance/retreat exactly one card from wherever the carousel
    // actually is right now (read live off scrollLeft, not off React state
    // -- avoids a stale read from inside this plain DOM-event closure).
    // Bounded, not infinite-loop: tapping next on the last card, or prev on
    // the first, is a no-op (scrollToIndex clamps and the `< 1px change`
    // check above skips the animation entirely) -- a deliberate
    // simplification from the old arc system's wraparound, which isn't
    // something native CSS scroll-snap does cleanly or reliably across
    // engines without cloning DOM nodes at both ends; six project cards
    // don't need an infinite ring to browse comfortably.
    navRef.current = {
      prev: () => scrollToIndex(Math.round(track.scrollLeft / PAGE_W) - 1),
      next: () => scrollToIndex(Math.round(track.scrollLeft / PAGE_W) + 1),
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (hasScrollEnd) track.addEventListener('scrollend', onScrollEnd);
    track.addEventListener('pointerdown', onPointerDown);

    return () => {
      clearTimeout(scrollTimer);
      if (autoScrollCancel) autoScrollCancel();
      track.removeEventListener('scroll', onScroll);
      if (hasScrollEnd) track.removeEventListener('scrollend', onScrollEnd);
      track.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  // Ported from MainMobile.dc.html's _xOpen/_xGoTo -- see HomeDesktop.js's
  // matching handleCardOpen and lib/cardTransition.js. A drag/flick never
  // reaches this: the browser itself suppresses the click a touch-scroll
  // leaves behind on whatever element the finger lifted over (standard
  // behaviour for any native horizontally-scrollable element, the same
  // heuristic every other scrollable UI on the web already relies on) --
  // no custom moved-tracking/onCarClick guard needed any more, unlike the
  // old pointer-driven drag this replaced.
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

          <div className="car2">
            <div className="car2-track" ref={trackRef} role="group" aria-roledescription="carousel" aria-label="Projects">
              {LABELS.map((label, i) => {
                const Art = CARD_ART[i];
                const href = `/proyectos#${i}`;
                const gradient = GRADIENTS[i];
                const isCurrent = i === currentIndex;
                const card = { href, gradient };
                return (
                  <div
                    className="card-slot"
                    style={{ '--i': i }}
                    ref={(el) => {
                      cardSlotRefs.current[i] = el;
                    }}
                    key={i}
                  >
                    <Link
                      className={`card-face${isCurrent ? ' is-current' : ''}`}
                      href={href}
                      draggable="false"
                      aria-label={`Open project: ${label}`}
                      onClick={(e) => handleCardOpen(e, card)}
                    >
                      {Art ? (
                        // `active` only matters to AXA/UNDP (the two JS-driven
                        // cards); the other four read `.is-current` from CSS
                        // instead and silently ignore this prop.
                        <Art active={isCurrent} />
                      ) : (
                        <>
                          <div className="card-art" style={{ background: gradient }} aria-hidden="true" />
                          <span className="card-tag">{label}</span>
                        </>
                      )}
                    </Link>
                    <div className="card-cta">
                      <Link
                        className="btn-primary btn-discover"
                        href={href}
                        draggable="false"
                        onClick={(e) => handleCardOpen(e, card)}
                      >
                        Discover
                      </Link>
                      {/* Always rendered for every card, not just the current
                          one -- visibility is driven purely by the
                          `.card-face.is-current ~ .card-cta .card-nav` CSS
                          rule in home-mobile.css, so the DOM node never
                          disappears mid-tap (see that file's fix #16 comment
                          for the flicker this avoids). */}
                      <div className="card-nav">
                        <button
                          type="button"
                          className="btn-tertiary btn-nav-arrow"
                          aria-label="Previous project"
                          tabIndex={isCurrent ? 0 : -1}
                          onClick={() => navRef.current.prev()}
                        >
                          {/* Same arrow-glyph-in-Manrope treatment as the "See
                              next case" button at the bottom of each project. */}
                          <span aria-hidden="true">&larr;</span>
                        </button>
                        <button
                          type="button"
                          className="btn-tertiary btn-nav-arrow"
                          aria-label="Next project"
                          tabIndex={isCurrent ? 0 : -1}
                          onClick={() => navRef.current.next()}
                        >
                          <span aria-hidden="true">&rarr;</span>
                        </button>
                      </div>
                    </div>
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
