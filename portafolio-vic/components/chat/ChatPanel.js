'use client';

import { useEffect, useRef } from 'react';
import { useChatContext } from './ChatContext';
import './chat.css';

// VictorAI's replies share project links as plain text -- a bare internal
// path like "/proyectos#mapfre" or a full URL, per the "puedes darle click
// aqui: {{link}}" format in the chatbot's tone doc -- but {m.text} below
// used to render that straight to text, so the person had to copy/paste
// the path instead of clicking it. This scans a reply for either shape and
// turns the match into a real <a>, same plain-<a> convention as the rest
// of the site's internal nav (see Navbar.js's hardNavigate note): a
// relative path like /proyectos#mapfre already resolves against whatever
// domain the page is served from, so no absolute/production URL is needed
// here for it to work.
function linkifyMessage(text) {
  if (typeof text !== 'string') return text;
  const re = /(https?:\/\/[^\s)]+|\/proyectos#[\w-]+)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const href = match[0];
    nodes.push(
      <a
        key={'lnk' + key++}
        href={href}
        style={{ color: '#0066FF', textDecoration: 'underline', wordBreak: 'break-word' }}
      >
        {href}
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

        <div className="chat-body" onClick={chat.onBodyClick}>
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
                    {m.role === 'user' ? m.text : linkifyMessage(m.text)}
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
