'use client';

import { useCallback, useRef, useState } from 'react';

// The real VictorAI chat engine, shared by all 3 routes (it used to be copy-
// pasted into all 6 .dc.html files in Claude Design -- Home already called
// the real backend, About and Proyectos were wired to it later in the same
// pass that produced this export). One hook, one place to fix a bug.
//
// The daily cap itself is enforced server side (Supabase Edge Function
// `chat`, DAILY_MESSAGE_LIMIT), keyed on sessionId across a real 24h window.
// This hook never counts on its own, it just recognizes the exact reply text
// and locks the UI when it comes back (isLimitReply below).

const SUPABASE_URL = 'https://mqnpewhhuhhebgdavecr.supabase.co';
const EDGE_FUNCTION_URL = SUPABASE_URL + '/functions/v1/chat';
// Public anon key -- safe to ship client side (protected by RLS, same model
// as the newer sb_publishable_ key), required because the function's
// "verify JWT" gateway setting expects a JWT in the Authorization header.
// Moved to an env var per the launch checklist: set
// NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel instead of editing this file.
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbnBld2hodWhoZWJnZGF2ZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTY2MzYsImV4cCI6MjEwNDEzMjYzNn0.13beg6gN3klns-VyDE-CUNSF03_-LBTxpD--iXFzYwo';

const LIMIT_REPLY = {
  es: '¡Qué buena plática! Si quieres seguir profundizando, Vic estará feliz de continuar la conversación por correo: victoria.tmon@gmail.com.',
  en: "That was a great chat! If you'd like to keep digging in, Vic would be happy to continue over email: victoria.tmon@gmail.com.",
  nl: 'Wat een leuk gesprek! Als je hier dieper op in wilt gaan, praat Vic graag verder via e-mail: victoria.tmon@gmail.com.',
};

// Shown only when the request to the Edge Function itself fails (offline,
// CORS, DNS, timeout). A normal backend error still returns 200 with its own
// reply, so this is strictly the "couldn't even reach the server" case.
const NETWORK_ERROR_REPLY = {
  es: 'No pude conectar en este momento. Intenta de nuevo en un momento o escríbele a Vic directamente a victoria.tmon@gmail.com.',
  en: "I couldn't connect just now. Please try again in a moment, or email Vic directly at victoria.tmon@gmail.com.",
  nl: 'Ik kon zonet geen verbinding maken. Probeer het straks opnieuw of mail Vic rechtstreeks op victoria.tmon@gmail.com.',
};

const FALLBACK =
  "I don't have that on hand, but feel free to email Vic directly at victoria.tmon@gmail.com, she'd love to chat about this.";

// Same lightweight detection as the Edge Function, so the limit/error
// messages reply in whichever of the 3 supported languages the visitor used.
// Reads only the message passed in (never blended with earlier history) --
// see the Edge Function's detectLanguage for why that matters: an older
// version that mixed in the whole conversation's history let one earlier
// Spanish/Dutch word permanently flip detection for every later message.
function detectLanguage(text) {
  const sample = (text || '').toLowerCase();
  const nl =
    /\b(ik|jij|jouw|niet|wat|hoe|waarom|alsjeblieft|dankje|dankjewel|hallo|goedemorgen|graag|alstublieft|kun je|wil je|ben je)\b/;
  const es =
    /[¿¡áéíóúñ]|(\b(qué|como|cómo|cuál|cuáles|dónde|gracias|por favor|hola|puedes|quiero|eres|cuéntame|cuentame|hace|trabajo|proyecto)\b)/;
  if (nl.test(sample)) return 'nl';
  if (es.test(sample)) return 'es';
  return 'en';
}

function isLimitReply(text) {
  return text === LIMIT_REPLY.es || text === LIMIT_REPLY.en || text === LIMIT_REPLY.nl;
}

// One id per visitor, kept in localStorage so the Edge Function's daily cap
// and conversation history line up across page reloads -- and across Home,
// About and Proyectos, since they all share this same key.
function getOrCreateSessionId() {
  const KEY = 'victorai_session_id';
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch (e) {
    return 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }
}

/**
 * @param {Object} content
 * @param {Object} content.topics  Same shape as the old this.TOPICS: { TopicName: [{ q, a, opens? }] }
 * @param {Array}  content.starters Same shape as the old this.STARTERS: [{ q, a, topic }]
 *
 * Each page (Home, About, Proyectos) passes its own bio/project content --
 * the fetch/session/limit/follow-up mechanics below are identical everywhere.
 */
