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
// a card counts as hover (`.is-held`; its lift/grow CSS was removed per
// Victoria's request -- see home-mobile.css -- but the class/timer
// machinery below is kept, since it's also load-bearing for tap-vs-hold-
// vs-drag disambiguation), a drag never opens a card, a quick tap does -- wheel
// support for a touch-capable trackpad, keyboard-focus recentring, and a
// simplified load-time reveal standing in for the dropped transition's
// entrance choreography.
//
// Each card's bespoke art animation (the tile mosaic, the spinning star,
// the glitch swap, etc. -- see CARD_ART below) plays on its own, in a loop,
// for as long as that card sits centred in the carousel AND the carousel
// itself has fully stopped moving (the `settled` state + `currentIndex`,
// just below): the render applies that as `.is-current` on `.card-face`
// (home-mobile.css's trigger selectors) and as an `active` prop on <Art/>
// (for AXA/UNDP's JS-driven art). This replaced an earlier version where a
// ~240ms press (`.is-held`, via holdOn/holdOff below) triggered the art
// instead -- `.is-held` still exists (see above), it just no longer feeds
// any card's art, and no longer has a visible lift/grow effect of its own
// either. A first pass
// at the centred-trigger gated on proximity to centre alone (a small
// epsilon on `d`) rather than on the carousel being fully at rest, which
// could mark a card current ~100ms before the settle ease actually
// finished -- on a real phone, starting a heavy CSS transition (Mapfre's
// tile mosaic, say) while the carousel's own per-frame re-render was still
// running read as a stutter right as the card arrived at centre. Gating on
// `settled` instead removes that overlap by construction.
//
// The settle-to-target animation itself (after a swipe/wheel-idle/focus
// commits to a new card -- see commitTo() below) is driven by a CSS
// `transition` on each card's own `transform`, toggled via the `easing`
// state/wrapperStyle, NOT by a per-frame JS tween calling setPos() every
// rAF frame like it used to. Victoria reported the card doing "3 pasos"
// (visibly discrete jumps) on her phone specifically during this settle,
// never during the drag itself -- i.e. dropped frames, not a speed/shape
// problem (fix #10's duration/curve were already right). A JS-driven tween
// pays a full React re-render + commit + paint for every single animation
// frame; on a weaker phone that cost alone can be enough to miss frames,
// which is exactly what reads as discrete steps instead of one continuous
// slide. A CSS transition instead needs ONE React commit (snapping `pos`
// straight to the final target) and lets the browser's compositor
// interpolate the visual motion on its own thread, independent of
// React/JS's per-frame cost. See commitTo()/stopEasing()/currentVisualPos()
// below for how dragging or a new commit can still cleanly interrupt an
// in-flight settle without a visible pop, which is the one thing the old
// per-frame tween got "for free" that this design has to do on purpose.

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
// swaps :hover for .is-current -- applied below to whichever card's slot
// is centred in the carousel (see buildCards()'s `isCurrent`). The two
// JS-driven cards (AXA/UNDP) take a matching `active` prop instead of
// relying on their own pointerover/pointerout listeners on mobile: those
// components now skip wiring up real pointer events whenever an `active`
// prop is passed at all (mobile always passes one; HomeDesktop.js never
// does, so desktop's hover behaviour is untouched).
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
// Fixed settle duration (fix #10) -- now also the CSS transition's own
// duration (fix #13), so it has to live at module scope: buildCards() below
// needs it for each card's wrapperStyle.transition, and the component's
// effect needs the same number for commitTo()/currentVisualPos(). The curve
// is a cubic-bezier hand-picked to match the original `1-(1-frac)²`
// quadratic ease-out this replaced (easings.net's "easeOutQuad") -- not
// mathematically identical to a CSS cubic-bezier, but visually
// indistinguishable, which is all that's needed here.
const EASE_DUR_MS = 220;
const EASE_CURVE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

