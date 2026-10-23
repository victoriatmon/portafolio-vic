'use client';

import { useEffect, useRef, useState } from 'react';
import ChatTriggerButton from '../chat/ChatTriggerButton';
import { attachNavTransition } from '@/lib/pageTransitions';
import './navbar.css';

// Shared navbar for all 3 routes. `current` picks which link gets
// aria-current="page" / is-current (matches how each .dc.html marked its
// own nav-link). `variant="mobile"` switches to the original mobile
// behavior: a hamburger button that opens a full-screen slide-down menu
// sheet, plus a sticky navbar that hides on scroll-down and reveals on
// scroll-up (or near the very top). Neither exists in the desktop variant,
// which keeps the original's plain static horizontal link row + a separate
// <Footer/> (still correct for desktop -- see HomeDesktop/AboutDesktop/
// ProyectosDesktop.js).
//
// The menu sheet's contact links (LinkedIn/Email/Resume) + credit line were
// ported from MainMobile.dc.html, where the artifact's own author moved
// them out of a page-bottom <footer> into the menu sheet itself ("moved
// here so the landing page never needs a vertical scroll to reach it").
// As of this port that change had only been made on the Home/landing file
// -- AboutMeMobile.dc.html and ProjectsMobile.dc.html still had the old
// simple 3-link menu + a separate footer when checked. Since this Navbar
// component is shared by all 3 mobile pages, porting the richer menu here
// once applies it everywhere consistently (matching what the user asked
// for), and the mobile pages' own <Footer/> was removed to match --
// desktop keeps its separate <Footer/>, since only the mobile sheet design
// changed in the artifact.
export default function Navbar({ current, variant = 'desktop' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastYRef = useRef(0);

  // Ported from Main.dc.html's XT.mount() -- a single delegated click
  // listener (one per page, Navbar being the one component every route
  // shares) that intercepts clicks on links to the other 2 top-level
  // routes, plays the blue-line-sweep + fade-out, then navigates. See
  // lib/pageTransitions.js for why this is a real navigation rather than
  // next/link's client router, same as cardTransition.js's hardNavigate.
  //
  // That's also why every internal route link below is a plain <a>, not
  // next/link's <Link>: Link attaches its own onClick on the anchor that
  // calls e.preventDefault() and does a client-side router.push() --
  // attachNavTransition's listener checks `e.defaultPrevented` and bails
  // out if it's already true, so with <Link> this whole transition (and
  // the fresh-page-load assumptions in pageTransitions.js/cardTransition.js)
  // silently never ran: no line, no fade, just an instant client nav.
  useEffect(() => attachNavTransition(), []);

  useEffect(() => {
    if (variant !== 'mobile') return;
    lastYRef.current = window.scrollY || 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const dy = y - lastYRef.current;
      setNavHidden((hide) => {
        if (y < 12) return false;
        if (dy > 6) return true;
        if (dy < -6) return false;
        return hide;
      });
      if (Math.abs(dy) > 6 || y < 12) lastYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [variant]);

  if (variant === 'mobile') {
    const openMenu = () => setMenuOpen(true);
    const closeMenu = () => setMenuOpen(false);
    return (
      <>
        <nav className={`navbar navbar-mobile${navHidden ? ' is-hidden' : ''}`} data-nav>
          <button className="menu-btn" type="button" aria-label="Open menu" onClick={openMenu}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          </button>
          <ChatTriggerButton />
        </nav>

        <div
          className={`menu-sheet${menuOpen ? ' is-open' : ''}`}
          role="dialog"
          aria-label="Main menu"
          aria-modal="true"
        >
          <div className="menu-sheet-head">
            <button className="menu-btn" type="button" aria-label="Close menu" onClick={closeMenu}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <ul className="menu-links">
            <li style={{ '--i': 0 }}>
              <a className={`menu-link${current === 'home' ? ' is-current' : ''}`} href="/">
                Home
              </a>
            </li>
            <li style={{ '--i': 1 }}>
              <a className={`menu-link${current === 'proyectos' ? ' is-current' : ''}`} href="/proyectos">
                Projects
              </a>
            </li>
            <li style={{ '--i': 2 }}>
              <a className={`menu-link${current === 'about' ? ' is-current' : ''}`} href="/about">
                About
              </a>
            </li>
          </ul>
          <ul className="menu-links menu-links-contact">
            <li style={{ '--i': 3 }}>
              <a
                className="menu-link"
                href="https://www.linkedin.com/in/victoria-talamantes-montanez"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </li>
            <li style={{ '--i': 4 }}>
              <a className="menu-link" href="mailto:victoria.tmon@gmail.com">
                Email
              </a>
            </li>
            <li style={{ '--i': 5 }}>
              <a className="menu-link" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
                Resume
              </a>
            </li>
          </ul>
          <span className="menu-credit">
            <span>Designed + vibe coded with</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              role="img"
              aria-label="love"
            >
              <path d="M12 20.5C12 20.5 3.5 15.2 3.5 9.2C3.5 6.4 5.6 4.5 8 4.5C9.7 4.5 11.2 5.4 12 6.9C12.8 5.4 14.3 4.5 16 4.5C18.4 4.5 20.5 6.4 20.5 9.2C20.5 15.2 12 20.5 12 20.5Z"></path>
            </svg>
            <span>by Vic</span>
          </span>
        </div>
      </>
    );
  }

  return (
    <nav className="navbar" data-nav>
      <ul className="nav-left">
        <li>
          <a className="nav-link" href="/" aria-current={current === 'home' ? 'page' : undefined}>
            HOME
          </a>
        </li>
        <li>
          <a
            className="nav-link"
            href="/proyectos"
            aria-current={current === 'proyectos' ? 'page' : undefined}
          >
            PROJECTS
          </a>
        </li>
        <li>
          <a
            className="nav-link"
            href="/about"
            aria-current={current === 'about' ? 'page' : undefined}
          >
            ABOUT
          </a>
        </li>
      </ul>
      <ChatTriggerButton />
    </nav>
  );
}