export function useVictorAIChat({ topics, starters }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [usedByTopic, setUsedByTopic] = useState({});
  const [limitReached, setLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Tracks the most recently detected conversation language ('en'/'es'/'nl'),
  // so the NEXT render's follow-up suggestions are offered in whatever
  // language the visitor is actually using -- see chatTopics.js's header
  // comment for why this exists (a Dutch conversation was still showing
  // English-only suggestion pills).
  const [lang, setLang] = useState('en');

  const sessionIdRef = useRef(null);
  if (sessionIdRef.current === null && typeof window !== 'undefined') {
    sessionIdRef.current = getOrCreateSessionId();
  }

  // Keyed by every language variant of every known question (lowercased) so
  // a free-typed message matching a known question in any of the 3
  // languages still resolves to the right topic. `key` is a stable,
  // language-independent identifier for "used pool" tracking -- always the
  // English text, regardless of which language variant was actually typed
  // or displayed.
  const lookupRef = useRef(null);
  if (lookupRef.current === null) {
    const lookup = {};
    const indexItem = (item, topic) => {
      const key = item.q.en;
      Object.keys(item.q).forEach((itemLang) => {
        const text = item.q[itemLang];
        if (text) lookup[text.toLowerCase()] = { key, topic };
      });
    };
    starters.forEach((item) => indexItem(item, item.topic));
    Object.keys(topics).forEach((topic) => {
      topics[topic].forEach((item) => indexItem(item, item.opens || topic));
    });
    lookupRef.current = lookup;
  }

  const pickFromPool = useCallback((key, topic) => {
    setUsedByTopic((prev) => {
      const used = { ...prev };
      const set = new Set(used[topic] || []);
      set.add(key);
      used[topic] = Array.from(set);
      return used;
    });
  }, []);

  const answer = useCallback(
    async (text, forcedTopic, sourceKey) => {
      if (limitReached || isLoading) return;

      const userMsg = { role: 'user', text };
      const hit = lookupRef.current[text.toLowerCase()];
      const nextTopic = forcedTopic || (hit && hit.topic) || currentTopic || 'Bio';

      // sourceKey is set when this came from clicking a follow-up pill (see
      // followUps/starters below) -- marks that specific question as used
      // in its own pool so it isn't immediately re-offered. A manually
      // typed message that happens to match a known question's text isn't
      // marked used; only its topic is inferred from `hit`, matching the
      // original behavior.
      if (sourceKey) pickFromPool(sourceKey, nextTopic);

      setLang(detectLanguage(text));

      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.text }));

      setMessages((prev) => [...prev, userMsg]);
      setCurrentTopic(nextTopic);
      setIsLoading(true);

      let replyText;
      let hitLimit = false;

      try {
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            message: text,
            sessionId: sessionIdRef.current,
            history,
          }),
        });

        if (!res.ok) throw new Error('request_failed_' + res.status);

        const data = await res.json();
        replyText =
          data && typeof data.reply === 'string' && data.reply.trim() ? data.reply : FALLBACK;
        hitLimit = isLimitReply(replyText);
      } catch (err) {
        console.error('VictorAI request failed:', err);
        replyText = NETWORK_ERROR_REPLY[detectLanguage(text)];
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
      setIsLoading(false);
      setLimitReached(hitLimit);
    },
    [limitReached, isLoading, currentTopic, messages, pickFromPool]
  );

  const followUpsFor = useCallback(
    (topic) => {
      const pool = topics[topic] || topics.Bio;
      const used = new Set((usedByTopic || {})[topic] || []);
      let unused = pool.filter((it) => !used.has(it.q.en));
      if (unused.length === 0) unused = pool.slice();
      return unused.slice(0, 3);
    },
    [topics, usedByTopic]
  );

  const sendDraft = useCallback(() => {
    if (limitReached || isLoading) return;
    const text = (draft || '').trim();
    if (!text) return;
    answer(text, null);
    setDraft('');
  }, [limitReached, isLoading, draft, answer]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setCurrentTopic(null);
    setUsedByTopic({});
    setDraft('');
    setTooltipOpen(false);
    setLimitReached(false);
    setIsLoading(false);
    setLang('en');
  }, []);

  const triggerElRef = useRef(null);
  const openChat = useCallback(() => {
    if (typeof document !== 'undefined') triggerElRef.current = document.activeElement;
    setChatOpen(true);
  }, []);
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setTooltipOpen(false);
  }, []);
  const toggleTooltip = useCallback(() => setTooltipOpen((v) => !v), []);
  const onBodyClick = useCallback(() => setTooltipOpen(false), []);

  const hasMessages = messages.length > 0;
  const topic = currentTopic || 'Bio';
  const followUps =
    hasMessages && !limitReached && !isLoading
      ? followUpsFor(topic).map((item) => {
          const text = item.q[lang] || item.q.en;
          return {
            text,
            pick: () => answer(text, item.opens || topic, item.q.en),
          };
        })
      : [];

  return {
    chatOpen,
    triggerElRef,
    tooltipOpen,
    draft,
    setDraft,
    messages,
    hasMessages,
    limitReached,
    isLoading,
    followUps,
    starters: starters.map((item) => ({ text: item.q.en, pick: () => answer(item.q.en, item.topic) })),
    openChat,
    closeChat,
    resetChat,
    toggleTooltip,
    onBodyClick,
    sendDraft,
  };
}
