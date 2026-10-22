import './footer.css';

// Shared across all 3 routes.
export default function Footer() {
  return (
    <footer className="site-footer" data-site-footer>
      <span className="footer-credit">
        <span>Designed + vibe coded with</span>
        <svg
          width="16"
          height="16"
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
      <nav className="footer-links" aria-label="Contact links">
        <a
          className="footer-btn"
          href="https://www.linkedin.com/in/victoria-talamantes-montanez"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a className="footer-btn" href="mailto:victoria.tmon@gmail.com">
          Email
        </a>
        <a className="footer-btn" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
          Resume
        </a>
      </nav>
    </footer>
  );
}
