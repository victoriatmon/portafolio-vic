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
// NOTE (next conversation, fix #33): the arc described in this whole
// history section -- and every fix below that tunes it (#23/#27/#28/#29) --
// was ultimately REMOVED entirely. Kept here for history/context (and so a
// future session doesn't re-add it without reading why first); see the
// "Fix #33/#34" section below, right after fix #32, for the removal itself
// and the reasoning.
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
// ===== Fix #33/#34 (2026-10-28, next conversation, from Victoria's video of
// #29-32 live) =====
// Victoria sent a screen recording of the #29-32 preview and reported the
// carousel now read as "más como una línea recta" (more like a straight
// line) instead of curved, and that both swipe- and arrow-driven motion
// still "se ve muy raro" (looks weird) to her -- despite #29/#30 being
// specifically aimed at calming that same motion down. She asked directly
// why this kept being so complicated for what should be "una experiencia
// normal de un carrusel" (a normal carousel experience), and described her
// actual target: a centred card, the previous card visibly leaving on the
// left, the next card peeking on the right, swipe OR the arrows advancing
// one card at a time -- a plain flat carousel, no curve requirement stated
// at all. She also asked whether removing Discover from the non-centred
// cards would help.
//
// Root cause, diagnosed this round rather than tuned around again: the
// rotate()+translateY() arc is ONE transform trying to satisfy two
// requests that are in direct tension through that same mechanism. The
// translateY term is what reads as "curved" when a card is at rest (fix
// #23's original ask) -- but that exact term is also what reads as
// "weight"/"falling" the instant it's animated continuously via the fix
// #24 rAF loop during a swipe or arrow glide (fix #28/#29's complaints).
// Turning translateY down (DROP_SCALE, fix #29) to kill the falling feeling
// necessarily flattens the curve too, since the rotation component alone
// (~5deg at d=1, even before DROP_SCALE) is too subtle on its own to read
// as "curved" -- which is exactly what Victoria's video showed. This
// tension, not a wrong constant, is why fix #23 -> #28 -> #29 kept
// trading one complaint for the other instead of converging: no single
// RC/DROP_SCALE/STEP value satisfies both "curved at rest" and "doesn't
// feel heavy in motion" through one rotate+translateY transform.
// Recommended (and, via AskUserQuestion, Victoria-approved) resolution:
// remove the arc transform entirely rather than attempt a fourth tuning
// round. This reverts the carousel's visual shape to the flat, scroll-
// snap-only layout fix #20 already proved rock-solid (zero bugs across
// every round since) -- which also happens to be a literal description of
// Victoria's own stated target UX above. Concretely: applyArc(), the
// tick()/rafId loop, and the RC/DROP_SCALE/STEP/ARC_HIDE_AT constants are
// gone; `.card-slot` is never written a `transform` by JS any more, so
// cards simply sit at their native flex-row position, left-to-right, same
// as any other horizontally-paged mobile UI. The now-unnecessary per-slot
// `visibility`/`zIndex` writes applyArc() used to also do (to hide cards
// beyond ARC_HIDE_AT and layer the centred one on top, both needed only
// because rotated cards could visually overlap) are gone too -- with no
// rotation, cards never overlap, and `.car2-track`'s own
// `overflow-x: auto` already clips anything outside the viewport, so a
// neighbour simply "peeks" in from each side by construction (exactly the
// look Victoria asked for), no JS visibility logic required. Everything
// else from the #20/#24(partial)/#25/#27/#30/#31/#32 era is UNCHANGED: the
// wraparound clone mechanism (realIndexOf()/EXT_COUNT/finishAt()'s
// correction), the SVG id-namespacing (lib/svgNamespace.js), the
// scrollToIndex() easeOutCubic glide for the prev/next buttons (fix #30 --
// nothing about that easing was ever about the arc, only about how the
// horizontal motion itself feels), the persistent `.car2-nav` arrows (fix
// #31), and the 8px spacing (fix #32).
//
// #34 -- Discover hidden on non-centred cards: approved in the same
// AskUserQuestion exchange. Previously every visible slot (including
// partially-visible neighbours) rendered its own Discover button --
// reasonable when neighbours sat mostly out of reach under the arc, but
// now that neighbours sit flat and clearly visible at the sides, two
// visible Discover buttons either side of the centred one read as
// clutter. Discover now renders only when a slot `isCurrent` (see the
// render below) -- the whole card remains tappable via `.card-face`'s own
// Link/handleCardOpen regardless of centred state, so a neighbouring card
// is still one tap away from its project, just without its own visible
// button. **Superseded by fix #35 below, same day -- Discover is gone
// entirely now, not just hidden on neighbours.**
//
// ===== Fix #35/#36/#37 (2026-10-28, next conversation, from Victoria
// re-testing the flat/#33 carousel) =====
// Victoria confirmed the flat carousel read right, then asked for three
// more changes in the same message: drop Discover entirely (not just hide
// it on neighbours, fix #34's half-measure); make the cards bigger now
// that Discover's old footprint is free; and make the prev/next BUTTON
// glide feel as smooth as a native swipe, which she said still felt
// "abrupta" by comparison.
//
// #35 -- Discover removed entirely: the whole `.card-cta`/Discover <Link>
// block is gone from the render below, on every slot, not just non-
// current ones. The card's own `.card-face` Link (handleCardOpen, same as
// always) is the only way to open a project now -- true on mobile already
// since fix #20 (tapping anywhere on a centred OR neighbouring card has
// always opened it), so removing the redundant explicit button loses no
// functionality, only the visual affordance that pointed at it. `.car2-
// nav` (the arrows, fix #31) is unaffected -- it never depended on
// `.card-cta` for anything except its own hardcoded `top` offset
// (home-mobile.css), which this fix updates now that there's no Discover
// box to measure past.
//
// #36 -- cards enlarged: with Discover's box + both its gaps (26px card-
// to-Discover, ~36px Discover's own layout height, 12px Discover-to-
// arrows) gone, CARD_W/CARD_H grew from 216x288 to 252x336 (same 3:4
// ratio) -- see home-mobile.css's matching `.card-slot`/`.car2-track`
// comment for the exact vertical accounting. `PAGE_W` (derived from
// CARD_W+CARD_GAP below) grows with it, same as any other CARD_W change
// (fix #26) -- nothing else about the scroll-snap math changes shape, just
// scale.
//
// #37 -- arrow glide now native smooth-scroll, not a hand-rolled tween:
// `scrollToIndex()` used to animate `track.scrollLeft` itself via a
// `requestAnimationFrame` loop with a hand-picked easing curve
// (`easeOutCubic`/320ms, fix #30) -- necessary back when mobile also had
// the arc transform (fix #23-#29), since every `scrollLeft` write needed
// to be on a frame-by-frame basis anyway to keep that transform in sync.
// Fix #33 already removed the arc, so that constraint is gone -- and a
// hand-rolled tween can only ever APPROXIMATE the native swipe's own
// momentum/deceleration curve, never match it exactly, which is exactly
// what Victoria flagged ("hay que hacerla más smooth para que se vea igual
// a como si estuviera haciendo swipe"). The most direct way to GUARANTEE
// the arrow glide feels identical to a swipe is to have it use the exact
// same mechanism: `scrollToIndex()` now calls the track's own
// `scrollTo({ left, behavior: 'smooth' })` instead of writing `scrollLeft`
// by hand -- the browser's native smooth-scroll animates it with the same
// physics/easing it already uses for momentum scrolling and programmatic
// smooth-scrolls generally, so "arrow glide" and "swipe" are now, by
// construction, the same code path doing the scrolling, just triggered
// two different ways. `NAV_EASE_MS`/`easeOutCubic` (fix #30) are gone --
// nothing left to tune by hand. `autoScrollCancel`/`autoScrolling` and the
// rAF-cancellation plumbing they existed for are gone too: native smooth-
// scroll doesn't need an explicit cancel handle the way a hand-rolled tween
// did -- calling `scrollTo()` again (a quick double-tap on an arrow) or a
// real touch starting mid-glide both simply retarget/interrupt the
// browser's own in-flight smooth-scroll, standard behaviour, no JS needed
// to arbitrate between the two. `onPointerDown`'s old explicit cancel call
// is gone for the same reason -- a real touch already wins over a
// programmatic smooth-scroll without any help.
//
// What's left for JS to do (updated, post #33-#37):
//   1. Know which REAL card is centred (0..COUNT-1, never a clone's
//      position), to drive `.is-current` -- done by reading the track's
//      scrollLeft once scrolling goes idle and mapping it through
//      realIndexOf() (see finishAt()/settle() below).
//   2. Drive a prev/next BUTTON tap's glide (scrollToIndex below) -- native
//      swipe/wheel scrolling never touches this at all. As of fix #37 this
//      is a thin wrapper over the track's own native `scrollTo({behavior:
//      'smooth'})`, not a hand-rolled per-frame tween.
//   3. Silently correct the scroll position back onto a real slot whenever
//      native scrolling (or a button glide) settles on one of the two
//      cloned end slots (fix #25) -- see finishAt() below.
// (The old #3 here -- continuously recomputing/writing an arc transform at
// the display's own frame rate, fix #24 -- is gone along with the arc
// itself, fix #33.)
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
// (render, the wraparound correction in finishAt): the two clone
// positions simply map to the same real index as their real counterpart.
function realIndexOf(p) {
  return ((p - 1) % COUNT + COUNT) % COUNT;
}