function buildCards(pos, currentIndex, easing) {
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
      // Drives each card's bespoke art animation (home-mobile.css's
      // .is-current selectors + the `active` prop passed to <Art/> below),
      // in place of the old press-and-hold trigger. `currentIndex` is -1
      // (so no card ever matches) while the carousel is still actually
      // moving -- see the `settled` state in the component below. An
      // earlier version of this instead compared `d` against a small
      // epsilon, which could flip a card's art on ~100ms before tick()'s
      // settle ease actually finished: that overlap meant a heavy CSS
      // transition (Mapfre's ~27-selector tile mosaic, say) kicked off
      // while the carousel's own per-frame re-render was still running,
      // and on a real phone (weaker GPU than this repo's dev/test
      // environment) that contention is what read as "se traba" / stutter
      // right as the card arrived at centre. Gating on `settled` instead
      // guarantees zero overlap by construction: nothing is ever marked
      // current until the carousel has fully stopped producing new
      // frames, however long that happens to take.
      isCurrent: i === currentIndex,
      // Only enabled during a committed settle, never during an active drag
      // -- a drag needs instant 1:1 tracking, this would otherwise add a
      // laggy 220ms delay to every finger movement. Applied as a CLASS
      // (`.card-slot.is-easing` in home-mobile.css), not an inline
      // `transition` style: `.card-slot` already declares its own
      // `transition: opacity ...` for the load-time reveal (see that CSS),
      // and an inline `transition` would replace that whole shorthand,
      // silently breaking the entrance fade. The CSS class re-states the
      // opacity transition alongside the transform one instead.
      isEasing: easing,
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
  // Whether the carousel is fully at rest (not dragging, no settle commit in
  // flight) -- see onWinMove/commitTo()/stopEasing() below, the only places
  // this flips. Gates which card (if any) counts as "current" for the
  // bespoke-art trigger (see buildCards()'s isCurrent): a card is only ever
  // marked current once this is true, never while the carousel is still
  // dragging or mid-settle.
  const [settled, setSettled] = useState(true);
  // Whether a committed (non-drag) settle is currently animating via CSS
  // transition -- see commitTo()/EASE_CURVE below (fix #13), and the
  // `.card-slot.is-easing` class it drives in home-mobile.css. Narrower
  // than `settled`: `settled` is also false during an active drag, but
  // `easing` must NEVER be true then (a drag needs instant 1:1 tracking,
  // not a 220ms-lagged one).
  const [easing, setEasing] = useState(false);
  const [entered, setEntered] = useState(false);
  const carRef = useRef(null);
  // Imperative next()/prev(), wired up once inside the big pointer/wheel
  // effect below (same ref-exposing-a-closure pattern as AXACard.js's
  // apiRef) so the prev/next buttons rendered on the centred card (see
  // render below) can trigger exactly the same commitTo()-driven settle as
  // a swipe, instead of duplicating any of that logic here.
  const navRef = useRef({ next() {}, prev() {} });

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
    let easeDoneTimer = null; // named timer, cleared below on unmount
    let rafId = null;
    // Settle-to-target animation reference points (see commitTo()/
    // currentVisualPos() below). easeFrom/easeTarget/easeStart describe the
    // CSS transition currently in flight (if any) -- not used to drive the
    // motion itself (the browser's compositor does that), only to work out
    // where the card visually IS right now if something needs to interrupt
    // it cleanly (a new drag, a new commit, a live wheel nudge).
    let easeFrom = 0;
    let easeTarget = 0;
    let easeStart = performance.now();
    // Mirrors the `easing` state above, readable/writable synchronously
    // (same pattern as posVal/settledNow -- avoids a stale read of React
    // state from inside a plain event handler).
    let easingNow = false;
    // Set (not applied) by onWinMove below; consumed here, at most once per
    // rendered frame. Touch `pointermove` can dispatch more than once per
    // vsync on some mobile browsers, and calling `setPos()` straight from
    // that handler commits a React re-render per event rather than per
    // frame -- wasted work (several renders that never even get painted)
    // that was the main cause of the sluggish/non-smooth drag feel on
    // mobile. Routing every update through this already-running rAF loop
    // instead caps it at one commit per frame.
    let dragDirty = false;
    // Mirrors the `settled` state above, readable/writable synchronously
    // (same pattern as posVal/dragDirty/etc. above). Flips false the
    // instant real drag motion starts or a settle commits to a new target,
    // true again once that settle has visually finished -- see
    // onWinMove/commitTo() below.
    let settledNow = true;

    // While a CSS-driven settle (commitTo() below) is still animating,
    // `posVal` already holds the FINAL target -- it's snapped there
    // immediately at commit time, see commitTo() -- not whatever the
    // browser is currently painting on screen mid-transition. This
    // reconstructs that on-screen position at this instant, using the same
    // quadratic ease-out EASE_CURVE approximates. Only needed for the rare
    // case where something interrupts an in-flight settle (a new drag, a
    // new commit, a live wheel nudge) and has to pick up from where the
    // card visually is, not from a target it hasn't reached yet.
    function currentVisualPos() {
      if (!easingNow) return posVal;
      const frac = Math.min(1, (performance.now() - easeStart) / EASE_DUR_MS);
      const eased = 1 - (1 - frac) * (1 - frac);
      return easeFrom + (easeTarget - easeFrom) * eased;
    }

    // Cleanly interrupts an in-flight CSS settle (see commitTo() below),
    // snapping pos/targetVal to wherever the card visually was and turning
    // the transition off in the SAME commit -- so nothing pops. Called
    // whenever something is about to take over the motion by other means
    // (a new drag starting, a live wheel nudge).
    function stopEasing() {
      if (!easingNow) return;
      clearTimeout(easeDoneTimer);
      posVal = currentVisualPos();
      targetVal = posVal;
      easingNow = false;
      settledNow = true;
      setSettled(true);
      setEasing(false);
      setPos(posVal);
    }

    // Commits to a new integer position with the fixed-duration ease-out
    // settle (fix #10's 220ms curve), driven by a CSS transition on each
    // card's own `transform` (the `easing` state/wrapperStyle) rather than
    // a per-frame JS tween -- see the file header and fix #13 for why.
    // `posVal`/`pos` snap to the FINAL value immediately, in one React
    // commit; the CSS transition is what makes that jump look smooth on
    // screen, entirely on the compositor, with no further JS involvement
    // once this returns (until the setTimeout below marks it settled).
    function commitTo(target) {
      clearTimeout(easeDoneTimer);
      const fromPos = currentVisualPos();
      targetVal = target;
      posVal = target;
      if (reduce) {
        easingNow = false;
        setEasing(false);
        settledNow = true;
        setSettled(true);
        setPos(posVal);
        return;
      }
      easeFrom = fromPos;
      easeTarget = target;
      easeStart = performance.now();
      easingNow = true;
      settledNow = false;
      setSettled(false);
      setEasing(true);
      setPos(posVal);
      easeDoneTimer = setTimeout(() => {
        easingNow = false;
        setEasing(false);
        settledNow = true;
        setSettled(true);
      }, EASE_DUR_MS);
    }

    function tick() {
      // The only per-frame job left: flushing the live drag position (see
      // onWinMove below) at most once per rendered frame. Settling to a
      // target is a one-shot CSS-transition commit now (commitTo() above),
      // not something this loop needs to drive frame by frame -- see the
      // file header and fix #13.
      if (dragging && dragDirty) {
        dragDirty = false;
        setPos(posVal);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Touch: a finger resting on a card for a moment plays the generic
    // press-lift feedback only (not any card's bespoke art animation
    // anymore -- that's driven by isCurrent/`.is-current` above instead).
    // Moving the finger turns it into a drag. A quick tap opens the
    // project; a hold or a drag never does.
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
      // If a CSS settle was still animating, pick up from exactly where the
      // card visually is (not from a target it hasn't reached yet) and
      // turn the transition off in the same commit -- see stopEasing()
      // above. A no-op if nothing was easing.
      stopEasing();
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
        // Only an actual drag (crossing this threshold) unsettles -- a
        // finger merely resting on a card (pointerdown without movement,
        // e.g. a tap or a brief hold) never moves posVal, so there's
        // nothing for a bespoke art animation to visually clash with yet.
        // (stopEasing() in onDragStart above already unsettled this if a
        // CSS settle was still in flight when the drag started.)
        if (settledNow) {
          settledNow = false;
          setSettled(false);
        }
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
      // springs back to the card it started on (commitTo() below already
      // animates that return).
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
      posVal -= shift; // wrap-normalize the drag-end position first, same as before
      commitTo(tr - shift);
    }

    // Suppresses the click a drag/hold release leaves behind.
    function onCarClick(e) {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Trackpad/mouse wheel on a touch-capable device drives the carousel
    // too, alongside drag -- the two never conflict since both write
    // posVal directly for live feedback (1:1, same as a drag) and only the
    // idle-settle below commits to a final card via commitTo().
    function onWheel(e) {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      stopEasing(); // a live scroll interrupts any in-flight settle, same as starting a drag would
      // A live scroll moves posVal off-target same as a drag does, so it
      // has to unsettle too -- otherwise `settled` could still read `true`
      // (nothing marked it false) while `pos` is mid-scroll and not
      // actually resting on any card, which would wrongly let buildCards()
      // match a card as current. See the matching check in onWinMove.
      if (settledNow) {
        settledNow = false;
        setSettled(false);
      }
      posVal -= delta / 340;
      targetVal = posVal;
      setPos(posVal);
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => {
        const tr = Math.round(targetVal);
        const shift = Math.floor(tr / COUNT) * COUNT;
        posVal -= shift;
        commitTo(tr - shift);
      }, 140);
    }

    function onCardFocus(e) {
      const a = e.target && e.target.closest ? e.target.closest('.card-face') : null;
      if (!a) return;
      const all = Array.prototype.slice.call(document.querySelectorAll('.card-face'));
      const idx = all.indexOf(a);
      if (idx < 0) return;
      commitTo(Math.round((currentVisualPos() - idx) / COUNT) * COUNT + idx);
    }

    // Prev/next buttons (rendered on the centred card only -- see render
    // below): advance/retreat exactly one card from wherever the carousel
    // visually is right now, via the same commitTo() settle a swipe uses.
    // Safe to call mid-settle too -- commitTo() already starts its `from`
    // at currentVisualPos(), the same interrupt-cleanly path a second quick
    // swipe or a focus move relies on.
    navRef.current = {
      next: () => commitTo(currentVisualPos() + 1),
      prev: () => commitTo(currentVisualPos() - 1),
    };

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
      clearTimeout(easeDoneTimer);
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

  // -1 while not settled so buildCards() never matches any card -- see
  // `settled` above. Once settled, `pos` is guaranteed to already be an
  // exact integer (every targetVal setter below rounds/wraps to one before
  // the carousel is allowed to call this settled), so this is just an
  // index lookup, not a rounding decision.
  const currentIndex = settled ? (((Math.round(pos) % COUNT) + COUNT) % COUNT) : -1;
  const cards = buildCards(pos, currentIndex, easing);
  const ticksStyle = {
    transform: `rotate(${(-pos * STEP).toFixed(3)}deg)`,
    // Same CSS-transition settle as each card's wrapperStyle -- see
    // commitTo()/EASE_CURVE above (fix #13) -- so the decorative tick
    // marks glide in sync with the cards instead of snapping instantly.
    transition: easing ? `transform ${EASE_DUR_MS}ms ${EASE_CURVE}` : 'none',
  };

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
                <div
                  className={`card-slot${card.isEasing ? ' is-easing' : ''}`}
                  style={card.wrapperStyle}
                  key={card.index}
                >
                  <Link
                    className={`card-face${card.isCurrent ? ' is-current' : ''}`}
                    href={card.href}
                    draggable="false"
                    aria-label={`Open project: ${card.label}`}
                    onClick={(e) => handleCardOpen(e, card)}
                  >
                    {Art ? (
                      // `active` only matters to AXA/UNDP (the two JS-driven
                      // cards); the other four read `.is-current` from CSS
                      // instead and silently ignore this prop.
                      <Art active={card.isCurrent} />
                    ) : (
                      <>
                        <div className="card-art" style={{ background: card.gradient }} aria-hidden="true" />
                        <span className="card-tag">{card.label}</span>
                      </>
                    )}
                  </Link>
                  <div className="card-cta">
                    <Link
                      className="btn-primary btn-discover"
                      href={card.href}
                      draggable="false"
                      onClick={(e) => handleCardOpen(e, card)}
                    >
                      Discover
                    </Link>
                    {/* Fix #16: always rendered now, for every card -- not just
                        the current one -- and hidden/shown via the
                        `.card-face.is-current ~ .card-cta .card-nav` CSS rule
                        in home-mobile.css instead of this JSX conditional. The
                        old `card.isCurrent ? ... : null` mounted/unmounted this
                        whole block, and isCurrent flips false the instant
                        commitTo() runs (same tick as the tap that calls
                        navRef.current.next()/prev()) -- so the very button just
                        tapped was torn out of the DOM immediately, and nothing
                        had a .card-nav again until the settle finished 220ms
                        later. See home-mobile.css for the fade that replaces it. */}
                    <div className="card-nav">
                      <button
                        type="button"
                        className="btn-tertiary btn-nav-arrow"
                        aria-label="Previous project"
                        tabIndex={card.isCurrent ? 0 : -1}
                        onClick={() => navRef.current.prev()}
                      >
                        {/* Icon style (fix #16): same arrow-glyph-in-Manrope
                            treatment as the "See next case" button at the
                            bottom of each project (see proj-next-case /
                            mapfre-next-case in Proyectos), not a separate SVG
                            icon -- see home-mobile.css for the sizing. */}
                        <span aria-hidden="true">&larr;</span>
                      </button>
                      <button
                        type="button"
                        className="btn-tertiary btn-nav-arrow"
                        aria-label="Next project"
                        tabIndex={card.isCurrent ? 0 : -1}
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
