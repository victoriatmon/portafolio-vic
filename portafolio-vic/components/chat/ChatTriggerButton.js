'use client';

import { useChatContext } from './ChatContext';
import './chat.css';

// Lives inside <nav>, next to the HOME/PROJECTS/ABOUT links -- see Navbar.js.
export default function ChatTriggerButton() {
  const chat = useChatContext();

  return (
    <button className="chat-btn" type="button" aria-label="Open VictorAI chat" onClick={chat.openChat}>
      <span>VICTORAI</span>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10.5946 13.6475L9.79167 16.4583L8.9887 13.6475C8.78117 12.9214 8.39206 12.2602 7.85809 11.7262C7.32413 11.1923 6.66292 10.8032 5.93685 10.5956L3.125 9.79167L5.93586 8.9887C6.66193 8.78117 7.32314 8.39206 7.85711 7.8581C8.39107 7.32413 8.78018 6.66292 8.98772 5.93685L9.79167 3.125L10.5946 5.93586C10.8022 6.66193 11.1913 7.32314 11.7252 7.85711C12.2592 8.39107 12.9204 8.78018 13.6465 8.98772L16.4583 9.79167L13.6475 10.5946C12.9214 10.8022 12.2602 11.1913 11.7262 11.7252C11.1923 12.2592 10.8032 12.9204 10.5956 13.6465L10.5946 13.6475Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.48148"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
