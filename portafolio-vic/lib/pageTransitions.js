'use client';

// Cross-page transitions: a blue line sweeps under the navbar, the leaving
// page's content fades/slides out, the arriving page fades/slides in.
// Ported from Main.dc.html's `XT` module (grep "Page transitions: blue
// sweep under the navbar" there) -- the piece that was missing from the
// Next.js port entirely (unlike the card-open transition in
// cardTransition.js, which WAS ported). Same two constraints drove the
// shape of this port:
//
// 1. Navigation between the 3 top-level routes (/, /proyectos, /about) is a
//    real browser navigation here (hardNavigate), not client routing, for
//    the same reasons as cardTransition.js's hardNavigate (server
//    re-evaluates isMobileUserAgent, each page's own mount-time setup
//    expects a fresh load). So "leave" plays on the page you're leaving,
//    then a real navigation happens, then "enter" plays on the page you
//    land on once it mounts -- coordinated via a sessionStorage flag,
//    exactly like cardTransition.js's markArrival/xt flag for Proyectos'
//    arrive fade.
// 2. Simplified vs. the original: the original staggers a hand-picked list
//    of CSS selectors per page (card slots, hero text, project pills, ...)
//    each with their own fan-out delay and a text-only blur. Six page
//    variants (Home/About/Proyectos x Desktop/Mobile) don't share markup,
//    so re-deriving that per-page unit list here would be a much larger
//    port for a detail nobody asked to see preserved stroke-for-stroke.
//    This animates [data-page] as a single block (fade + slight vertical
//    drift, no blur, no stagger) -- same leave/enter choreography and the
//    one explicitly-missing, most visible piece (the blue line) ported
//    verbatim, without the six bespoke selector lists.

const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IO = 'cubic-bezier(0.77, 0, 0.18, 1)';
const FLAG_KEY = 'xtn';
const FLAG_MAX_AGE = 8000;

const st = { busy: false };

function reduced() {
  return !!(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function makeLine() {
  document.querySelectorAll('.xt-line').forEach((n) => n.remove());
  const nav = document.querySelector('[data-nav]');
  const top = nav ? nav.getBoundingClientRect().bottom : 64;
  const d = document.createElement('div');
  d.className = 'xt-line';
  d.setAttribute('aria-hidden', 'true');
  d.style.cssText =
    'position:fixed;left:0;right:0;top:' + (top - 1) + 'px;height:2px;background:#0066FF;' +
    'z-index:2147483001;pointer-events:none;transform:scaleX(0);transform-origin:0 50%;' +
    'box-shadow:0 0 14px rgba(0,102,255,0.7);';
  document.body.appendChild(d);
  return d;
}

// Known internal routes this transition applies to -- the 3 top-level
// sections. A project detail anchor (/proyectos#2) counts as the same
// route as /proyectos. Anything else (external links, mailto:, the
// resume PDF, the home card links already handled by their own
// playCardOpenTransition) is left alone.
function routeOf(href) {
  try {
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return null;
    if (u.pathname === '/' || u.pathname === '/proyectos' || u.pathname === '/about') return u.pathname;
    return null;
  } catch (err) {
    return null;
  }
}

function playLeave(onDone) {
  const ln = makeLine();
  const page = document.querySelector('[data-page]');
  const anims = [ln.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    duration: 640,
    easing: EASE_IO,
    fill: 'forwards',
  })];
  if (page) {
    anims.push(page.animate(
      [
        { opacity: 1, translate: '0 0' },
        { opacity: 0, translate: '0 -24px' },
      ],
      { duration: 420, easing: EASE_IN, fill: 'forwards' }
    ));
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone();
  };
  Promise.race([
    Promise.all(anims.map((a) => a.finished)),
    new Promise((r) => setTimeout(r, 760)),
  ]).then(finish, finish);
}

// Attach once (per page) to intercept clicks on internal nav links and
// play the leave animation before navigating. Returns a cleanup function.
export function attachNavTransition() {
  function onClick(e) {
    if (st.busy || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const route = routeOf(href);
    if (!route || route === window.location.pathname) return;
    e.preventDefault();
    if (reduced()) {
      window.location.href = href;
      return;
    }
    st.busy = true;
    try {
      window.sessionStorage.setItem(FLAG_KEY, JSON.stringify({ path: route, t: Date.now() }));
      // Proyectos already has its own richer per-element entrance (the
      // `arrive` CSS hooks in proyectos.css), currently only triggered by
      // the home card-open flow via cardTransition.js's markArrival. Set
      // that same flag here too so navbar navigation into Proyectos gets
      // that existing flourish as well, instead of a second, plainer
      // whole-page fade competing with it -- this page's own enter effect
      // only plays the blue line (see ProyectosDesktop.js/ProyectosMobile.js).
      if (route === '/proyectos') window.sessionStorage.setItem('xt', String(Date.now()));
    } catch (err) {
      /* ignore */
    }
    playLeave(() => {
      window.location.href = href;
    });
  }
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

// Call once on mount of each page. If the sessionStorage flag says this
// page was just reached via attachNavTransition's leave, plays the
// matching enter animation (blue line shrinking away, content fading up
// into place) and returns true -- callers can use that to pre-hide
// [data-page] via a className on first render so there's no flash of
// fully-visible content before this runs (see HomeDesktop.js's arriveRef
// pattern in ProyectosDesktop.js for the same trick).
export function consumeEnterFlag() {
  if (typeof window === 'undefined') return false;
  let flag = null;
  try {
    flag = JSON.parse(window.sessionStorage.getItem(FLAG_KEY) || 'null');
    window.sessionStorage.removeItem(FLAG_KEY);
  } catch (err) {
    /* ignore */
  }
  return !!(flag && flag.path === window.location.pathname && Date.now() - flag.t < FLAG_MAX_AGE);
}

// The blue line sweeping away under the navbar -- wired into every page,
// since this is the one piece that's always worth it regardless of
// whatever else that page already does to reveal its own content.
export function playEnterLine() {
  if (reduced()) return;
  const ln = makeLine();
  ln.style.transform = 'scaleX(1)';
  const la = ln.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
    duration: 760,
    delay: 60,
    easing: EASE_IO,
    fill: 'both',
  });
  la.onfinish = () => ln.remove();
}

// The [data-page] fade/drift-in -- only worth wiring on a page that has no
// reveal of its own (About). Home already fades its hero/carousel in on
// every load (see HomeDesktop.js's "entered" state) and Proyectos already
// has its own per-element `arrive` fade for the card-open path (see
// cardTransition.js/markArrival); doubling either up with this generic
// whole-page fade would just be two reveals stacked on top of each other.
export function playEnterContentFade() {
  if (reduced()) return;
  const page = document.querySelector('[data-page]');
  if (!page) return;
  page.animate(
    [
      { opacity: 0, translate: '0 24px' },
      { opacity: 1, translate: '0 0' },
    ],
    { duration: 620, easing: EASE_OUT, fill: 'backwards' }
  );
}
