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
// Same day, the arc visual (centre card prominent, neighbours visibly
// arcing away at the sides) was layered back on top as a plain CSS
// transform -- same RC/STEP math HomeDesktop.js uses -- written straight to
// each `.card-slot` via refs, recomputed from the track's live scrollLeft.
//
// ===== Fix #24/#25/#26 (2026-10-28, same day, from Victoria's real-iPhone
// video of the above) =====
// Three more issues, all from a real Safari/iOS recording (this
// environment's test browser is Chromium, which does not reproduce several
// Safari-only behaviours -- see contexto-portafolio-vercel.md's standing
// note): advancing felt "robotic"/stepped rather than smooth (#24); nothing
// meaningful showed to the right of the first card, Mapfre -- Victoria
// asked for the carousel to behave "like a closed circle" instead (#25);
// and the whole block read as cramped -- cards too close to the title,
// arrows too close to the browser's own bottom chrome (#26, which also
// touches home-mobile.css's sizing, not just this file).
//
// #24 -- robotic motion: the arc transform used to be recomputed only
// inside the 'scroll' event handler (scheduleArc() below, now removed).
// WebKit on iOS is known to coalesce/throttle 'scroll' event dispatch much
// more aggressively than Chrome during native momentum scrolling -- so on
// a real iPhone the rotate()/translateY() transform only updated in
// occasional big jumps instead of every frame, reading as stepped/
// "robotized" motion, even though the exact same code looked perfectly
// smooth in this environment's Chromium test browser (which doesn't
// throttle 'scroll' the same way). Fix: a plain requestAnimationFrame loop
// now polls track.scrollLeft directly every frame, independent of whether
// or when 'scroll' actually fires -- see the tick()/rafId loop below. This
// decouples the arc's update rate from the engine's event-dispatch cadence
// entirely, so it now updates at the display's own refresh rate on every
// engine, Safari included.
//
// #25 -- closed-circle carousel: the carousel used to be deliberately
// bounded (tapping next on the last card, or prev on the first, was a
// no-op) -- a simplification noted in this file's prior revision as "not
// something native CSS scroll-snap does cleanly or reliably across engines
// without cloning DOM nodes at both ends". Victoria has now explicitly
// asked for the wraparound that simplification skipped, so this fix
// implements exactly that cloning: the rendered strip is the real six
// cards PLUS a clone of the last card prepended and a clone of the first
// card appended (EXT_COUNT = COUNT + 2, see realIndexOf() below). Scrolling
// past either real end reveals the *other* end's card (pixel-identical to
// its real slot) continuing the strip, then -- the instant native
// scrolling settles there -- JS silently snaps the underlying scrollLeft
// back to the matching real slot (see finishAt()'s wraparound branch). Since
// the clone and the real slot render identical content, this correction is
// imperceptible; it's the same technique every "infinite" scroll-snap
// carousel on the web relies on. currentIndex (and so `.is-current`,
// everything the six bespoke card-art animations key off) never flickers
// across this jump: realIndexOf(0) and realIndexOf(EXT_COUNT-1) already
// equal the real last/first card's own index, so the corrective scrollLeft
// write changes WHERE the track is scrolled to, never WHICH card is
// current.
//
// #26 -- cramped layout: see home-mobile.css's matching comment -- the
// carousel's own on-screen size (CARD_W/CARD_H below) was reduced, which is
// what actually frees up the vertical room; the gaps around it were only
// retuned, not the main lever.
//
// ===== Fix #29/#30/#31/#32 (2026-10-28, next conversation, from Victoria
// re-testing #27/#28 live on her iPhone against the carousel-fixes-review
// preview) =====
// Four more reports from that same real-device pass: the arc still read as
// the card "falling"/"tilting toward the bottom-right corner" on AXA/
// victorai/Undp especially, and MORE so when using the prev/next arrows
// than on a swipe (#29); the arrow glide itself didn't feel smooth, almost
// "like it's loading" (#30, same root cause as part of #29 -- see below);
// the arrows disappeared and seemed to shift position every time the
// carousel changed card, which Victoria said they should never do (#31);
// and 8 more px of air was asked for between the title and the carousel
// (#32).
//
// #29 -- still "falls"/"tilts", worse on the arrows: RC=2600 (fix #28)
// already cut the SWEEP a card travels through, but rotate()+translateY()
// together still read as one continuous "lean and drop toward the bottom
// corner" motion, no matter how small -- and that drop (translateY) is the
// part that actually looks like weight/gravity, not the rotation (which
// alone just reads as a tilt, closer to what fix #23 was asked to restore).
// Victoria didn't single out AXA/victorai/Undp because of anything specific
// to those three cards' own code (nothing in applyArc() or the per-card
// components keys off card identity) -- they're simply the second half of
// the six-card loop, the stretch she kept swiping through for longest in
// this round's test pass, so the same universal transform had more chances
// to register as "heavy" there. Fix: decoupled the drop from the rotation
// with its own independent multiplier (DROP_SCALE below) instead of pushing
// RC even higher (which would also flatten the rotation Victoria asked
// fix #23 to bring back) -- same `ang`/STEP driving the rotation as before,
// just a smaller fraction of the matching translateY riding along with it.
// Worse on the arrows specifically because scrollToIndex()'s old
// easeInOutCubic glide has a slow-starting first half -- during which the
// rotation/drop is already changing but the card barely seems to move
// horizontally yet -- which is exactly what reads as the card "sinking"
// before it "catches up": see fix #30, the other half of this same
// complaint.
//
// #30 -- arrow glide "no fluido"/"como que está cargando": a plain native
// swipe decelerates the way the OS already knows gestures should feel;
// scrollToIndex()'s 420ms easeInOutCubic glide, by contrast, spends its
// first ~150-200ms barely moving (a slow ease-IN) before the motion visibly
// picks up -- a dead zone right after the tap that reads as a stall/load,
// not a response to the tap. Switched to a plain ease-OUT cubic (motion
// starts at full speed the instant the glide begins, only decelerating
// into the landing) and trimmed the duration (420ms -> 320ms) to match a
// snappier, more immediate-feeling tap response -- closer to how the
// native swipe's own deceleration already feels than the old symmetric
// ease was.
//
// #31 -- arrows disappearing/shifting: under the pre-#31 design, the
// prev/next buttons were two small DOM nodes duplicated once INSIDE every
// one of the EXT_COUNT `.card-slot`s (hidden via opacity on all but the
// currently-centred one, see this file's prior revision's `.card-nav`
// rendering + home-mobile.css's matching `.is-current` sibling-selector
// rule) -- which inherited that slot's own arc transform AND its own
// `.is-current`-driven opacity fade. Every swipe/tap sets currentIndex to
// -1 for the scroll's whole duration (no card is "current" while actually
// moving, by design -- see currentIndex's own declaration comment above),
// so the arrows' opacity dropped to 0 and back on every single advance --
// exactly what read as "disappearing". And because the buttons lived
// inside a transformed `.card-slot`, their on-screen position was only
// ever guaranteed to match the PREVIOUS current card's slot, not
// necessarily pixel-identical to the new one depending on timing -- read
// as "moving". Fix: the two buttons are no longer rendered per-slot at
// all -- a single, persistent pair now lives outside `.car2-track`
// entirely (see the render below and home-mobile.css's new `.car2-nav`),
// never opacity-toggled, never inside anything the arc transform touches,
// so there's structurally nothing left to make them disappear or shift:
// they're one DOM node pair, in one fixed CSS position, for the whole time
// the page is open. (Discover deliberately keeps its OLD per-slot
// behaviour -- unlike the arrows, Victoria has never asked for that to
// change, and it's a real feature: Discover under a neighbouring,
// partially-visible card lets you open that project directly without
// first centring it.)
//
// #32 -- 8px more air, title-to-carousel: see home-mobile.css's `.car2`
// `top` (160px -> 168px) -- same lever fix #20/#23/#26 already used for
// this exact gap, just nudged once more per this round's explicit request.
//
// What's left for JS to do (updated):
//   1. Know which REAL card is centred (0..COUNT-1, never a clone's
//      position), to drive `.is-current` -- done by reading the track's
//      scrollLeft once scrolling goes idle and mapping it through
//      realIndexOf() (see finishAt()/settle() below).
//   2. Drive a prev/next BUTTON tap's glide (scrollToIndex below) -- native
//      swipe/wheel scrolling never touches this at all.
//   3. Continuously recompute and write each slot's arc transform, at the
//      display's own frame rate, independent of 'scroll' event timing
//      (fix #24) -- see applyArc()/the tick() loop in the effect below.
//   4. Silently correct the scroll position back onto a real slot whenever
//      native scrolling (or a button glide) settles on one of the two
//      cloned end slots (fix #25) -- see finishAt() below.
// Card width (CARD_W/CARD_GAP below) is direct pixel sizing, no extra scale
// transform -- see home-mobile.css's matching .card-slot/.car2-track rules,
// which MUST stay numerically in sync with these. Card HEIGHT lives only in
// CSS (see that file) -- the math below never needs it directly.
//
// Each card's bespoke art animation (the tile mosaic, the spinning star,
// the glitch swap, etc. -- see CARD_ART below) plays on its own, in a loop,
// for as long as that card sits centred in the carousel AND the carousel
// itself has fully stopped moving: the render applies that as `.is-current`
// on `.card-face` (home-mobile.css's trigger selectors) and as an `active`
// prop on <Art/> (for AXA/UNDP's JS-driven art) -- same convention as
// before the rebuild, just now driven by `currentIndex` below.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
// Extended strip length (fix #25): the six real cards plus one cloned slot
// at each end (a copy of the last card prepended, a copy of the first card
// appended) -- see realIndexOf() below for the position->real-card mapping,
// and this file's header comment for why.
const EXT_COUNT = COUNT + 2;
// Maps an extended-strip position (0..EXT_COUNT-1) to the real card index
// (0..COUNT-1) it should render. Position 0 is a clone of the LAST real
// card, positions 1..COUNT are the real cards in order, and position
// EXT_COUNT-1 is a clone of the FIRST real card -- so this wraps cleanly
// with a single modulo, no special-casing needed anywhere it's used
// (render, applyArc, the wraparound correction in finishAt): the two clone
// positions simply map to the same real index as their real counterpart.
function realIndexOf(p) {
  return ((p - 1) % COUNT + COUNT) % COUNT;
}

