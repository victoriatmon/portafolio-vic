// Fix #27 (2026-10-28): the mobile home carousel's "closed circle" loop
// (fix #25, see HomeMobile.js's header comment) mounts the FIRST and LAST
// real cards TWICE at once -- once at their real strip position, once more
// as the cloned slot at the opposite end (see realIndexOf() in
// HomeMobile.js). Mapfre and UndpCard's inline SVGs (ported verbatim from
// Figma, see those files' own header comments) hardcode plain numeric
// `id="clip0_80_51"`-style ids for every clip-path/pattern/mask/filter they
// define -- fine for a single instance, but with TWO instances of the same
// markup live in the DOM at once, those ids collide. `url(#clip0_80_51)`
// then has two candidate targets with the same id, and which one a given
// engine actually resolves it to is inconsistent -- confirmed live (see
// contexto-portafolio-vercel.md's fix #27 entry) as the cause of Victoria's
// "next card renders solid black, only the Discover button shows" report:
// the clone instance's raster-photo clip/pattern was resolving to -- or
// simply failing to resolve -- the WRONG (or no) definition.
//
// Fix: give each duplicated card instance a small, cheap `uid` suffix
// (HomeMobile.js passes the strip position) and rewrite just the ids this
// card privately defines-and-references for its own clipping/texturing, so
// two instances never share an id. Deliberately NOT a general-purpose DOM
// sanitizer -- it only touches exact, known id strings the calling card
// passes in, leaving everything else (classes, the semantic hand-named ids
// a few cards also use for OTHER reasons, see below) untouched.
//
// NOT every id in a card's markup goes through this: UndpCard.js's glitch
// effect ALSO defines ids like `udRGB1`/`udBand0` that are either (a)
// referenced from the shared, unscoped `@keyframes udStage` rule in
// home.css (`filter:url(#udRGB1)` etc -- renaming the SVG's copy without
// also rewriting that external, non-per-instance CSS would just break the
// filter lookup for BOTH instances) or (b) purely cosmetic duplicates where
// both instances render pixel-identical definitions anyway, so resolving to
// "the wrong one" is visually a no-op. Only UndpCard.js's own list (see
// that file) passes here -- the numeric Figma-style clip/pattern/mask/
// filter ids actually responsible for the reported bug.
export function namespaceSvgIds(svg, ids, suffix) {
  if (!suffix) return svg; // no suffix (e.g. HomeDesktop.js, which never duplicates a card) -> untouched, zero risk there
  let out = svg;
  for (const id of ids) {
    // `id="X"` -- the definition itself (<clipPath id="X">, <pattern id="X">, ...).
    out = out.split(`id="${id}"`).join(`id="${id}${suffix}"`);
    // `#X"` -- a plain fragment reference, e.g. `href="#X"`.
    out = out.split(`#${id}"`).join(`#${id}${suffix}"`);
    // `#X)` -- a `url(#X)` reference, e.g. `fill="url(#X)"`, `clip-path="url(#X)"`.
    out = out.split(`#${id})`).join(`#${id}${suffix})`);
  }
  return out;
}
