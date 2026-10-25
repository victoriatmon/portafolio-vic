import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Victoria Talamantes',
  description:
    'Portfolio of Victoria Talamantes, Lead Product Designer specialized in fintech and insurtech in Mexico and LATAM.',
};

// Sets the `arrive` class on <html> -- read by Proyectos' own
// html.arrive CSS (proyectos.css/proyectos-mobile.css) to play its
// card-open "arrival" animation -- synchronously, before the browser's
// first paint of <body>. This has to happen here, in a `beforeInteractive`
// script, and not inside ProyectosDesktop.js/ProyectosMobile.js's own
// render (which is where it used to live): by the time ANY React code
// runs, even during hydration's very first render pass, the browser has
// already painted the server-rendered HTML once (the server can't know
// this is a card-open arrival -- that's only ever recorded in
// sessionStorage, which doesn't exist server-side). Adding the class from
// inside a component after that point doesn't prevent a first paint, it
// retroactively hides content that's already on screen and fades it back
// in -- which is exactly the flash Victoria reported: the Proyectos page
// appears (server HTML, no .arrive styling), goes black for an instant
// (html.arrive's animations hold their target at opacity:0 during their
// `animation-fill-mode:both` delay, the moment this script's effect
// becomes visible), then fades back in. Same root cause as the
// is-pending-enter/useLayoutEffect fix below Proyectos' and About's own
// nav-transition arrival, just one layer earlier: there, React's own
// commit could still beat the paint (useLayoutEffect runs before the
// hydrated tree paints); here, nothing inside React runs early enough, so
// it has to be a blocking script in <head> instead -- mirrors the
// no-flash dark-mode script pattern (e.g. next-themes).
const ARRIVE_FLAG_SCRIPT = `
(function () {
  try {
    var xt = window.sessionStorage.getItem('xt') || '';
    window.sessionStorage.removeItem('xt');
    if (xt && Date.now() - parseInt(xt, 10) < 8000) {
      document.documentElement.classList.add('arrive');
    }
  } catch (err) {
    /* ignore */
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* `strategy="beforeInteractive"` is what makes this actually
            blocking -- Next.js hoists it into the document <head> and runs
            it before hydration regardless of where it's authored in this
            tree, so it doesn't need (and shouldn't fight) the Metadata
            API's own <head>. */}
        <Script id="arrive-flag" strategy="beforeInteractive">
          {ARRIVE_FLAG_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
