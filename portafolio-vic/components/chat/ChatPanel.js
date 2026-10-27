'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from './ChatContext';
import './chat.css';

// VictorAI's replies share project links as plain text -- a bare internal
// path like "/proyectos#mapfre", or sometimes the model writes out the full
// production URL instead, per the "puedes darle click aqui: {{link}}"
// format in the chatbot's tone doc -- but {m.text} below used to render
// that straight to text, so the person had to copy/paste the path instead
// of clicking it, AND once it was linkified the literal path/URL text read
// as ugly link copy (Vic's own feedback). Fixed in two parts: turn the
// match into a real <a> (same plain-<a> convention as the rest of the
// site's internal nav, see Navbar.js's hardNavigate note -- a relative path
// like /proyectos#mapfre already resolves against whatever domain the page
// is served from, so no absolute/production URL is needed for it to work),
// and show the project's own tagline as the link text instead of the raw
// path/URL, same taglines already used as the Proyectos page's pill labels
// and the Home cards' labels -- do not let this list drift from
// PROJECT_SLUGS/PROJECT_LABELS in ProyectosDesktop.js/ProyectosMobile.js,
// same order, same strings.
const PROJECT_LINK_TEXT = {
  mapfre: 'Driving 35% YoY growth',
  'ai-cash-flow-predictor': 'AI Cash Flow Predictor',
  pulso: 'Unlocking Health Access',
  axa: 'Scaling enterprise sales',
  victorai: 'VictorAI',
  'onu-pnud': 'Inclusive finance architecture',
};
// `onLinkClick` closes the chat panel before the click's own navigation
// happens -- requested by Vic: clicking a project link buried inside the
// chat used to leave the panel open and covering the page it just jumped
// to (most noticeable for a same-document /proyectos#slug hop while
// already on /proyectos -- see ProyectosDesktop.js/ProyectosMobile.js's
// hashchange listener -- where nothing reloads, so the panel just sits
// there over the new content instead of a page transition ever having a
// chance to hide it). Passed in rather than imported, so linkifyMessage
// itself stays a plain function with no dependency on chat state.
function linkifyMessage(text, onLinkClick) {
  if (typeof text !== 'string') return text;
  const re = /(https?:\/\/[^\s)]+|\/proyectos#[\w-]+)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const href = match[0];
    const slugMatch = href.match(/#([\w-]+)$/);
    const linkText = (slugMatch && PROJECT_LINK_TEXT[slugMatch[1]]) || href;
    nodes.push(
      <a
        key={'lnk' + key++}
        href={href}
        onClick={onLinkClick}
        style={{ color: '#0066FF', textDecoration: 'underline', wordBreak: 'break-word' }}
      >
        {linkText}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Renders as a sibling AFTER <nav data-nav> (not inside it) -- see note in
// ChatContext.js. Keyboard/focus behavior (inert on the rest of the page
// while open, focus moved to the composer on open, returned to whatever
// triggered it on close, Escape closes) matches AboutMe.dc.html, the
// accessibility-complete version this was ported from.
export default function ChatPanel() {
  const chat = useChatContext();
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    const navbar = document.querySelector('[data-nav]');
    const page = document.querySelector('[data-page]');
    const footerEl = document.querySelector('[data-site-footer]');
    [navbar, page, footerEl].forEach((el) => {
      if (el) el.toggleAttribute('inert', chat.chatOpen);
    });
    if (panelRef.current) panelRef.current.toggleAttribute('inert', !chat.chatOpen);

    if (chat.chatOpen) {
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
      return () => clearTimeout(t);
    }
    const trigger = chat.triggerElRef.current;
    const t = setTimeout(() => {
      if (trigger && trigger.focus && document.contains(trigger)) trigger.focus();
      else {
        const btn = document.querySelector('.chat-btn');
        if (btn) btn.focus();
      }
    }, 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.chatOpen]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && chat.chatOpen) chat.closeChat();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [chat.chatOpen, chat]);

  // Keep the conversation pinned to its latest content -- a new message
  // (either side), the typing indicator starting/stopping, or a fresh set
  // of follow-up pills all change what .chat-body's natural bottom is.
  // Without this, a reply that arrives while .chat-body is already
  // scrolled up (or simply tall enough that the new content lands below
  // the fold) is invisible until the person scrolls down for it
  // themselves -- reads as the reply "not showing up" rather than as
  // content to scroll to. Runs after paint (useEffect, not
  // useLayoutEffect) so it measures the row's settled layout, but still
  // before the user has a chance to perceive the unscrolled frame.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.isLoading, chat.followUps]);

  // handleDraftChange grows the textarea with an imperative inline
  // `el.style.height` as the person types, but nothing ever reset that
  // inline style back down -- sendDraft()/resetChat() only clear the
  // controlled `draft` value, never touch the DOM node's height. A message
  // that had wrapped to several lines left the input stuck at that taller
  // height after being sent: an empty box with the placeholder sitting at
  // its normal top padding, and a big block of blank space below it where
  // the extra lines used to be -- reported as the input "getting
  // distorted" / having "too much padding at the bottom". Resetting the
  // inline height to `auto` whenever the draft goes back to empty (by any
  // path, not just Send) lets CSS's `min-height: 56px` take back over, the
  // same floor handleDraftChange itself relies on for a single empty line.
  useEffect(() => {
    if (chat.draft === '' && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [chat.draft]);

  function handleDraftChange(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    chat.setDraft(el.value);
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chat.sendDraft();
    }
  }

  const footerClass = chat.limitReached ? 'is-limit-reached' : chat.isLoading ? 'is-loading' : '';
  const inputPlaceholder = chat.limitReached ? 'Conversation ended for now' : 'Ask about Victoria...';
  const sendBtnClass = (chat.draft || '').trim() ? 'is-filled' : '';

  return (
    <>
      <div
        className={`chat-scrim ${chat.chatOpen ? 'is-open' : ''}`}
        onClick={chat.closeChat}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`chat-panel ${chat.chatOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="VictorAI chat"
      >
        <div className="chat-header">
          <span className="chat-header-title">
            VICTORAI
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10.5946 13.6475L9.79167 16.4583L8.9887 13.6475C8.78117 12.9214 8.39206 12.2602 7.85809 11.7262C7.32413 11.1923 6.66292 10.8032 5.93685 10.5956L3.125 9.79167L5.93586 8.9887C6.66193 8.78117 7.32314 8.39206 7.85711 7.8581C8.39107 7.32413 8.78018 6.66292 8.98772 5.93685L9.79167 3.125L10.5946 5.93586C10.8022 6.66193 11.1913 7.32314 11.7252 7.85711C12.2592 8.39107 12.9204 8.78018 13.6465 8.98772L16.4583 9.79167L13.6475 10.5946C12.9214 10.8022 12.2602 11.1913 11.7262 11.7252C11.1923 12.2592 10.8032 12.9204 10.5956 13.6465L10.5946 13.6475Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.48148"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="info-wrap">
              <button
                className={`icon-btn ${chat.tooltipOpen ? 'is-pressed' : ''}`}
                type="button"
                aria-label="About VictorAI"
                onClick={chat.toggleTooltip}
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                  />
                </svg>
              </button>
              {chat.tooltipOpen && (
                <div className="chat-tooltip" role="tooltip">
                  VictorAI is an AI chatbot. May contain hallucinations. Responses are logged for
                  research and development purposes.
                </div>
              )}
            </span>
          </span>
          <div className="chat-header-actions">
            <button
              className="icon-btn"
              type="button"
              aria-label="Restart conversation"
              onClick={chat.resetChat}
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
            <button className="icon-btn" type="button" aria-label="Close chat" onClick={chat.closeChat}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-body" ref={bodyRef} onClick={chat.onBodyClick}>
          {!chat.hasMessages && (
            <div className="chat-greeting">
              <h3>Hello there, I&apos;m VictorAI.</h3>
              <div className="chat-suggestions">
                {chat.starters.map((opt, i) => (
                  <button key={i} className="suggestion-btn" type="button" onClick={opt.pick}>
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499"
                      />
                    </svg>
                    <span>{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chat.hasMessages && (
            <div className="chat-messages">
              {chat.messages.map((m, i) => (
                <div
                  key={i}
                  className="chat-msg-row"
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={
                      m.role === 'user'
                        ? {
                            maxWidth: '80%',
                            background: '#1E1E1E',
                            color: '#F5F5F5',
                            padding: '12px 16px',
                            borderRadius: 16,
                            fontFamily: "'Manrope',sans-serif",
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: 1.5,
                          }
                        : {
                            maxWidth: '100%',
                            color: '#CCCCCC',
                            fontFamily: "'Manrope',sans-serif",
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: 1.6,
                          }
                    }
                  >
                    {m.role === 'user' ? m.text : linkifyMessage(m.text, chat.closeChatForNav)}
                  </div>
                </div>
              ))}

              {chat.isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="typing-dots" aria-label="VictorAI is typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              {chat.followUps.length > 0 && (
                <div className="chat-suggestions">
                  {chat.followUps.map((opt, i) => (
                    <button key={i} className="suggestion-btn" type="button" onClick={opt.pick}>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499"
                        />
                      </svg>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`chat-footer ${footerClass}`}>
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder={inputPlaceholder}
            aria-label="Ask about Victoria"
            value={chat.draft}
            onChange={handleDraftChange}
            onKeyDown={handleInputKeyDown}
          />
          <button
            className={`send-btn icon-btn ${sendBtnClass}`}
            type="button"
            aria-label="Send message"
            onClick={chat.sendDraft}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
