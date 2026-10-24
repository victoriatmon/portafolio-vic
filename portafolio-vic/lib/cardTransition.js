'use client';

// Replicates Main.dc.html / MainMobile.dc.html's _xOpen/_xGoTo: the clicked
// project card visually expands into a full-screen (mobile) or centered
// (desktop) overlay before navigating to /proyectos, so the card reads as
// "becoming" the open project instead of the page just cutting to a new
// route. This was dropped during the original Next.js port (see the file
// header notes in HomeDesktop.js/HomeMobile.js) because the original relied
// on the old multi static-HTML-file architecture (a real <a> + .click(),
// plus BroadcastChannel/sessionStorage to sync the desktop/mobile duplicate
// tabs of the "same" page). Ported here as a plain DOM/WAAPI helper that
// still ends with a real top-level navigation -- not next/link's client
// router -- which is what ProyectosDesktop.js/ProyectosMobile.js's existing
// sessionStorage('xt')-driven "arrive" fade-in has been waiting on: it reads
// that flag once, on mount, assuming a fresh page load.
//
// Simplifications vs the original: only the card/Discover click opens this
// way (the navbar's "PROJECTS" link, which the original also special-cased
// by first re-centering the carousel, stays a plain nav link here).
//
// One of the cards (Mapfre) DOES carry inline SVG with element `id`s (an
// alpha mask + clipPaths, e.g. `id="m"`), referenced locally via
// `mask="url(#m)"`/`clip-path="url(#...)"`. cloneNode(true) copies those
// ids verbatim, so once the clone is in the document there are two elements
// with the same id -- the original (still present, just `visibility:hidden`
// on its ancestor `slot`) and the clone's own copy. `url(#id)` references
// resolve to the FIRST matching id in document order, which is the
// original, not the clone -- so the clone's mask/clip-path silently paints
// against the wrong (and, depending on timing/hover state, not necessarily
// identical) element instead of its own. Symptom: every computed style on
// the clone looks correct (opacity, visibility, fill) but it renders as a
// solid dark box, because the alpha mask it's actually resolving to isn't
// its own. uniquifyIds() below rewrites every id in the clone (and every
// local url(#id) reference to it, in attributes and in inline style
// strings) so the clone's SVG resources always resolve to themselves.

const DURATION = 820;
const EASE = 'cubic-bezier(0.76, 0, 0.18, 1)';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rewrites every `id` inside `root` to a unique value, and rewrites every
// local `url(#id)` reference to one of those ids -- both in attributes
// (mask, clip-path, fill, filter, href/xlink:href, ...) and inside inline
// `style="..."` attribute strings -- so they keep pointing at the clone's
// own copy instead of colliding with (and silently resolving to) whatever
// element elsewhere in the document happens to share that id. Safe to call
// on a clone with no ids at all (no-op).
let uidCounter = 0;
function uniquifyIds(root) {
  const idMap = new Map();
  const withId = root.querySelectorAll('[id]');
  withId.forEach((el) => {
    const oldId = el.id;
    const newId = oldId + '-ct' + Date.now().toString(36) + (uidCounter++).toString(36);
    idMap.set(oldId, newId);
    el.id = newId;
  });
  if (idMap.size === 0) return;
  const urlRef = /url\((['"]?)#([^'")]+)\1\)/g;
  const rewriteUrl = (value) =>
    value.replace(urlRef, (m, quote, id) => (idMap.has(id) ? 'url(' + quote + '#' + idMap.get(id) + quote + ')' : m));
  const all = root.querySelectorAll('*');
  all.forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.value.indexOf('#') === -1) continue;
      if (attr.name === 'href' || attr.name === 'xlink:href') {
        const id = attr.value.startsWith('#') ? attr.value.slice(1) : null;
        if (id && idMap.has(id)) el.setAttribute(attr.name, '#' + idMap.get(id));
      } else if (attr.value.indexOf('url(') !== -1) {
        el.setAttribute(attr.name, rewriteUrl(attr.value));
      }
    }
  });
}