// On-screen card size, px -- no extra scale transform any more (the old
// arc system rendered a 300x400 box through a 0.85 CSS scale; this sizes
// directly at the same effective on-screen size instead). MUST stay in
// sync with home-mobile.css's `.card-slot`/`.car2-track` rules, which
// hardcode these same numbers (cross-referenced in a comment there too).
// Fix #26: shrunk from 255x340 -- see home-mobile.css's matching comment on
// why this (not just trimming the gaps around it) is the real lever for
// the "cramped" complaint; aspect ratio (3:4) kept identical.
const CARD_W = 216;
const CARD_GAP = 20;
// Centre-to-centre scroll distance between adjacent cards. Since every
// card is the same width with a fixed gap, and the track's side padding is
// exactly (viewport - CARD_W)/2 (see home-mobile.css), each card's
// scroll-snap position lands at exactly `index * PAGE_W` -- no drift, no
// per-viewport-width special-casing needed to find "which card is this
// scrollLeft pointing at".
const PAGE_W = CARD_W + CARD_GAP;

// Arc visual: rotate()/translateY() layered on top of the native scroll
// position, same shape of math as HomeDesktop.js's own RC/STEP (see that
// file) -- `ang = d*STEP`, `translateY = RC*(1-cos(ang))`. STEP is derived
// (not a fixed degree count, unlike desktop's own STEP=17) from RC and
// PAGE_W: the angle at which the arc's chord length equals PAGE_W, so
// adjacent cards keep landing visually close to PAGE_W apart even though
// the arc's true horizontal placement is non-linear (this value is only
// used for the rotation/vertical-drop added on top here; actual left-right
// placement still comes from native scroll, see the effect below and this
// file's header comment). Raising RC flattens the whole arc -- same
// derivation, gentler curve -- without breaking that chord-length
// invariant, which is the lever fix #28 below pulls.
//
// Fix #28 (2026-10-28): RC was 900 (reusing the pre-fix-#20 mobile arc's
// own value) until Victoria reported the carousel "tilting toward the
// bottom-right corner" on every swipe/arrow tap. At RC=900 the nearest
// visible neighbour (d=1) rotated ~15 deg and dropped ~32px, growing to
// ~35 deg / ~163px at the ARC_HIDE_AT cutoff -- fine as an occasional,
// chunky jump under the PRE-fix-#24 throttled updates, but fix #24 made
// this same transform recompute every frame, so a real swipe now visibly
// sweeps a card through that full rotation+drop as it slides toward
// centre -- which is exactly what reads as "the whole thing tilts". RC=2600
// (~3x) keeps the arc (Victoria asked fix #23 restore it, not remove it)
// but cuts that sweep to ~5 deg / ~11px at d=1, ~12 deg / ~57px at the
// cutoff -- still a visible curve, just no longer dramatic enough to read
// as a tilt. ARC_HIDE_AT left as-is; raising RC alone already shrinks the
// worst-case rotation/drop at every distance, no need to also hide cards
// sooner.
//
// Fix #29 (2026-10-28, next conversation): RC=2600 cut the SWEEP, but
// Victoria still read the combined rotate+translateY as the card "falling"
// toward the bottom-right corner (worse on the arrow glide -- see fix #30
// and this file's header comment for the full report). The translateY
// term is what actually looks like weight/gravity pulling a card down;
// the rotation alone just reads as a lean/tilt (the part Victoria asked
// fix #23 to bring back). DROP_SCALE lets the drop be dialled down
// independently of the rotation, instead of pushing RC even higher (which
// would flatten the rotation too). Still using the same `ang`/STEP as the
// rotation -- see applyArc() below -- just multiplying the resulting `y`
// by this fraction before writing it.
const RC = 2600;
const DROP_SCALE = 0.45;
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
// Fix #30 (2026-10-28, next conversation): was 420ms + easeInOutCubic.
// Victoria reported the arrow glide specifically (not swipe) felt
// unresponsive, "like it's loading" -- easeInOutCubic spends its first
// ~150-200ms barely moving (a slow ease-IN) before visibly picking up,
// which reads as a dead zone right after the tap rather than an immediate
// response to it. Switched to a plain ease-OUT curve (full speed from the
// first frame, decelerating only into the landing) and trimmed the
// duration, matching how a native swipe's own deceleration already feels
// much more closely than the old symmetric ease did.
const NAV_EASE_MS = 320;
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function HomeMobile() {
  // -1 while the track is mid-scroll (dragging, flicking, or an in-flight
  // button glide) so no card is ever marked `.is-current` while the
  // carousel hasn't actually come to rest -- same "wait for rest" principle
  // the old system's `settled` state existed for (see this file's header
  // comment), just read off the track's own scroll state instead of a
  // hand-tracked tween. Starts at 0 (not -1): nothing has scrolled yet on
  // first paint, card 0 (Mapfre) is simply already centred -- the initial-
  // position layout effect below lands the track there before paint, so
  // this stays true even with the fix #25 clone slots now in the strip.
  // Always a REAL card index (0..COUNT-1), never a clone's position -- see
  // realIndexOf().
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const trackRef = useRef(null);
  // Imperative prev()/next(), wired up inside the scroll-tracking effect
  // below (same ref-exposing-a-closure pattern as AXACard.js's apiRef) so
  // the prev/next buttons rendered on the centred card (see render below)
  // can reach the scrollToIndex() closure defined inside that effect
  // without re-creating it on every render.
  const navRef = useRef({ prev() {}, next() {} });
  // One DOM node per STRIP POSITION (0..EXT_COUNT-1, including the two
  // fix-#25 clone slots), set via the inline ref callback in the render
  // below -- applyArc() (in the effect below) writes the rotate()/
  // translateY() arc transform straight to these on every animation frame,
  // bypassing React state/re-render entirely (see this file's header
  // comment).
  const cardSlotRefs = useRef([]);
  // True for a short window after a scrollLeft write this effect makes on
  // its own (the fix-#25 initial positioning jump, or a wraparound
  // correction in finishAt()), so the 'scroll'/'scrollend' noise that
  // write provokes is ignored instead of being treated like a real user
  // scroll (which would otherwise mark the carousel "mid-scroll"/not-
  // current, or re-settle somewhere unintended). A TIME WINDOW (see
  // markSuppressed() below), not a one-shot flag cleared by the first
  // event: an instant, non-gesture scrollLeft write like these can provoke
  // more than one 'scroll' event, and in some cases never fires
  // 'scrollend' at all (confirmed on this exact initial-mount jump while
  // testing fix #25 -- a one-shot flag only protected the FIRST stray
  // event, a second one then set currentIndex to -1, and with no
  // 'scrollend' ever arriving to run settle() afterward, nothing ever set
  // it back -- the whole carousel was left with no card marked current,
  // ever). A ref (not a plain closure variable) because it's written from
  // the layout effect below and read from the scroll-tracking effect's
  // closures.
  const suppressSettleRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    const t = setTimeout(() => setEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Fix #25: lands the track on the first REAL card (strip position 1 --
  // position 0 is the cloned-last-card slot, see realIndexOf()) before the
  // browser paints, so the page never flashes the clone at position 0
  // (which, being a clone of the LAST card, would otherwise be what a
  // freshly-mounted, unscrolled track shows first). useLayoutEffect (not
  // useEffect) specifically so this happens before paint, same guarantee a
  // plain default scrollLeft of 0 would have had pre-fix-#25.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = PAGE_W;
    // The main effect below (which starts its own suppress window covering
    // this jump via markSuppressed()) always runs synchronously right
    // after this one, in the same commit, before the browser has had any
    // chance to dispatch the resulting 'scroll' event -- so there's no gap
    // here for a stray event to slip through unsuppressed.
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

    // Opens (or extends) a short window during which onScroll/onScrollEnd
    // (below) ignore whatever 'scroll'/'scrollend' noise a scrollLeft write
    // this effect just made on its own provokes -- see suppressSettleRef's
    // declaration above for why this is a time window, not a one-shot flag.
    let suppressTimer = null;
    function markSuppressed() {
      suppressSettleRef.current = true;
      clearTimeout(suppressTimer);
      suppressTimer = setTimeout(() => {
        suppressSettleRef.current = false;
      }, 160);
    }
    // Covers the layout effect's initial-position jump, just above this in
    // the same commit -- see that effect's comment for why there's no gap
    // for a stray event to slip through before this call.
    markSuppressed();

    // Writes the arc transform (rotate + vertical drop, see RC/STEP above)
    // to every slot in the EXTENDED strip (fix #25 -- includes the two
    // cloned end slots, same math, no special-casing needed) for a given
    // continuous centre position `pos` (a float -- the fractional strip
    // position the track is currently scrolled to, NOT just the settled
    // integer position). Direct DOM writes, no setState -- see the
    // continuous rAF loop below (fix #24) that drives this every frame;
    // going through React here would reintroduce exactly the per-frame-
    // re-render cost fix #13 moved away from (see
    // contexto-portafolio-vercel.md).
    function applyArc(pos) {
      const cards = cardSlotRefs.current;
      for (let i = 0; i < EXT_COUNT; i++) {
        const el = cards[i];
        if (!el) continue;
        const d = i - pos; // signed, continuous distance from centre, over the extended strip
        const ang = d * STEP;
        // DROP_SCALE (fix #29): same `ang` drives the rotation as always;
        // only the vertical-drop term is scaled down independently, so the
        // "lean" stays but the "falls toward the corner" sensation doesn't.
        const y = RC * (1 - Math.cos((ang * Math.PI) / 180)) * DROP_SCALE;
        el.style.transform = `rotate(${ang.toFixed(3)}deg) translateY(${y.toFixed(2)}px)`;
        el.style.visibility = Math.abs(d) > ARC_HIDE_AT ? 'hidden' : 'visible';
        el.style.zIndex = String(Math.round(100 - Math.abs(d) * 10));
      }
    }
    // Fix #24: a plain rAF loop polling track.scrollLeft every frame,
    // instead of only recomputing inside the 'scroll' event handler (the
    // old scheduleArc()/arcScheduled). WebKit on iOS coalesces/throttles
    // 'scroll' dispatch far more than Chrome during native momentum, which
    // made the old approach update the arc in occasional big jumps on a
    // real iPhone -- reading as "robotic"/stepped motion -- even though it
    // looked smooth in this environment's Chromium test browser (which
    // doesn't throttle the same way). Polling scrollLeft directly,
    // independent of whether/when 'scroll' fires, decouples the arc's
    // update rate from the engine's event cadence entirely: it now runs at
    // the display's own refresh rate regardless of engine. The loop runs
    // for the component's whole lifetime (cancelled on unmount below) --
    // the per-frame cost is trivial (EXT_COUNT little trig calcs + style
    // writes), so there's no real benefit to pausing it while idle, and
    // pausing/resuming it correctly around every possible interaction
    // (touch, wheel, button glide, programmatic correction) would be far
    // more code than the loop itself.
    let rafId;
    function tick() {
      applyArc(track.scrollLeft / PAGE_W);
      rafId = requestAnimationFrame(tick);
    }
    applyArc(track.scrollLeft / PAGE_W); // correct from first paint, before the loop's first frame
    rafId = requestAnimationFrame(tick);

    // Sets currentIndex from a settled extended-strip position AND, if
    // that position is one of the two fix-#25 clone slots, silently
    // corrects the underlying scrollLeft back onto the matching real slot
    // (same content, so the jump is imperceptible) -- the "closed circle"
    // behaviour Victoria asked for. Shared by both settle() (native swipe/
    // wheel) and scrollToIndex()'s own completion (prev/next buttons) so
    // the correction applies no matter which one lands on a clone.
    // currentIndex itself never flickers across the correction:
    // realIndexOf(0) and realIndexOf(EXT_COUNT-1) already equal the real
    // last/first card's index, so this sets the SAME currentIndex whether
    // extIdx is a clone position or its real counterpart.
    //
    // markSuppressed() runs here UNCONDITIONALLY, not just on the two
    // clone/correction positions -- found necessary while testing fix #25
    // live: 'scrollend' turned out not to fire reliably for ANY sequence of
    // plain JS scrollLeft writes in this environment (confirmed both for
    // the single instant correction jump below AND for scrollToIndex()'s
    // own 420ms rAF tween, which also writes scrollLeft directly, once per
    // frame, rather than through a native scrollTo({behavior:'smooth'})
    // call the browser recognises as one continuous "scroll" -- apparently
    // neither pattern reliably ends in a 'scrollend'). Without this,
    // scrollToIndex()'s own completion had the same failure mode the
    // mount-jump regression above did: autoScrolling flips back to false
    // synchronously, before the 'scroll' event from that same final write
    // has actually been dispatched, so that trailing event lands in
    // onScroll's NORMAL (non-autoScrolling) branch, sets currentIndex to
    // -1, and -- with no 'scrollend' arriving afterward to run settle() --
    // nothing ever set it back. A short suppress window after every settle
    // (native-scroll-driven or not) absorbs that trailing event too.
    function finishAt(extIdx) {
      setCurrentIndex(realIndexOf(extIdx));
      if (extIdx === 0 || extIdx === EXT_COUNT - 1) {
        // Found while testing fix #25 live, instrumenting every scrollLeft
        // write/scroll event on an actual wraparound: `scroll-snap-stop:
        // always` on every `.card-slot` (there so a fast real flick can
        // never skip past a card -- see that rule's own comment in
        // home-mobile.css) makes the browser treat THIS jump -- an instant
        // teleport PAST several intermediate snap points, e.g. strip
        // position 7 straight to position 1 -- as something it must itself
        // enforce by smooth-scrolling through every point in between,
        // overriding the instant jump with its own animation. Observed
        // landing somewhere else entirely (not even the intended target)
        // once that kicked in. Turning CSS scroll-snap off for the single
        // frame this jump happens in, then back on next frame (standard
        // technique for an infinite/looping scroll-snap strip), sidesteps
        // it: with snapping off, there's nothing for the browser to
        // enforce, so the instant jump just lands exactly where written.
        track.style.scrollSnapType = 'none';
        track.scrollLeft = (extIdx === 0 ? COUNT : 1) * PAGE_W;
        requestAnimationFrame(() => {
          track.style.scrollSnapType = '';
        });
      }
      markSuppressed();
    }

    // Reads the track's current rest position and converts it to an
    // extended-strip position. Exact (not just "close enough"), because
    // every slot is the same width+gap and the track's side padding was
    // built to make each snap point land at exactly `position * PAGE_W` --
    // see PAGE_W's comment above.
    function settle() {
      const extIdx = Math.max(0, Math.min(EXT_COUNT - 1, Math.round(track.scrollLeft / PAGE_W)));
      finishAt(extIdx);
    }

    function onScroll() {
      // Inside a scrollLeft write this effect made itself (the fix-#25
      // initial jump, or finishAt()'s wraparound correction) -- not a real
      // user scroll. Ignore it entirely, for the whole suppressed window
      // (see markSuppressed() above, and suppressSettleRef's declaration
      // for why this can't be a one-shot "ignore just the next event"
      // check): currentIndex is already correct (set before the write),
      // and treating this noise like a real scroll would otherwise flicker
      // currentIndex to -1, possibly with nothing left to set it back (an
      // instant, non-gesture scrollLeft write doesn't reliably provoke a
      // 'scrollend' to run settle() afterward -- confirmed while testing
      // this fix, see suppressSettleRef's comment).
      if (suppressSettleRef.current) return;
      if (autoScrolling) return; // scrollToIndex() drives its own currentIndex updates, see below
      setCurrentIndex((prev) => (prev === -1 ? prev : -1));
      if (!hasScrollEnd) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(settle, 120);
      }
    }
    function onScrollEnd() {
      if (suppressSettleRef.current) return; // same reasoning as onScroll above
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

    // Animates track.scrollLeft to the target extended-strip position's
    // snap position over NAV_EASE_MS with easeInOutCubic. Used by the
    // prev/next buttons only -- see this file's header comment for why
    // native swipe/wheel never run this. Safe to call again mid-glide (a
    // quick double-tap on an arrow): it starts its `from` at the track's
    // actual current scrollLeft, same "pick up from wherever it visually
    // is" principle as the old commitTo()/currentVisualPos(), simpler here
    // because scrollLeft IS the visual position already, nothing to
    // reconstruct. Clamped to the FULL extended range (0..EXT_COUNT-1,
    // fix #25) rather than the real 0..COUNT-1 range -- tapping prev on
    // the first real card (or next on the last) now glides one slot
    // further, onto the matching clone, and finishAt() (below) silently
    // corrects the landing onto the real slot once the glide completes.
    function scrollToIndex(idx) {
      const clamped = Math.max(0, Math.min(EXT_COUNT - 1, idx));
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
        finishAt(clamped);
        return;
      }
      autoScrolling = true;
      setCurrentIndex(-1);
      const startTime = performance.now();
      let rafId2;
      function step(now) {
        const frac = Math.min(1, (now - startTime) / NAV_EASE_MS);
        track.scrollLeft = start + change * easeOutCubic(frac);
        if (frac < 1) {
          rafId2 = requestAnimationFrame(step);
          autoScrollCancel = () => cancelAnimationFrame(rafId2);
        } else {
          autoScrolling = false;
          autoScrollCancel = null;
          finishAt(clamped);
        }
      }
      rafId2 = requestAnimationFrame(step);
      autoScrollCancel = () => cancelAnimationFrame(rafId2);
    }

    // Prev/next buttons (rendered on the centred card only -- see render
    // below): advance/retreat exactly one slot from wherever the carousel
    // actually is right now (read live off scrollLeft, not off React state
    // -- avoids a stale read from inside this plain DOM-event closure).
    // Closed-circle, not a dead end (fix #25): tapping next past the last
    // real card, or prev past the first, glides onto that end's clone slot
    // and finishAt() then silently continues the loop onto the matching
    // real card -- see scrollToIndex()/finishAt() above.
    navRef.current = {
      prev: () => scrollToIndex(Math.round(track.scrollLeft / PAGE_W) - 1),
      next: () => scrollToIndex(Math.round(track.scrollLeft / PAGE_W) + 1),
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (hasScrollEnd) track.addEventListener('scrollend', onScrollEnd);
    track.addEventListener('pointerdown', onPointerDown);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(suppressTimer);
      if (autoScrollCancel) autoScrollCancel();
      cancelAnimationFrame(rafId);
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
              {Array.from({ length: EXT_COUNT }, (_, p) => p).map((p) => {
                const i = realIndexOf(p); // real card index this strip position renders -- see realIndexOf()
                const Art = CARD_ART[i];
                const label = LABELS[i];
                const href = `/proyectos#${i}`;
                const gradient = GRADIENTS[i];
                const isCurrent = i === currentIndex;
                const card = { href, gradient };
                return (
                  <div
                    className="card-slot"
                    style={{ '--i': p }}
                    ref={(el) => {
                      cardSlotRefs.current[p] = el;
                    }}
                    key={p}
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
                        // instead and silently ignore this prop. `uid` (fix
                        // #27) only matters to Mapfre/UndpCard, the two cards
                        // fix #25's cloning mounts twice at once -- see
                        // lib/svgNamespace.js. Passed unconditionally (the
                        // strip position `p` is already unique per slot) so
                        // nothing here needs to know which two cards happen
                        // to be first/last; every other card ignores it.
                        <Art active={isCurrent} uid={String(p)} />
                      ) : (
                        <>
                          <div className="card-art" style={{ background: gradient }} aria-hidden="true" />
                          <span className="card-tag">{label}</span>
                        </>
                      )}
                    </Link>
                    {/* Discover only, as of fix #31 -- the prev/next arrows
                        used to render here too (hidden on every slot but
                        the current one via a CSS opacity rule keyed to
                        `.is-current`), which is what made them read as
                        disappearing/shifting on every advance: see this
                        file's header comment and `.car2-nav` below, which
                        replaces them with one persistent pair outside the
                        scrolling/transformed strip entirely. Discover
                        itself deliberately keeps rendering per-slot,
                        unchanged -- letting a tap reach a neighbouring,
                        partially-visible card's own project directly is a
                        real feature, not something Victoria has asked to
                        change. */}
                    <div className="card-cta">
                      <Link
                        className="btn-primary btn-discover"
                        href={href}
                        draggable="false"
                        onClick={(e) => handleCardOpen(e, card)}
                      >
                        Discover
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Fix #31: a single, persistent prev/next pair, outside
                `.car2-track` entirely -- never inside anything the arc
                transform (applyArc(), above) touches, and never opacity-
                toggled by `.is-current`. Previously these were duplicated
                once per `.card-slot` and hidden/shown by CSS, which is what
                made them read as disappearing (every swipe/tap sets
                currentIndex to -1 for the scroll's whole duration, so no
                slot's copy was "current" meanwhile) and shifting (each
                copy's on-screen spot only matched up to whatever that
                slot's own live transform happened to be). One fixed DOM
                node pair in one fixed CSS position (see home-mobile.css's
                `.car2-nav`) has nothing left in it that could do either. */}
            <div className="car2-nav">
              <button
                type="button"
                className="btn-tertiary btn-nav-arrow"
                aria-label="Previous project"
                onClick={() => navRef.current.prev()}
              >
                {/* Same arrow-glyph-in-Manrope treatment as the "See next
                    case" button at the bottom of each project. */}
                <span aria-hidden="true">&larr;</span>
              </button>
              <button
                type="button"
                className="btn-tertiary btn-nav-arrow"
                aria-label="Next project"
                onClick={() => navRef.current.next()}
              >
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        </section>
      </main>
      </div>
      <ChatPanel />
    </VictorAIChatProvider>
  );
}
