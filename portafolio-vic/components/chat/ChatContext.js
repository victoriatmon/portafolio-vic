'use client';

import { createContext, useContext } from 'react';
import { useVictorAIChat } from './useVictorAIChat';

// The chat trigger button lives inside <nav> (for layout) but the panel
// itself must render OUTSIDE <nav> so that inert-ing the navbar while the
// panel is open doesn't also inert the panel's own contents. Context lets
// both pieces share one instance of the chat state without that nesting
// problem. Each page wraps its whole tree in <VictorAIChatProvider>.
const ChatContext = createContext(null);

export function VictorAIChatProvider({ topics, starters, children }) {
  const chat = useVictorAIChat({ topics, starters });
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used inside a <VictorAIChatProvider>');
  }
  return ctx;
}
