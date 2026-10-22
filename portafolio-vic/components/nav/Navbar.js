'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ChatTriggerButton from '../chat/ChatTriggerButton';
import './navbar.css';

// Shared navbar for all 3 routes. `current` picks which link gets
// aria-current="page" / is-current (matches how each .dc.html marked its
// own nav-link). `variant="mobile"` switches to the original mobile
// behavior, ported verbatim from AboutMeMobile.dc.html: a hamburger button
// that opens a full-screen slide-down menu sheet (Home/Projects/About),
// plus a sticky navbar that hides on scroll-down and reveals on scroll-up
// (or near the very top). Neither exists in the desktop variant, which
// keeps the original's plain static horizontal link row.
export default function Navbar({ current, variant = 'desktop' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastYRef = useRef(0);

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
              <Link className={`menu-link${current === 'home' ? ' is-current' : ''}`} href="/">
                Home
              </Link>
            </li>
            <li style={{ '--i': 1 }}>
              <Link className={`menu-link${current === 'proyectos' ? ' is-current' : ''}`} href="/proyectos">
                Projects
              </Link>
            </li>
            <li style={{ '--i': 2 }}>
              <Link className={`menu-link${current === 'about' ? ' is-current' : ''}`} href="/about">
                About
              </Link>
            </li>
          </ul>
        </div>
      </>
    );
  }

  return (
    <nav className="navbar" data-nav>
      <ul className="nav-left">
        <li>
          <Link className="nav-link" href="/" aria-current={current === 'home' ? 'page' : undefined}>
            HOME
          </Link>
        </li>
        <li>
          <Link
            className="nav-link"
            href="/proyectos"
            aria-current={current === 'proyectos' ? 'page' : undefined}
          >
            PROJECTS
          </Link>
        </li>
        <li>
          <Link
            className="nav-link"
            href="/about"
            aria-current={current === 'about' ? 'page' : undefined}
          >
            ABOUT
          </Link>
        </li>
      </ul>
      <ChatTriggerButton />
    </nav>
  );
}