// On-screen card size, px -- no extra scale transform any more (the old
// arc system rendered a 300x400 box through a 0.85 CSS scale; this sizes
// directly at the same effective on-screen size instead). MUST stay in
// sync with home-mobile.css's `.card-slot`/`.car2-track` rules, which
// hardcode these same numbers (cross-referenced in a comment there too).
// Fix #26: shrunk from 255x340 to 216x288 (same 3:4 ratio) to fix a
// "cramped" complaint. Fix #36 (2026-10-28, next conversation): grown
// again, to 252x336 (still 3:4) -- fix #35's removal of Discover freed up
// the vertical room Discover + its two gaps used to occupy, and Victoria
// asked for that freed space to go into making the cards themselves
// bigger rather than just sitting empty. See home-mobile.css's matching
// `.card-slot`/`.car2-track`/`.car2-nav` comment for the exact vertical
// accounting of where the freed space went.
const CARD_W = 252;
const CARD_GAP = 20;
// Centre-to-centre scroll distance between adjacent cards. Since every
// card is the same width with a fixed gap, and the track's side padding is
// exactly (viewport - CARD_W)/2 (see home-mobile.css), each card's
// scroll-snap position lands at exactly `index * PAGE_W` -- no drift, no
// per-viewport-width special-casing needed to find "which card is this
// scrollLeft pointing at".
const PAGE_W = CARD_W + CARD_GAP;