export function prefersReducedMotion() {
  return !!(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// mobile: the overlay grows to fill the whole viewport (ProjectsMobile is a
// full-bleed page). desktop: it grows to where Proyectos' own
// .project-card-lg.is-current sits -- 1260px wide inside the 888px-tall
// .x-stage, scaled exactly the way ProyectosDesktop scales that stage
// against the room left between the 64px navbar and 72px footer (see
// proyectos.css).
function getTarget(mobile) {
  if (mobile) {
    return { tx: 0, ty: 0, tw: window.innerWidth, th: window.innerHeight, tr: 0 };
  }
  const pScale = Math.min((window.innerHeight - 64 - 72) / 888, 1.25);
  const tw = 1260 * pScale;
  const th = 638 * pScale;
  const ty = 197 * pScale;
  const tx = (window.innerWidth - tw) / 2;
  return { tx, ty, tw, th, tr: 28 };
}

// Plays the card -> open-project zoom. Resolves once it's time to navigate
// (animation finished, or a safety timeout fired) -- never rejects, so a
// caller can always `await` it and then navigate, same as the original's
// try/catch-everything-then-navigate-anyway.
export function playCardOpenTransition({ slot, mobile }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const face = slot.querySelector('.card-face');
      if (!face) {
        finish();
        return;
      }
      const mx = new DOMMatrixReadOnly(getComputedStyle(slot).transform);
      const sc = Math.hypot(mx.a, mx.b) || 1;
      const ang = (Math.atan2(mx.b, mx.a) * 180) / Math.PI;
      const r = slot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const W = slot.offsetWidth;
      const H = slot.offsetHeight;
      const w0 = W * sc;
      const h0 = H * sc;
      const { tx, ty, tw, th, tr } = getTarget(mobile);

      const ov = document.createElement('div');
      ov.setAttribute('aria-hidden', 'true');
      ov.style.cssText =
        'position:fixed;z-index:2147483000;overflow:hidden;pointer-events:none;transform-origin:50% 50%;' +
        'left:' + (cx - w0 / 2) + 'px;top:' + (cy - h0 / 2) + 'px;width:' + w0 + 'px;height:' + h0 + 'px;' +
        'border-radius:' + 15 * sc + 'px;transform:rotate(' + ang + 'deg);';

      const art = document.createElement('div');
      art.style.cssText =
        'position:absolute;left:50%;top:50%;width:' + W + 'px;height:' + H + 'px;transform-origin:50% 50%;' +
        'transform:translate(-50%,-50%) scale(' + sc + ');';

      const clone = face.cloneNode(true);
      uniquifyIds(clone);
      clone.removeAttribute('href');
      const cs = getComputedStyle(face);
      clone.style.transition = 'none';
      clone.style.transform = cs.transform === 'none' ? '' : cs.transform;
      clone.style.filter = cs.filter === 'none' ? '' : cs.filter;
      art.appendChild(clone);

      // This wash fades in over the clone right before navigating, so it's
      // what the user actually sees settle on the open-card animation.
      // Always the same flat #141414 regardless of viewport -- it used to
      // take a per-project `gradient` on mobile only (Home*.js's own local
      // flat-placeholder palette for `.card-art`, not the real brand color),
      // which made e.g. Mapfre flash a strong orange on mobile right before
      // the Proyectos page took over, instead of the dark, neutral look
      // desktop has always had.
      const gr = document.createElement('div');
      gr.style.cssText =
        'position:absolute;left:0;top:0;right:0;bottom:0;opacity:0;background:#141414;' +
        (mobile ? '' : 'box-sizing:border-box;border:1px solid #232323;border-radius:inherit;');

      ov.appendChild(art);
      ov.appendChild(gr);
      // Appending to document.body would drop the clone outside
      // .home-desktop-scope/.home-mobile-scope, and every bit of the card
      // art's CSS (the .mp-card/.mp-tile rules and their equivalents for
      // the other five cards) is scoped under that class -- the clone would
      // render with none of its visual styling, just an empty dark box.
      // Appending it as a direct child of that scope element instead (not
      // nested inside .stage2, which sets `contain: paint` and would clip a
      // position:fixed descendant to its own bounds) keeps the clone
      // styled while still behaving like a viewport-fixed overlay.
      const scopeRoot = slot.closest('.home-desktop-scope, .home-mobile-scope') || document.body;
      scopeRoot.appendChild(ov);
      slot.style.visibility = 'hidden';

      const cover = Math.max(tw / W, th / H);
      const page = document.querySelector('[data-page]');
      if (page) {
        Array.prototype.forEach.call(page.children, (el) => {
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease', fill: 'forwards' });
        });
      }
      const shadow = mobile ? 'none' : '0 50px 100px -20px rgba(0,0,0,0.7), 0 20px 34px rgba(0,0,0,0.5)';
      const main = ov.animate(
        [
          {
            left: cx - w0 / 2 + 'px',
            top: cy - h0 / 2 + 'px',
            width: w0 + 'px',
            height: h0 + 'px',
            borderRadius: 15 * sc + 'px',
            transform: 'rotate(' + ang + 'deg)',
            boxShadow: 'none',
          },
          {
            left: tx + 'px',
            top: ty + 'px',
            width: tw + 'px',
            height: th + 'px',
            borderRadius: tr + 'px',
            transform: 'rotate(0deg)',
            boxShadow: shadow,
          },
        ],
        { duration: DURATION, easing: EASE, fill: 'forwards' }
      );
      art.animate(
        [
          { transform: 'translate(-50%,-50%) scale(' + sc + ')' },
          { transform: 'translate(-50%,-50%) scale(' + cover + ')' },
        ],
        { duration: DURATION, easing: EASE, fill: 'forwards' }
      );
      art.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: DURATION * 0.4,
        delay: DURATION * 0.42,
        easing: 'ease',
        fill: 'both',
      });
      gr.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: DURATION * 0.4,
        delay: DURATION * 0.34,
        easing: 'ease',
        fill: 'both',
      });

      Promise.race([main.finished, wait(DURATION + 500)]).then(finish, finish);
    } catch (err) {
      finish();
    }
  });
}

// Marks this navigation as a card-opened "arrival" so Proyectos' own
// pre-existing html.arrive CSS fade-in fires once it mounts -- see
// ProyectosDesktop.js/ProyectosMobile.js's arriveRef check (it was always
// there, just never triggered because nothing wrote this flag).
export function markArrival() {
  try {
    window.sessionStorage.setItem('xt', String(Date.now()));
  } catch (err) {
    /* ignore */
  }
}

// A real top-level page load (not next/link's client router) -- matching
// the original's hidden-<a>+.click(). Needed so the server re-evaluates
// isMobileUserAgent for the new route and so Proyectos' mount-time arrive
// check (which expects a fresh page load, not a client-side swap) runs.
export function hardNavigate(url) {
  window.location.href = url;
}
