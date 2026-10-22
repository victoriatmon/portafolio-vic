// Server-side desktop/mobile decision. Each consolidated route (/, /about,
// /proyectos) calls this from its page.js (a Server Component) using the
// request's own User-Agent header via next/headers' headers() -- no client
// redirect, no separate URL for the mobile version, no layout flash.
//
// This mirrors what the old per-screen width check in the .dc.html files did
// (isPhone = width < 768 && pointer: coarse), just moved server-side and
// based on User-Agent instead of viewport width, since the server never sees
// the viewport. It only decides which component tree renders; the page is
// still fully responsive CSS after that.
const MOBILE_UA = /iphone|ipod|android.*mobile|windows phone|blackberry|bb10|iemobile|opera mini/i;

export function isMobileUserAgent(userAgent) {
  if (!userAgent) return false;
  return MOBILE_UA.test(userAgent);
}