// Arc visual (rotate()/translateY() layered on top of the native scroll
// position, same shape of math as HomeDesktop.js's own RC/STEP) used to be
// defined right here -- RC/DROP_SCALE/STEP/ARC_HIDE_AT, tuned across fix
// #23/#27/#28/#29. Removed entirely by fix #33 (2026-10-28, next
// conversation) -- see this file's header comment, "Fix #33/#34" section,
// for the full why (the same translateY term that reads as "curved" at
// rest also reads as "falling" in motion, and no constant satisfies both).
// Do not re-add this without re-reading that section first.

// The prev/next BUTTON glide used to be driven by a hand-rolled
// requestAnimationFrame tween right here (NAV_EASE_MS/easeOutCubic, fix
// #30) -- necessary while the arc transform (fix #23-#29) existed, since
// every scrollLeft write needed to happen frame-by-frame to keep that
// transform in sync regardless of what drove the scroll. Fix #33 removed
// the arc, so that constraint is gone; fix #37 (2026-10-28, next
// conversation) replaced the hand-rolled tween with the track's own native
// `scrollTo({behavior:'smooth'})` instead -- see scrollToIndex() below and
// this file's header comment, "Fix #35/#36/#37" section, for the full why
// (Victoria asked the arrow glide to feel identical to a swipe, and the
// most direct way to guarantee that is to have both use the exact same
// underlying scroll mechanism). No easing constant left to tune here --
// the browser owns that now.

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

    // Fix #33 removed the arc transform entirely -- this effect used to
    // also run a per-frame rAF loop (fix #24) writing rotate()/translateY()
    // to every `.card-slot` here. No replacement is needed: with no
    // transform, cards simply sit at their native flex-row position, so
    // there's nothing left to continuously recompute (see this file's
    // header comment, "Fix #33/#34" section, for the full why).

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
    // live: 'scrollend' turned out not to fire reliably for a plain JS
    // scrollLeft write in this environment (confirmed on the instant
    // correction jump right below). A short suppress window after every
    // settle absorbs whatever stray trailing 'scroll'/'scrollend' noise
    // that non-gesture write provokes. (Fix #37, 2026-10-28, next
    // conversation: this used to also cover scrollToIndex()'s own
    // hand-rolled rAF tween, which wrote scrollLeft directly once per frame
    // and had the exact same unreliable-scrollend problem -- that tween is
    // gone now, replaced by the track's native scrollTo({behavior:
    // 'smooth'}), which the browser recognises as one continuous scroll and
    // so is expected to behave like any other native scroll here, same as
    // a real swipe -- see scrollToIndex() below. The hasScrollEnd idle-timer
    // fallback a few lines down remains the safety net either way.)
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
        // Fix #53 (2026-10-29): fix #49 (overscroll-behavior-x: none) killed
        // the iOS rubber-band bounce that was re-arming settle()'s 120ms
        // timer, but Victoria's new video shows the same symptom (Phantom
        // not appearing beside Mapfre for "unos segundos" right after this
        // exact wraparound jump) still happening. The 120ms debounce path
        // is probably moot on her phone anyway -- modern Safari fires a
        // real 'scrollend' (hasScrollEnd above), so onScrollEnd() calls
        // settle()/finishAt() on the very next tick, not after any
        // artificial wait. That points away from a JS-timing delay and
        // toward a WebKit *paint* delay instead -- same bug family as fix
        // #39/#40/#45/#51 (an ancestor/sibling change WebKit doesn't
        // promptly repaint), but here the "descendant that doesn't get
        // repainted" is Phantom's whole `.card-slot` (position 2), which
        // sat scrolled far out of view for the entire time the user was on
        // positions 3-7 and has had no reason to be composited/painted
        // since. An instant, non-gesture `scrollLeft` write like this one
        // doesn't give WebKit the usual "about to scroll into view" signal
        // a real drag/flick gesture would, so the now-adjacent slot can sit
        // unpainted until something else forces it. Force that repaint
        // explicitly instead of waiting for WebKit to get to it on its own:
        // a synchronous reflow read right after the jump, then the same
        // sub-perceptible opacity nudge used for Phantom/AXA's photo glitch
        // (fix #51) on the track itself once scroll-snap is restored next
        // frame, which recomposites the whole visible strip -- Phantom's
        // slot included.
        //
        // Fix #53 didn't resolve it either (Victoria's next round still saw
        // it). Fix #57 (2026-10-29, next round, see PhantomCard.js's fix
        // #55 comment for the fuller write-up): re-read "unos segundos" --
        // SECONDS, not the tens-of-milliseconds a paint/compositing bug
        // would cost -- and reconsidered away from WebKit paint staleness
        // toward image decode scheduling instead. Phantom's photo tiles
        // (PhantomCard.js) now carry `decoding="sync"` so the browser
        // decodes them immediately rather than deferring a scrolled-out-of-
        // view raster image's decode until it's about to be shown, which a
        // multi-second, rather than multi-frame, delay fits much better.
        // This reflow/opacity nudge is left in place as a secondary
        // measure. **Still not verified on an actual iPhone.**
        void track.getBoundingClientRect();
        requestAnimationFrame(() => {
          track.style.scrollSnapType = '';
          track.style.opacity = '0.9999';
          void track.getBoundingClientRect();
          track.style.opacity = '';
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
      setCurrentIndex((prev) => (prev === -1 ? prev : -1));
      if (!hasScrollEnd) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(settle, 120);
      }
    }
    function onScrollEnd() {
      if (suppressSettleRef.current) return; // same reasoning as onScroll above
      clearTimeout(scrollTimer);
      settle();
    }
    // Fix #37 (2026-10-28, next conversation) removed the old onPointerDown
    // handler that used to live here: it existed only to cancel an
    // in-flight hand-rolled rAF tween (scrollToIndex()'s old mechanism, fix
    // #30) the instant a real touch/drag took over, so the two never fought
    // over scrollLeft in the same frame. Now that scrollToIndex() uses the
    // track's own native scrollTo({behavior:'smooth'}) instead (see below),
    // there's nothing left to cancel by hand -- a real touch/drag starting
    // on the track already interrupts any in-flight native smooth-scroll on
    // its own, standard browser behaviour, no JS needed.

    // Animates the track to the target extended-strip position's snap
    // point. Used by the prev/next buttons only -- see this file's header
    // comment for why native swipe/wheel never run this. Fix #37
    // (2026-10-28, next conversation): this used to drive its own
    // requestAnimationFrame tween with a hand-picked easing curve
    // (NAV_EASE_MS/easeOutCubic, fix #30) -- necessary while the arc
    // transform (fix #23-#29) existed, since every scrollLeft write needed
    // to happen frame-by-frame to stay in sync with it regardless of what
    // drove the scroll. Fix #33 removed that constraint along with the arc
    // itself, and Victoria separately asked the arrow glide to feel
    // identical to a swipe ("que se vea igual a como si estuviera haciendo
    // swipe") -- a hand-rolled tween can only ever approximate the native
    // swipe's own momentum/deceleration curve, never match it exactly, so
    // this now calls the track's own native scrollTo({behavior:'smooth'})
    // instead: the browser animates it with the SAME physics/easing it
    // already uses for a real swipe's momentum, guaranteeing an identical
    // feel by construction rather than approximating it by trial and error.
    // onScroll/onScrollEnd (above) handle the rest exactly as they would
    // for a real swipe -- no special-casing needed here any more: there's
    // no separate "programmatic vs. real scroll" state to track any more
    // (the old autoScrolling/autoScrollCancel are gone), and a quick
    // double-tap on an arrow just redirects the browser's own in-flight
    // smooth-scroll to the new target, standard behaviour, no cancellation
    // code required. Clamped to the FULL extended range (0..EXT_COUNT-1,
    // fix #25) rather than the real 0..COUNT-1 range -- tapping prev on
    // the first real card (or next on the last) now glides one slot
    // further, onto the matching clone, and finishAt() (below) silently
    // corrects the landing onto the real slot once the glide completes.
    function scrollToIndex(idx) {
      const clamped = Math.max(0, Math.min(EXT_COUNT - 1, idx));
      const target = clamped * PAGE_W;
      if (Math.abs(target - track.scrollLeft) < 1 || prefersReducedMotion()) {
        track.scrollLeft = target;
        finishAt(clamped);
        return;
      }
      track.scrollTo({ left: target, behavior: 'smooth' });
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

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(suppressTimer);
      track.removeEventListener('scroll', onScroll);
      if (hasScrollEnd) track.removeEventListener('scrollend', onScrollEnd);
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
                    {/* Discover is gone entirely as of fix #35 (2026-10-28,
                        next conversation) -- used to render per-slot, then
                        (fix #34) only on the centred slot. Victoria asked
                        for it to be dropped altogether now that the whole
                        card has always been tappable to open its project
                        (`.card-face`'s own Link/handleCardOpen, above,
                        since fix #20 -- true for centred AND neighbouring
                        cards alike), so the explicit button was a redundant
                        affordance. The vertical room it used to occupy
                        (card-to-Discover gap + Discover's own box + gap to
                        the arrows) went into making the card itself bigger
                        instead -- see fix #36/CARD_W/CARD_H below. */}
                  </div>
                );
              })}
            </div>
            {/* Fix #31: a single, persistent prev/next pair, outside
                `.car2-track` entirely -- never inside anything per-slot
                (at the time, the arc transform; fix #33 later removed that
                transform too, but the structural reasoning for keeping the
                arrows OUT of the per-slot strip still holds for any future
                per-slot effect), and never opacity-toggled by `.is-current`.
                Previously these were duplicated once per `.card-slot` and
                hidden/shown by CSS, which is what made them read as
                disappearing (every swipe/tap sets currentIndex to -1 for
                the scroll's whole duration, so no slot's copy was "current"
                meanwhile) and shifting (each copy's on-screen spot only
                matched up to whatever that slot's own live transform
                happened to be). One fixed DOM node pair in one fixed CSS
                position (see home-mobile.css's `.car2-nav`) has nothing
                left in it that could do either. */}
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
