'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { consumeEnterFlag, playEnterContentFade } from '@/lib/pageTransitions';
import { VictorAIChatProvider, useChatContext } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/layout/Footer';
import CursorDot from '@/components/layout/CursorDot';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import './proyectos.css';

// ============================================================================
// Static data -- ported verbatim from Projects.dc.html's own _buildData().
// Built once at module load, same shape, same copy, same facts.
// ============================================================================

// Data, derived-state helpers and the decorative demo widgets below are
// exported so ProyectosMobile.js can reuse them verbatim instead of
// duplicating ~1000 lines of case-study copy and mockup markup -- this
// keeps the two viewports' content from drifting out of sync with each
// other over time.
export const PILL_LABELS = [
  'Driving 35% YoY growth',
  'AI Cash Flow Predictor',
  'Unlocking Health Access',
  'Scaling enterprise sales',
  'VictorAI',
  'Inclusive finance architecture',
];

// Pulled from each project's actual landing-card color (Main.dc.html), not
// invented: Mapfre's card is the vermillion red E34234, Phantom's is the
// purple 7657D6, Pulso's is the teal 159A8A, VictorAI's star is EB2628, and
// the UNDP card's accent is the pink C93F78. Axa's card is a dark green/teal
// photo blended hard-light over a near-black base -- its only flat hex color
// (C02B2B) is just small highlight rectangles, not the card's real color, so
// that one was sampled from a render of the actual composited card instead
// of read off the markup.
export const GRADIENTS = [
  'linear-gradient(135deg,#E34234,#490E08)',
  'linear-gradient(135deg,#7657D6,#1B0F43)',
  'linear-gradient(135deg,#159A8A,#084942)',
  'linear-gradient(135deg,#39C65B,#11401D)',
  'linear-gradient(135deg,#EB2628,#4C0506)',
  'linear-gradient(135deg,#C93F78,#411125)',
];

// ---- Phantom Money "ask the AI" search bar: a purely decorative typewriter
// loop (type a sample question, pause, delete, move to the next). It never
// actually answers anything -- see the phantom type effect below.
export const PHANTOM_PROMPTS = [
  'Should I buy this $200 item?',
  'What if I spend $50 today?',
  "Predict next Friday's balance",
];

// ---- Project content builders (same shape as the original _buildData) ----
const P = (text) => ({ isP: true, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, text });
const LEAD = (lead, rest) => ({ isP: false, isLead: true, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, lead, rest });
const RICH = (pre, bold, post) => ({ isP: false, isLead: false, isRich: true, isQuote: false, isImage: false, isList: false, isCard: false, pre, bold, post });
const QUOTE = (text) => ({ isP: false, isLead: false, isRich: false, isQuote: true, isImage: false, isList: false, isCard: false, text });
const IMG = (caption, demoId) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: true, isList: false, isCard: false, caption, demoId: demoId || null });
const VIDEO = (src, position) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: true, isVideo: true, isList: false, isCard: false, caption: '', demoId: null, videoSrc: src, videoPosition: position || 'top' });
const LIST = (items) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: true, isCard: false, isGrid2: false, isCols: false, items });
const GRID2 = (items, opts) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, isGrid2: true, isCols: false, items, gridClass: 'proj-cards-2col' + (opts && opts.matchHeight ? ' is-row-matched' : '') });
const QITEM = (tag, paragraphs) => ({ tag, paragraphs: paragraphs.map((t) => ({ text: t })) });
const COLS = (left, right) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, isGrid2: false, isCols: true, left: left.map((t) => ({ text: t })), right: right.map((t) => ({ text: t })) });
const TWIN = (leftHeading, leftParas, rightHeading, rightParas) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, isGrid2: false, isCols: false, isTwin: true, leftHeading, rightHeading, left: leftParas.map((t) => ({ text: t })), right: rightParas.map((t) => ({ text: t })) });
const RITEM = (tag, text, caption, demoId) => ({
  tag,
  text,
  caption,
  isQuoteManagerDemo: demoId === 'quote-manager-demo',
  isBackofficeDemo: demoId === 'backoffice-whatsapp-demo',
  isFailureResponseDemo: demoId === 'failure-response-demo',
  isLifecycleDemo: demoId === 'lifecycle-demo',
  isDashboardDemo: demoId === 'dashboard-demo',
  isPlainRowImage:
    demoId !== 'quote-manager-demo' &&
    demoId !== 'backoffice-whatsapp-demo' &&
    demoId !== 'failure-response-demo' &&
    demoId !== 'lifecycle-demo' &&
    demoId !== 'dashboard-demo',
});
const ROWS = (items) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, isGrid2: false, isCols: false, isTwin: false, isRows: true, items });
const IMGROW = (captions) => ({
  isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: false, isGrid2: false, isCols: false, isTwin: false, isRows: false, isImgRow: true,
  items: captions.map((c) => {
    const isStr = typeof c === 'string';
    const caption = isStr ? c : c.caption || '';
    const src = isStr ? null : c.src || null;
    return { caption, src, hasSrc: !!src, noSrc: !src };
  }),
});
const CARD = (tag, text) => ({ isP: false, isLead: false, isRich: false, isQuote: false, isImage: false, isList: false, isCard: true, tag, text, cardClass: tag === 'After' ? 'is-after' : '' });

const MAPFRE = {
  layout: 'mapfre',
  // Stable anchor id for direct linking, e.g. #mapfre -- do not rename, it may be referenced externally.
  slug: 'mapfre',
  companyLabel: 'Mapfre Mexico Auto Insurance',
  title: 'Driving 35% YoY: Just with a simple twitch',
  status: 'Shipped & live',
  meta: [
    { label: 'Role', value: 'Lead Product Designer' },
    { label: 'Timeline', value: 'Implemented 2025' },
    { label: 'Team with', value: '1 FrontDev & 1 BackDev' },
    { label: 'Skills', value: 'Product Design, Product Strategy, Leadership, Metric insights' },
  ],
  stats: [
    { value: '', before: '56.5%', after: '97.4%', hasArrow: true, noArrow: false, label: 'Search efficiency' },
    { value: '+$21,140', before: '', after: '', hasArrow: false, noArrow: true, label: 'Recovered annual premium' },
    { value: '35.2% YoY', before: '', after: '', hasArrow: false, noArrow: true, label: 'Total sales growth' },
  ],
  toc: [
    { id: 'meta', label: 'Meta data' },
    { id: 'wrong-fix', label: 'The wrong fix we almost shipped' },
    { id: 'real-fix', label: 'The real fix: Teach the search to understand typos, not the user to spell better with AI' },
    { id: 'result', label: 'From "No" to "Found It" in one sprint' },
    { id: 'takeaway', label: 'The takeaway' },
  ],
  sections: [
    {
      id: 'wrong-fix',
      heading: 'The wrong fix we almost shipped',
      hasSideBox: false,
      blocks: [
        P('Once we relaunched the entire car insurance quotation experience mobile first, something new showed up in the metrics: a huge share of users were dropping off right at the landing page. The obvious move was to redesign the landing page and add more trust signals. But before touching a single pixel, we dug deeper into the funnel and found the real pattern. Most of that drop off was not about the landing page at all. It was happening because users typed their car\'s brand or model and our search could not find it. "Hyundai" typed as "Hiundai" returned nothing. One typo, and the sale was gone before it ever started.'),
        P('The fallback for a failed search was a wizard: collect the user\'s info and have an agent call them with a quote later. It felt like a safety net. It was actually a leak, because most of those users never answered the call. The team\'s first instinct was to fix this with a better CX follow up strategy: improve callback timing, improve the email copy, chase the leads harder. It is a completely reasonable idea, and exactly the kind of patch that quietly turns into its own project, its own backlog, its own team, while the real problem stays untouched underneath it. So we stopped and asked a simpler question: what is actually broken here? Not "how do we get people to pick up the phone." The problem was that users could not find their own car.'),
      ],
    },
    {
      id: 'real-fix',
      heading: 'The real fix: Teach the search to understand typos, not the user to spell better with AI',
      hasSideBox: true,
      blocks: [
        P('If someone had walked into an insurance office in 1995 and said "I have a Hiundai," the agent would have understood instantly and fixed it without even mentioning it. The system needed to do what the human always did.'),
        P('The first idea on the table was to throw AI at every search query, having a model read each user\'s input in real time and figure out what car they meant, on the spot, every single time someone searched. We considered it, and turned it down for this specific problem. Not because AI cannot do it, but because it was the wrong tool for a problem we already understood: we already knew the most common misspellings our users made. So instead of processing every input through a live model, we built a fuzzy search engine tagged against the real, recurring typos we had already seen in the data, using AI as a development accelerator to help spot and tag those patterns faster, not as the live decision maker at checkout.'),
        P('A simple search bar. No live inference. Just real, recurring "wrong" spellings mapped to the right answer.'),
      ],
    },
    {
      id: 'result',
      heading: 'From "No" to "Found It" in one sprint',
      hasSideBox: false,
      blocks: [
        CARD('Before', 'Search efficiency sat at 56.5%. We were only finding about 5 out of every 10 cars people actually owned.'),
        CARD('After', 'Search efficiency got to 97.4%. Nearly 10 out of 10. An estimated +$21,140 in annual premiums that had been silently lost to a search bar that could not spell.'),
        P('Once the search stopped rejecting real customers, total sales grew 35.2% year over year, adding more than 400 additional policies sold per month compared to the year before. Today, when a user\'s car is not found, it is because of a clear business rule, like pickup trucks or motorcycles that this insurer does not underwrite online, not because the tool failed them. That naturally opens the next question: how do we turn those vehicles into a sale too? That is not solved yet, but that is what is coming next.'),
      ],
    },
    {
      id: 'takeaway',
      heading: 'The takeaway',
      hasSideBox: false,
      blocks: [
        P('The biggest lesson here was not technical. It was about where to look. The team\'s first instinct was to treat the symptom, low callback rates, as its own new project. The real fix was one level up: stop losing the user in the first place.'),
        P('Design\'s job was not to make checkout prettier. It was to notice that "we need better CX follow up" was really code for "our search bar is broken," and to have the discipline to zoom out before building the wrong solution.'),
      ],
    },
  ],
};

export const PROJECTS = [
  MAPFRE,
  {
    hasIndex: true,
    slug: 'ai-cash-flow-predictor',
    companyLabel: 'Stanford University COURSE: UX/UI for AI Products',
    title: 'AI Cash Flow Predictor: Phantom Money',
    status: 'Stanford concept project',
    meta: [
      { label: 'Role', value: 'Product Designer' },
      { label: 'Timeline', value: '2026, during the course' },
      { label: 'Skills', value: 'Product Design, AI Agents, Ethics in AI Design, UX for AI Systems' },
    ],
    toc: [
      { id: 'meta', label: 'Meta Data' },
      { id: 'no-banking-app', label: 'The question no banking app in México was answering' },
      { id: 'showing-the-past', label: 'Why "showing the past" was never going to be enough' },
      { id: 'never-the-rent', label: "It's never the rent" },
      { id: 'copilot-never-autopilot', label: 'Copilot, never autopilot' },
      { id: 'black-box-honest', label: 'Making a black box feel honest' },
      { id: 'question-couldnt-design-around', label: "The question I couldn't design around" },
      { id: 'where-this-leaves-me', label: 'Where this leaves me' },
    ],
    sections: [
      {
        id: 'no-banking-app',
        heading: 'The question no banking app in México was answering',
        blocks: [
          IMG('Space for the expense-entry demo: type an upcoming expense, see the prediction', 'expense-entry'),
          P("You open your banking app. The number is positive. You feel fine. Two days later the electricity bill hits, or an annual insurance payment you'd forgotten about, and suddenly that \"fine\" balance wasn't fine at all. That gap, between what your balance shows and what you can actually spend, became the seed of this project: an AI module for a banking app built to answer one question, every day."),
          QUOTE('"How much money do I actually have free to spend, without putting my future commitments at risk?"'),
          P("This was designed during a UX/UI for AI Products course at Stanford. It's a concept, not a shipped product. I'm including it because the thinking behind it, the trade offs, the ethics, is exactly the kind of thinking I want to keep doing."),
        ],
      },
      {
        id: 'showing-the-past',
        heading: 'Why "showing the past" was never going to be enough',
        blocks: [
          P('Every banking app I looked at is good at one thing: showing you where your money went. Categorized, colored, charted. A rearview mirror. Nobody was answering the forward looking question. "What did I spend" is easy to answer. "What can I still spend without breaking something later" is the one that mattered, and that gap looked small on paper, until I started talking to real people.'),
        ],
      },
      {
        id: 'never-the-rent',
        heading: "It's never the rent",
        blocks: [
          P('Two users stood out: a 54 year old professional who manages his money in Excel and mental subaccounts, and a 20 year old psychology student who checks her balance like a traffic light, money left means keep spending, money low means stop.'),
          P("Different generations, different tools, same exact wound. Both were blindsided by small, irregular expenses, never the big fixed ones. He already has rent and insurance prorated like clockwork; what gets him is the accumulation of small unplanned purchases. She doesn't budget at all, she just watches the number drop, surprised at how fast daily coffees eat through what felt like \"extra\" money."),
          P("This is where the idea stopped being a guess and became a target. Instead of \"track your spending,\" the real problem became \"catch the pattern you can't see yourself.\" Fixed expenses are easy to plan around. Irregular ones are invisible until they've already hurt you."),
        ],
      },
      {
        id: 'copilot-never-autopilot',
        heading: 'Copilot, never autopilot',
        blocks: [
          P('The next question was harder: how much should the AI be allowed to do on its own, moving money, blocking a purchase, versus only recommend, leaving the click to the user? Technically, full automation would have been easier and more "intelligent looking." I decided against it, because both users had already built their own manual systems of control, his subaccounts, her separate "off limits" savings, and they trusted those systems because they\'d built them themselves. An algorithm quietly moving their money would feel like losing control over something personal, not like help.'),
          P("So the rule became: the AI can calculate anything, but it can never execute anything. Every projection comes with a real choice sitting next to it, and the user clicks, every time, nothing moves, nothing gets blocked, unless they say so. Think of a copilot next to an autopilot: an autopilot flies the plane for you, while a copilot sits beside you, points at what's ahead, and keeps your hands on the wheel. Once I named that principle, I used it as a filter for every decision after it."),
          P("On screen, that principle takes the shape of a calendar. The user taps any day and a simulator opens, asking how much they're thinking of spending. The projection comes back next to small, secondary actions the user can choose from, and always an option that means nothing happens at all. No step executes on its own."),
          IMG('Calendar demo: tap a day, enter a hypothetical expense, see the projection', 'calendar-loop'),
        ],
      },
      {
        id: 'black-box-honest',
        heading: 'Making a black box feel honest',
        blocks: [
          P("A prediction is only useful if people believe it, and I didn't want that belief to depend on blind faith in an algorithm. People tend to stop questioning a number the moment AI produces it, so every prediction here needed to bring its own evidence."),
          P("Show the Math, a low hierarchy button, opens a breakdown: current balance, minus predicted rent, minus this week's coffee pattern, equals your safe balance. I designed it the way you'd explain math to a curious kid, not the way you'd explain an algorithm to an engineer. The user can also correct it: if the AI assumes a Netflix charge that got cancelled, they edit that line right there, and the system remembers. That protects the user's sense of agency and makes the model more accurate over time, at the same time."),
          P('Language mattered just as much. Never "you will have exactly $500." Always a range: "$450 to $550, approximately." Certainty is a promise an algorithm can\'t keep, so the interface never makes promises the model can\'t back up.'),
          P('On screen, that same idea shows up in how simple the breakdown stays, numbers anyone can follow at a glance, nothing that asks the user to think like an analyst.'),
          IMG('Demo: tap "Show the Math" to reveal the breakdown', 'show-math'),
          IMG('Demo: user correcting a Netflix charge, and the AI learning from it', 'netflix-learn'),
        ],
      },
      {
        id: 'question-couldnt-design-around',
        heading: "The question I couldn't design around",
        blocks: [
          P('The further I got, one uncomfortable question kept surfacing: if this works, what happens when it works too well?'),
          LIST([
            LEAD('Bias', ' An algorithm trained to flag "risky" spending could easily penalize people living paycheck to paycheck or on irregular freelance income, mistaking survival for recklessness. I built in a way for users to flag atypical expenses, a medical emergency, for example, so one event never becomes a permanent judgment.'),
            LEAD('Privacy turning into a gate', ' In one of the course\'s ethics discussions, we looked at a scenario where a "safe balance" leaked outside the app and was used to include or exclude someone from a service. That scenario is exactly why the Safe Balance can never be queried by any third party, not stores, not other apps, not even other modules of the same bank, without explicit permission. A privacy mode also hides real numbers in public settings, because financial dignity shouldn\'t depend on who\'s standing next to you at checkout.'),
            LEAD('Quiet dependency', " The Gen Z user in my research already runs on a reactive traffic light system. A tool this convenient could easily make her stop thinking altogether and just wait for a green light. So I built in deliberate friction: anything critical forces an actual human click, never a silent automatic action."),
          ]),
          P("None of these are solved problems. They're the kind of thing you keep watching for, not check off a list. Naming them before a single line of code felt like the responsible way to design something this close to people's real anxieties."),
        ],
      },
      {
        id: 'where-this-leaves-me',
        heading: 'Where this leaves me',
        blocks: [
          P('This project represents the way I like to design: start from a real, specific, almost embarrassing human moment (checking your balance and still getting surprised), follow it all the way down to the ethical edge cases nobody wants to think about, and land on interface decisions that respect the person on the other end of the screen.'),
          P('Whether this exact concept ever gets built is honestly beside the point. The muscle I trained here, holding "helpful" and "respectful of autonomy" in the same hand without letting go of either, is the one I bring to every project since.'),
        ],
      },
    ],
  },
  {
    hasIndex: true,
    slug: 'pulso',
    companyLabel: '',
    title: 'Pulso: Unlocking Health Access',
    status: 'Startup project',
    meta: [
      { label: 'Role', value: 'UX Designer & Co-Founder' },
      { label: 'Timeline', value: '2025' },
      { label: 'Team with', value: 'Santiago Villarreal, Viridiana González and Brenda Sánchez' },
      { label: 'Skills', value: 'Strategic Product Design, UX' },
    ],
    toc: [
      { id: 'meta', label: 'Meta Data' },
      { id: 'the-moment', label: 'The moment that started everything' },
      { id: 'wrong-place', label: 'Why the counter was the wrong place to ask' },
      { id: 'whatsapp-signup', label: 'Why WhatsApp carried the whole signup' },
      { id: 'the-wait', label: 'Building in a wait nobody technically needed' },
      { id: 'trust-out-loud', label: 'Trust had to be said out loud' },
      { id: 'open-questions', label: "Open questions I'm still working through" },
      { id: 'where-it-stands', label: 'Where this project stands' },
    ],
    sections: [
      {
        id: 'the-moment',
        heading: 'The moment that started everything',
        blocks: [
          VIDEO('/pulso-video-1.mp4', 'center 20%'),
          P('A patient walks into a private clinic in Mexico needing treatment. The clinic can help them. They walk back out anyway, because the cost has to be paid upfront and there is no fast, low friction way to cover it in that moment. A large share of healthcare spending in Mexico comes directly out of people\'s pockets, and traditional credit rarely reaches the people this hits hardest. Most don\'t have a credit card, and even when a bank approves a loan, the process is too slow for a decision that often needs to happen the same day, in a clinic waiting room.'),
          P('Pulso was our answer to that gap. It started inside Guros: my boss there invited me and two other colleagues to build it with him, and the four of us became cofounders. Together we set out to build a financing product connecting clinics, lenders and patients through a fast, low risk application flow, so people could access medical procedures they could not otherwise afford in the moment.'),
          P("I was the UX designer and a cofounder, responsible for the full patient facing experience: how someone discovers Pulso inside a clinic, how they apply, how the system recognizes them if they come back, and how all of this holds together across channels. The business model, the lender partnerships and the credit logic were shaped together as a team, but the interaction design, the flow architecture and the decisions about reducing friction for this specific user were mine to define."),
          P("The person we were designing for earns one to two minimum wages, usually without a credit card and without much history with formal banking. Many are not frequent smartphone users beyond messaging apps like WhatsApp, and digital forms, uploading documents or navigating an app are not things they do often or comfortably. Every decision below was shaped around that person."),
        ],
      },
      {
        id: 'wrong-place',
        heading: 'Why the counter was the wrong place to ask',
        blocks: [
          VIDEO('/pulso-video-2.mp4', 'center 20%'),
          COLS(
            [
              "Someone sitting at a clinic reception, with other patients waiting behind them and a receptionist watching, is not in a comfortable position to apply for credit. That setting works against the product before the product even gets a chance. Digging through a bag to find an ID, or taking a liveness check selfie in front of strangers, adds a layer of social anxiety on top of an already stressful health situation. That discomfort quietly kills conversion, even when the offer itself is a good one.",
              'This reframed the whole problem for me. The application couldn\'t happen at the counter. It had to travel home with the patient, at their own pace, without an audience. So I designed the "Exit Kit," a simple physical takeaway, a small printed card or leaflet, that the patient leaves the clinic with. It carries two ways back into the process: a short four digit alphanumeric code, easy to read or type later, and a QR code that already has the clinic\'s reference embedded, so scanning it drops the patient straight into the right flow without having to remember or search for anything.',
            ],
            [
              "As the concept matured, I pushed this further. Instead of relying on a patient to keep a physical card safe, the clinic can send a pre linked application directly to the patient's WhatsApp number. That link is already tied to the clinic, so the moment the patient opens it at home, in their own time, they continue exactly where the relationship started. Once they finish, the clinic gets notified automatically of the approval or rejection, so they can move straight into scheduling the appointment. I also kept the four digit code and QR system as a fallback, for clinics that are less digitally equipped and may not be able to send a message automatically.",
              'Designing for the patient only works if you also design for the reality of the clinic sending them there. The application moved from the counter to the home, and that single shift is what the rest of the product had to support.',
            ]
          ),
        ],
      },
      {
        id: 'whatsapp-signup',
        heading: 'Why WhatsApp carried the whole signup',
        blocks: [
          P("For this audience, a traditional email and password signup adds unnecessary weight it doesn't need to carry. The right channel had to be one people already trusted and already had open. I chose WhatsApp for verification because it is close to universal in Mexico: INEGI's 2025 household survey on internet use puts penetration above 90% among the country's internet users, well ahead of any other messaging platform. Most people already have it open and know how to use it, unlike a dedicated app they would need to download and learn."),
          P("I designed registration around the phone number as the identifier, verified once through a WhatsApp one time code. If someone drops off mid application, we still have their contact and can bring them back through WhatsApp instead of losing them entirely. The application itself splits into two paths. A new user goes through registration, clinic identification, choosing an amount and payment plan, and then identity verification, in that order, so the person sees the benefit, how much, how many payments, before being asked for anything sensitive. A returning user gets a much shorter path: phone plus OTP, clinic code, treatment cost, and a quick confirmation that their address and income are still accurate. Because they already have a payment history, approval can come back in minutes instead of hours."),
          P('Every screen in the form asks only one question at a time, and numeric fields automatically bring up the number keyboard instead of the full keyboard. Small details, but they matter for users who are not necessarily comfortable navigating digital forms. The whole signup was built to ask as little as possible, as late as possible.'),
        ],
      },
      {
        id: 'the-wait',
        heading: 'Building in a wait nobody technically needed',
        blocks: [
          VIDEO('/pulso-video-3.mp4', 'center 20%'),
          P("The actual credit review can take just seconds or minutes. I still designed a 24 hour approval window on top of it, on purpose. The theory behind it: if the approval feels like the result of a careful review rather than an instant decision, people may value it more and take their payments more seriously. An answer that comes back too fast can read as careless, even when it's accurate."),
          P('I designed the copy around that waiting period to reinforce this, with language closer to "we\'re reviewing your case carefully to get you the best possible rate," and a follow up message during the wait so the user doesn\'t feel forgotten. This is still a hypothesis I want to test, and the theory is what shaped the decision to keep the wait rather than remove it.'),
        ],
      },
      {
        id: 'trust-out-loud',
        heading: 'Trust had to be said out loud',
        blocks: [
          P("A returning user with a good payment history already represents lower risk. I didn't want the system to just apply that quietly in the background. I wanted it to tell the person."),
          P("If someone shows renewed interest in applying again, WhatsApp can let them know they are likely to qualify faster this time. The same idea shows up right after a successful application, on the thank you screen, where a returning user with good history sees a note about their improved standing, along with a simple button to receive more information by WhatsApp if they want it. It's an opt in way of keeping the relationship open, rather than pushing messages at someone who didn't ask for them. Trust, once earned, became something the product said back to the user instead of something it just quietly counted."),
        ],
      },
      {
        id: 'open-questions',
        heading: "Open questions I'm still working through",
        blocks: [
          P("Pulso is still a concept in progress, and there are a few design questions I don't consider closed yet."),
          GRID2([
            QITEM('Channel architecture', [
              "We debated whether Pulso needed a native mobile app at all. Given how infrequently most patients would use it, a handful of times a year at most, and the lower digital fluency of the target segment, I'm currently leaning toward no app:",
              'WhatsApp as the channel for notifications, status updates and quick questions, and a lightweight web flow, opened through a link or QR with no install required, for the actual application steps that need photo capture and forms.',
            ]),
            QITEM("What happens if the patient can't use their phone", [
              'Most of this flow assumes the patient themselves can hold their phone, receive an OTP, and respond on WhatsApp. But what happens if the person the treatment is for is too unwell to do any of that, or if the application is really being made by a family member on someone else\'s behalf?',
              "I haven't settled this yet, and I think it deserves real attention rather than a quick fix.",
            ]),
            QITEM('The moment of rejection', [
              "Everything I've designed so far covers the path where the application goes well. I haven't yet designed how a rejection should feel, which matters more here than in most products, because the person being told no is often someone who still needs the treatment.",
              'One option I am considering is pointing the person toward other places where they could still apply for financing, rather than leaving them at a dead end.',
            ]),
            QITEM('A missed payment', [
              "In a similar way, I've thought through the approval side of trust, but not yet the moment where someone falls behind. Getting that tone right, especially if the reason behind a late payment might be that someone's health took a turn for the worse, is still ahead of me.",
            ]),
          ]),
        ],
      },
      {
        id: 'where-it-stands',
        heading: 'Where this project stands',
        blocks: [
          P('Pulso as a company is currently paused. A large partnership opportunity came up that needed our full time attention elsewhere, and the three of us moved on to that. But the problem stayed with me, and I keep iterating on the concept in my own time, refining the flow and thinking through the open questions above. This case study reflects that ongoing thinking rather than a finished, shipped product.'),
        ],
      },
    ],
  },
  {
    hasIndex: true,
    slug: 'axa',
    companyLabel: 'AXA mexico auto insurance',
    title: 'Scaling Enterprise Sales',
    status: 'In process to ship',
    meta: [
      { label: 'Role', value: 'Lead Product Designer' },
      { label: 'Timeline', value: 'Half 2026 till Q1 2027' },
      { label: 'Team with', value: 'Architect, Product Owner, Engineering Manager, 3 Product Designers, 2 BackDevs and 1 FrontDev' },
      { label: 'Skills', value: 'Systems thinking, Cross-functional Leadership, Lifecycle design, Prototyping with AI' },
    ],
    toc: [
      { id: 'meta', label: 'Meta data' },
      { id: 'storefront', label: 'A storefront that almost nobody walks through' },
      { id: 'phone-calls', label: 'What the phone calls were really saying' },
      { id: 'system-behind', label: 'The system behind the storefront' },
      { id: 'what-this-proves', label: 'What this proves' },
    ],
    sections: [
      {
        id: 'storefront',
        heading: 'A storefront that almost nobody walks through',
        blocks: [
          IMG('A way to represent omnichanelty', 'axa-omnichannel'),
          P("AXA is one of Mexico's top 3 auto insurers, and individual auto is the only product it sells online. People show up every day: they open the site, request a quote, look around. Then almost all of them buy the old way, on the phone, with an agent walking them through it step by step."),
          P('The easy fix is a better storefront: a cleaner checkout, clearer trust signals, a nicer quote screen. But the real pattern lives somewhere else. Someone can\'t find their own car in the search. A payment stalls. A tab gets closed halfway through. They vanish, with no record and no way back. That vanishing moment, more than the storefront, was the real thing to design for.'),
        ],
      },
      {
        id: 'phone-calls',
        heading: 'What the phone calls were really saying',
        blocks: [
          P("As Design Lead, I didn't start from a redesign brief. I started by asking why demand and conversion didn't match: quote requests were healthy, purchases weren't, and the two should have moved together if the gap were really about UI polish."),
          P('The pattern that explained it lived in the handoff between channels. Insurance is a trust-heavy purchase, and the moment a customer\'s path online broke, even briefly, they reverted to the one channel they already trusted: a human on the phone. A fix that stayed inside the website would only ever help people who never hit a snag. The people actually worth designing for were the ones who did.'),
          P("That reframing is what I took into the room with AXA's architect, product owner and tech lead: how do we build a system that can lose nobody, even when the website can't finish the job alone?"),
        ],
      },
      {
        id: 'system-behind',
        heading: 'The system behind the storefront',
        blocks: [
          P('The brief grew into three connected products: the e-commerce site where a customer finds their car, compares coverage and pays; the BackOffice the Contact Center uses to pick up a customer right where they left off; and a Dashboard where AXA can see how the whole channel performs, end to end. A few decisions carried the reframing all the way to the screen:'),
          ROWS([
            RITEM('The Quote Manager', 'Was built to feel like a real decision someone is making, in plain language instead of legal text. Packages are ordered so comparing them takes less effort, and personalization sits visually secondary, there for the customer who wants it, without competing with the easy choice.', 'Space for a Quote Manager screenshot', 'quote-manager-demo'),
            RITEM('Lead scoring at every drop-off', 'Leaving the quote screen, abandoning at checkout, a failed payment: each one creates a lead in the BackOffice, rated on a five-star scale by how close the customer got to buying. The Contact Center stops guessing who to call first.', 'Space for a screenshot of a dropped flow handed to an agent on WhatsApp', 'backoffice-whatsapp-demo'),
            RITEM('A step-by-step response to failure', 'A brief hiccup retries quietly and the customer never notices. A longer one surfaces a clear message, and saves exactly where the customer was: plan, data, progress, so an agent can continue the conversation with no repeated questions.', 'Space for a real-time error detection screenshot', 'failure-response-demo'),
            RITEM('The full policy lifecycle', 'Renewals, installments, failed payments and cancellations all follow the same pattern: automated attempts first, then a smooth handoff to a person when it\'s needed.', 'Space for a screenshot of the automated full policy cycle', 'lifecycle-demo'),
            RITEM('The Dashboard', 'Pulls data from both products so different teams, from a Contact Center supervisor to someone tracking overall performance, each see where in the funnel people are lost, without having to interpret numbers that were never meant for them.', 'Space for a dashboard screenshot, zoomed from the full view into the metric cards', 'dashboard-demo'),
          ]),
        ],
      },
      {
        id: 'what-this-proves',
        heading: 'What this proves',
        blocks: [
          P('A conversion problem is rarely a UI problem. This gap wasn\'t going to close with a nicer button, it closed by designing for everyone the button failed.'),
          P('Omnichannel is not a buzzword when it means an agent never has to ask "can you repeat that." It is a design commitment that shows up in every screen and every handoff.'),
          P('Designing a lifecycle, not just a funnel, changes what "done" looks like. A sale is not the finish line. Renewal, a smooth cancellation, and a fair endorsement process are part of the same product.'),
          P('Scoring and prioritization are design decisions, not just backend logic. Deciding what makes a lead worth calling first is a judgment call about the business, made visible through design.'),
          P('Design leadership at this scale means proposing and defending solutions in front of a large enterprise client, not just handing off files. Being in the room, walking AXA through the reasoning behind a flow, is part of the job, not a side effect of it.'),
        ],
      },
    ],
  },
  {
    hasIndex: true,
    slug: 'victorai',
    companyLabel: 'Ai assistant for my portfolio',
    title: "VictorAI: When I'm not in the room, my portfolio still answers",
    status: 'Shipped & live',
    meta: [
      { label: 'Role', value: 'Owner' },
      { label: 'Timeline', value: 'Free time in 2026' },
      { label: 'Skills', value: 'UX Copy, Frontend Design, Research Synthesis' },
    ],
    toc: [
      { id: 'meta', label: 'Meta data' },
      { id: 'silence-problem', label: 'The silence problem' },
      { id: 'giving-voice', label: 'Giving it a voice' },
      { id: 'giving-voice-2', label: 'Teaching it where to stop' },
      { id: 'designing-conversation', label: 'Designing the conversation' },
      { id: 'boring-decisions', label: 'The boring decisions that kept it safe' },
      { id: 'takeaway', label: 'The takeaway' },
    ],
    sections: [
      {
        id: 'silence-problem',
        heading: 'The silence problem',
        blocks: [
          IMG("hello, I'm VictorAI", 'victorai-intro'),
          P("Someone lands on my portfolio and gets curious about a project. They read the Mapfre case study, get hooked on the jump from 56% to 97% search success, and want to know more. What was the first idea that did not work? There is no one there to ask. A portfolio tells its story once and stops. The visitor either accepts the silence and moves on, or closes the tab with a half formed question still stuck in their head."),
          P("Every one of those questions is a small leak in the only thing a portfolio is actually for: turning curiosity into a conversation. Multiply that across every visitor, and the loss adds up quietly, with nobody noticing it happen. So I built something that could stay in the room after I leave it. The starting question was a product one: what does someone actually need when I am not there to answer."),
        ],
      },
      {
        id: 'giving-voice',
        heading: '',
        blocks: [
          TWIN(
            'Giving it a voice',
            [
              "The easy version of this project was a FAQ bot. Flat, safe, forgettable. I wanted it to sound like a coworker who genuinely respects me. So before writing a line of code, I wrote an actual voice guide: warm but not gushing, proud but not inflated, honest when something was genuinely hard.",
              'There is one rule here worth calling out. The bot is banned from saying "thanks to her brilliance" or any other pedestal language close to it. It describes what I did and what happened next the same way you would talk about a colleague you respect, cause and effect, nothing dramatic. It also follows the rule I use when I tell these stories out loud. If there is a number that grabs attention right away, like a 72% jump in search success at Mapfre, that goes first. If there is not one, it leads with the human problem and builds up to the result.',
              "And when something genuinely did not go well, like the open questions Pulso still has not answered, or the fact that my first instinct on the Mapfre problem turned out wrong, the bot says so. Hiding the hard parts would only make the whole thing less believable.",
            ],
            'Teaching it where to stop',
            [
              'Open the door to any topic and visitors will walk through all of them. Some ask it to write code, settle an argument, forget its own instructions, or try to bait it into saying something unkind about me, just to see what happens.',
              'So before deciding what it should say, I spent just as much time deciding what it is not allowed to touch. It only talks about my work, my background, and my career. Anything else gets a friendly redirect, even when it is mixed into an otherwise normal question. It never invents a fact, a metric, or a quote. If it does not know something, it says so and points to my email instead of guessing.',
              'The trickiest rule was what happens when someone fishes for something negative. Flatly refusing sounds defensive, like the bot is hiding something. So if there is something real and honest to point to, like a project that is still unsolved, the answer goes there. If the question has no real basis at all, it redirects warmly instead of pretending it cannot answer. Either way, it never says "I\'m not allowed to say that." That reads as censorship and breaks the illusion that you are talking about a real person.',
            ]
          ),
        ],
      },
      {
        id: 'designing-conversation',
        heading: 'Designing the conversation',
        blocks: [
          P('A blank chat box is intimidating. Most people will not type the first question. They will stare at it and leave. So the landing screen offers three doors instead of a blank page: one metric hook, one about how I lead a team, one about who I am outside of work. Whichever one someone picks already says a lot about what they came here for.'),
          P('From there, every topic has a pool of six follow up questions, shown three at a time. Click one and it is marked as seen, so the conversation never repeats itself. In every set of three, one question deliberately opens a door into a different project, so a chat about one case study can wander into leadership, or into a completely different story, without the visitor having to think of what to ask next.'),
          P('Project links follow one small rule: share it once someone shows real interest, never repeat it unprompted in the same conversation. Mentioning it every message would feel like a pop-up ad. Mentioning it once, right when curiosity peaks, feels like a recommendation.'),
        ],
      },
      {
        id: 'boring-decisions',
        heading: 'The boring decisions that kept it safe',
        blocks: [
          P('None of this was my usual territory. My day to day is product flows. Learning enough Supabase to make these two decisions on purpose, instead of leaving them to chance, was its own small leap outside what I normally do. Not every decision here makes a good story. Some are just the difference between a project that survives real visitors and one that quietly breaks or gets abused.'),
          GRID2([
            QITEM('Decision', ['A 25 message daily cap per visitor, with a warm "keep talking by email" message instead of a hard stop.']),
            QITEM('Why', ['Keeps the cost predictable without ever making someone feel cut off.']),
            QITEM('Decision', ['The secret backend key never touches the browser, only a public, safe to expose key does.']),
            QITEM('Why', ['One leaked key in frontend code would have handed over the whole database.']),
          ]),
        ],
      },
      {
        id: 'takeaway',
        heading: 'The takeaway',
        blocks: [
          P('One more thing worth saying. Writing the content for it turned into time alone with myself, really seeing what I have grown into these past few years, and being honest about what I still want to learn.'),
          P('A chatbot sounds like a gimmick until you notice what it actually takes: a voice that sounds like someone who knows me well, real boundaries, a sense of when to stay quiet, and a plan for the moment it breaks.'),
          P('That is the same list I would use to describe good product design, with or without AI in the room. The chatbot just happens to be the one project where I get to prove it while I am asleep.'),
        ],
      },
    ],
  },
  {
    hasIndex: true,
    slug: 'onu-pnud',
    companyLabel: 'United Nations (UNDP) Mexico Challenge',
    title: 'Inclusive finance architecture: ONU Mexico',
    status: '2nd place award concept project',
    meta: [
      { label: 'Role', value: 'Lead Product Designer' },
      { label: 'Timeline', value: 'Q2 2025' },
      { label: 'Team with', value: 'Account Manager and 1 Product Designer' },
      { label: 'Skills', value: 'User research, Service design, Systems architecture' },
    ],
    toc: [
      { id: 'meta', label: 'Meta data' },
      { id: 'insurance-exists', label: "Insurance already exists, but it wasn't built for her" },
      { id: 'habit-already-had', label: 'We built around a habit she already had' },
      { id: 'architecture-behind', label: 'The architecture behind the folder, the key and the card' },
      { id: 'what-this-taught', label: 'What this taught me as a designer' },
    ],
    sections: [
      {
        id: 'insurance-exists',
        heading: "Insurance already exists, but it wasn't built for her",
        blocks: [
          IMG('A way to represent the project', 'undp-kit'),
          P('Every week, thousands of women across rural Mexico walk into their nearest microfinance lender to make the payment that keeps their business alive: a market stall, a taco stand, a home sewing shop. Then she gets sick, or pregnant, or her mother needs care. The business stops, and so does the income. The bills keep coming, so she borrows more just to cover the gap her business used to fill.'),
          P("Insurance already exists for exactly these risks: maternity, illness, job loss, death. But it was built for someone else, someone with paperwork to hand over, a claims office nearby, and a fixed paycheck that lines up with a fixed monthly premium. Her income arrives in small, irregular amounts, week by week, and nobody had designed a policy that could move at that same rhythm. She had simply never been invited in."),
        ],
      },
      {
        id: 'habit-already-had',
        heading: 'We built around a habit she already had',
        blocks: [
          P('Every fintech project like this reaches the same fork: build a sleek app, or build around the person already standing in front of you. We chose the second path, and the reasoning came straight from who we were designing for.'),
          P("Most of these women were simply unfamiliar with an app they had never heard of. They had no home internet to open it with and no nearby hospital to make the promise feel real. Asking her to adopt a brand new habit was asking for trust she had no reason yet to give. So we looked for the habit she already had: her weekly walk to the microfinance lender to make her loan payment. That single observation shaped everything that came after it."),
        ],
      },
      {
        id: 'architecture-behind',
        heading: 'The architecture behind the folder, the key and the card',
        blocks: [
          P("The real work here lived in the full flow of how trust moves from a person to a product: how a habit becomes an onboarding moment, how a shared data connection with the lender's system replaces a signup form, how a physical key replaces a password, how a claim gets resolved through people who already know her. We mapped every one of those decision points with engineering before a single screen got designed."),
          GRID2(
            [
              QITEM('Offered where trust already lives', ["The same counter where she pays her loan, the same person she already knows, offers the coverage the same day, using information the lender already has on file."]),
              QITEM("Priced to disappear into a payment she's already making", ['Under $3 USD a week, folded into her existing installment, so it never shows up as a new bill to track.']),
              QITEM('Made physical, in three pieces', ['A durable pink folder that keeps every document safe at home. A personal key that works like a login and pulls up her policy to start a claim. A pocket card with emergency numbers, always within reach in their wallet.']),
              QITEM('Claimable through people', ['When something goes wrong, she walks to the corner store or counter she already trusts, and someone she knows helps her file the report.']),
            ],
            { matchHeight: true }
          ),
          IMGROW([
            { caption: 'An illustration of the laminated pink folder', src: '/undp-folder.png' },
            { caption: "The folder's sticker with a QR code and an 8-digit code", src: '/undp-sticker.png' },
            { caption: 'The pink wallet card with emergency numbers and instructions', src: '/undp-wallet-card.png' },
          ]),
          P('We took the finished architecture to the UNDP offices in Mexico City, competing against other teams for the mandate to bring financial protection to women entrepreneurs who had been left out of it. We placed second, which is the closest thing we have to a metric so far, and it tells us the reasoning held up under real pressure.'),
        ],
      },
      {
        id: 'what-this-taught',
        heading: 'What this taught me as a designer',
        blocks: [
          P('Trust is something you design with, not a feature you add at the end. The channel we chose mattered more than any interface we could have built.'),
          P('The best onboarding is one nobody notices. Hers already existed, we just built inside it.'),
          P('Designing a lifecycle, not just a funnel, changes what "done" looks like. A sale is not the finish line. Renewal, a smooth cancellation, and a fair endorsement process are part of the same product.'),
          P('Designing for someone offline still means designing a system, it just runs through people instead of screens.'),
        ],
      },
    ],
  },
];

// ---- Derived view-model helpers (ported from renderVals()) ----
export const DEMO_FLAG_BY_ID = {
  'calendar-loop': 'isCalendarLoopDemo',
  'show-math': 'isShowMathDemo',
  'netflix-learn': 'isNetflixLearnDemo',
};

export function annotateDemoFlags(b) {
  const flagKey = b.isImage ? DEMO_FLAG_BY_ID[b.demoId] : null;
  return {
    ...b,
    isCalendarLoopDemo: flagKey === 'isCalendarLoopDemo',
    isShowMathDemo: flagKey === 'isShowMathDemo',
    isNetflixLearnDemo: flagKey === 'isNetflixLearnDemo',
    isPlainImage: !!b.isImage && !flagKey,
  };
}

// A generic-layout project can opt into the same left-rail section index and
// Role/Timeline/Team/Skills meta grid Mapfre uses (hasIndex), without
// picking up Mapfre's bespoke funnel-hero/before-after box -- that part
// stays exclusive to the Mapfre layout.
export function computeGenericSections(current) {
  return current.sections.map((s, si) => {
    const textBlocks = s.blocks.filter((b) => b.isP || b.isLead || b.isRich).length;
    const specialBlocks = s.blocks.filter((b) => b.isQuote || b.isImage || b.isList).length;
    const useColumns = textBlocks >= 4 && specialBlocks === 0;
    const hasLeadImage = s.blocks.length > 0 && s.blocks[0].isImage;
    const workingBlocks = hasLeadImage ? s.blocks.slice(1) : s.blocks;

    let trailingImgCount = 0;
    for (let i = workingBlocks.length - 1; i >= 0 && workingBlocks[i].isImage; i--) trailingImgCount++;
    const hasSideImages = trailingImgCount >= 2;
    const rawSideImages = hasSideImages ? workingBlocks.slice(workingBlocks.length - trailingImgCount) : [];
    const bodyBlocks = hasSideImages ? workingBlocks.slice(0, workingBlocks.length - trailingImgCount) : workingBlocks;

    const leadImageIsExpenseDemo = hasLeadImage && s.blocks[0].demoId === 'expense-entry';
    const leadImageIsAxoDemo = hasLeadImage && s.blocks[0].demoId === 'axa-omnichannel';
    const leadImageIsVictorDemo = hasLeadImage && s.blocks[0].demoId === 'victorai-intro';
    const leadImageIsVideo = hasLeadImage && !!s.blocks[0].isVideo;
    const leadImageIsUndpDemo = hasLeadImage && s.blocks[0].demoId === 'undp-kit';

    return {
      id: s.id || '',
      heading: s.heading,
      num: String(si + 1).padStart(2, '0'),
      hasLeadImage,
      leadImage: hasLeadImage ? s.blocks[0] : null,
      leadImageIsExpenseDemo,
      leadImageIsAxoDemo,
      leadImageIsVictorDemo,
      leadImageIsVideo,
      leadImageIsUndpDemo,
      leadImageIsPlain:
        hasLeadImage &&
        !s.blocks[0].isVideo &&
        s.blocks[0].demoId !== 'expense-entry' &&
        s.blocks[0].demoId !== 'axa-omnichannel' &&
        s.blocks[0].demoId !== 'victorai-intro' &&
        s.blocks[0].demoId !== 'undp-kit',
      showStandardHeading: !leadImageIsExpenseDemo && !hasSideImages && !!s.heading,
      blocks: bodyBlocks.map(annotateDemoFlags),
      hasSideImages,
      isPlainBody: !hasSideImages && !leadImageIsExpenseDemo,
      sideImages: rawSideImages.map(annotateDemoFlags),
      sectionClass: useColumns ? 'is-columns' : '',
    };
  });
}

// ============================================================================
// Component
// ============================================================================

export default function ProyectosDesktop() {
  return (
    <VictorAIChatProvider topics={TOPICS} starters={STARTERS}>
      <ProyectosDesktopInner />
    </VictorAIChatProvider>
  );
}

function ProyectosDesktopInner() {
  const chat = useChatContext();

  const [activeProject, setActiveProject] = useState(0);
  const [activeMapfreSection, setActiveMapfreSection] = useState('meta');
  const [funnelMode, setFunnelModeState] = useState('auto');
  const [funnelJustSwitched, setFunnelJustSwitched] = useState(false);
  const [deckPhase, setDeckPhase] = useState(null);
  const [deckDir, setDeckDir] = useState(null);
  const [deckTargetIdx, setDeckTargetIdx] = useState(null);
  const [phantomDay, setPhantomDay] = useState(null);
  const [phantomAmount, setPhantomAmount] = useState('');
  const [phantomCalculating, setPhantomCalculating] = useState(false);
  const [phantomResult, setPhantomResult] = useState(null);
  const [phantomMathOpen, setPhantomMathOpen] = useState(false);
  const [phantomTypeIdx, setPhantomTypeIdx] = useState(0);
  const [phantomTypeLen, setPhantomTypeLen] = useState(0);
  const [phantomTypeDir, setPhantomTypeDir] = useState('type');

  // ---- timers & mutable bits that don't drive rendering themselves ----
  const phantomCalcTimerRef = useRef(null);
  const phantomTypeTimerRef = useRef(null);
  const funnelIntroTimerRef = useRef(null);
  const funnelJustSwitchedTRef = useRef(null);
  const funnelSwitchTimerRef = useRef(null);
  const deckT1Ref = useRef(null);
  const deckT2Ref = useRef(null);
  const arriveFailsafeTRef = useRef(null);
  const tocScrollLockTRef = useRef(null);
  const tocScrollLockRef = useRef(null);
  const deckBusyRef = useRef(false);
  const xFsRef = useRef(null);
  const coverRef = useRef(null);
  const bcRef = useRef(null);
  const arriveRef = useRef(null);

  // Arriving from the landing through the card transition. The `arrive`
  // class itself is set (or not) by the beforeInteractive script in
  // app/layout.js, synchronously before the browser's first paint -- not
  // here. This just reads that already-settled state once, on the client,
  // so the rest of this component knows whether to arm the failsafe
  // cleanup below. See app/layout.js's ARRIVE_FLAG_SCRIPT comment for why
  // it can't be set from component render (too late, after first paint).
  if (arriveRef.current === null && typeof window !== 'undefined') {
    arriveRef.current = document.documentElement.classList.contains('arrive');
  }

  // Auto-play the before state briefly, then settle on after (where the
  // manual tab takes over) -- unless the viewer has already picked a side
  // themselves. funnelJustSwitched flags this one moment so the number/
  // sold-tag can play their "something changed" pop once: both for this
  // auto hand-off and for a manual tab click that lands on after, since
  // that's the moment worth celebrating.
  useEffect(() => {
    funnelIntroTimerRef.current = setTimeout(() => {
      setFunnelModeState((m) => {
        if (m !== 'auto') return m;
        funnelJustSwitchedTRef.current = setTimeout(() => setFunnelJustSwitched(false), 1500);
        setFunnelJustSwitched(true);
        return 'after';
      });
    }, 4000);
    return () => clearTimeout(funnelIntroTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drives the decorative "ask the AI" search-bar typewriter: type a sample
  // question out one character at a time, hold, delete it, then move on to
  // the next sample in PHANTOM_PROMPTS and repeat forever. This never reads
  // or affects the real expense-entry demo state below.
  useEffect(() => {
    function tick() {
      setPhantomTypeLen((prevLen) => {
        setPhantomTypeDir((prevDir) => {
          setPhantomTypeIdx((prevIdx) => {
            const phrase = PHANTOM_PROMPTS[prevIdx % PHANTOM_PROMPTS.length];
            let nextLen = prevLen;
            let nextDir = prevDir;
            let nextIdx = prevIdx;
            let delay = 38;
            if (prevDir === 'type') {
              nextLen = prevLen + 1;
              if (nextLen >= phrase.length) {
                nextDir = 'pause';
                delay = 1700;
              }
            } else if (prevDir === 'pause') {
              nextDir = 'delete';
              delay = 450;
            } else {
              nextLen = prevLen - 1;
              delay = 22;
              if (nextLen <= 0) {
                nextDir = 'type';
                nextIdx = prevIdx + 1;
                delay = 350;
              }
            }
            setPhantomTypeLen(nextLen);
            setPhantomTypeDir(nextDir);
            phantomTypeTimerRef.current = setTimeout(tick, delay);
            return nextIdx;
          });
          return prevDir;
        });
        return prevLen;
      });
    }
    phantomTypeTimerRef.current = setTimeout(tick, 38);
    return () => clearTimeout(phantomTypeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arriving from a specific card on the Home carousel passes its index (or
  // slug) as a hash, e.g. /proyectos#3 or /proyectos#mapfre. Shared by the
  // mount check below and by the hashchange/popstate listeners -- see the
  // "URL/hash sync" note further down for why those are needed.
  function resolveIndexFromHash() {
    const n = PILL_LABELS.length;
    const raw = window.location && window.location.hash ? window.location.hash.replace('#', '') : '';
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < n) return parsed;
    if (raw) {
      const slugIdx = PROJECTS.findIndex((p) => p.slug === raw);
      if (slugIdx >= 0) return slugIdx;
    }
    return null;
  }

  useEffect(() => {
    const n = PILL_LABELS.length;
    const idx = resolveIndexFromHash();
    if (idx !== null) setActiveProject(idx);

    try {
      bcRef.current = new BroadcastChannel('vic-xt-desktop');
      bcRef.current.onmessage = (ev) => {
        const d = ev.data || {};
        if (d.type !== 'open') return;
        const idx = d.idx >= 0 && d.idx < n ? d.idx : 0;
        setActiveProject(idx);
        setActiveMapfreSection('meta');
        const sc = document.querySelector('.proj-card-scroll');
        if (sc) sc.scrollTop = 0;
        xArrive(idx);
      };
    } catch (err) {
      /* ignore */
    }

    if (arriveRef.current) {
      arriveFailsafeTRef.current = setTimeout(() => {
        document.documentElement.classList.remove('arrive');
        const cov = coverRef.current;
        if (cov && cov.parentNode) cov.parentNode.removeChild(cov);
      }, 1400);
    }

    // Bug fix: a chatbot reply (or anything else) that links to
    // /proyectos#slug while the visitor is ALREADY on /proyectos is a
    // same-document hash navigation -- the browser never reloads the page,
    // so the mount-only hash read above never re-runs, and the click
    // silently does nothing ("no me redirige a esa sección"). `hashchange`
    // catches that case. `popstate` catches the browser back/forward
    // buttons moving between the per-project history entries the sync
    // effect below now pushes (see its own comment) -- without this, back
    // changes the URL's hash but leaves the visible card exactly where it
    // was, which reads as back doing nothing/jumping too far.
    function onHashOrPop() {
      const i = resolveIndexFromHash();
      if (i !== null) setActiveProject(i);
    }
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);

    return () => {
      try {
        if (bcRef.current) bcRef.current.close();
      } catch (err) {
        /* ignore */
      }
      clearTimeout(arriveFailsafeTRef.current);
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL/hash sync: keep the address bar's hash matching whichever project
  // is currently open, for ANY reason it changed (pill click, prev/next,
  // side-card click, the broadcast-channel message, or the hashchange/
  // popstate listeners above resolving a new hash into state). This is the
  // single place that writes the hash, so every path that can change
  // activeProject gets URL sync for free without touching the deck-slide
  // timers in runDeckTransition.
  //   - Fixes bug #1 for the OTHER direction too: without this, no project
  //     switch ever changed the hash in the first place, so a copied/shared
  //     /proyectos#slug link from the chatbot could point at a project the
  //     visitor had already navigated away from by the time they clicked it.
  //   - Fixes "back button exits the site instead of going to the previous
  //     project": pushState gives each project view its own history entry,
  //     so Back steps backward through the projects actually viewed (then
  //     out to Home) instead of having nothing to go back to RIGHT AWAY.
  //   - pushState (not `location.hash =`) deliberately does not fire
  //     `hashchange` or try to scroll to an element with that id (there
  //     isn't one -- this is a JS-driven deck, not real in-page anchors),
  //     so it can't loop with the listener above.
  //   - Guarded by comparing to the current hash so it never double-pushes
  //     when the change that triggered this effect ALREADY came from the
  //     URL (hashchange/popstate resolving into the same hash).
  //   - Skips its very first run after mount: the hash-reading effect above
  //     runs in that same initial commit and, if the hash named a project
  //     other than index 0, calls setActiveProject AFTER this effect has
  //     already read the old (0) value for that render -- so without this
  //     guard, a direct link straight to e.g. /proyectos#pulso would
  //     momentarily push '#mapfre' (the stale default) before correcting
  //     itself to '#pulso' on the next render, leaving a spurious extra
  //     entry in history. The real arrival hash is already in the URL on
  //     first load, so there's nothing to sync on that first run anyway.
  const skipFirstHashSyncRef = useRef(true);
  useEffect(() => {
    if (skipFirstHashSyncRef.current) {
      skipFirstHashSyncRef.current = false;
      return;
    }
    const proj = PROJECTS[activeProject];
    if (!proj || !proj.slug) return;
    const newHash = '#' + proj.slug;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [activeProject]);

  // Cross-page nav transition from a plain navbar click (see About's
  // matching effect for the full reasoning). is-pending-enter is
  // unconditional in the JSX below and resolved here via useLayoutEffect
  // (not useEffect): this component is server-rendered and
  // sessionStorage doesn't exist on the server, so a flag computed
  // conditionally during render is necessarily wrong on the server's HTML
  // for any real nav arrival, producing a visible-then-invisible-then-
  // fade-in stutter once hydration catches up -- worse the heavier this
  // component's hydration is, which is why this page in particular read
  // as "entra de golpe". useLayoutEffect runs synchronously before the
  // browser paints the hydrated tree, so the class is corrected either
  // way before anything is shown.
  useLayoutEffect(() => {
    const page = document.querySelector('[data-page]');
    const arriving = consumeEnterFlag();
    if (page) page.classList.remove('is-pending-enter');
    if (arriving) playEnterContentFade();
  }, []);

  // Scales the fixed 1440x888 design (.x-stage) to fit whatever real
  // viewport this ends up in, so the page always fits without a page
  // scrollbar, however tall or short that viewport is. Capped at 1.25x.
  //
  // useLayoutEffect, not useEffect: the CSS fallback (`.x-stage`'s static
  // width/no-transform-scale, see proyectos.css) renders unscaled before
  // any JS runs, so with useEffect there was a guaranteed real paint at
  // that unscaled size -- then, once this effect's synchronous `apply()`
  // call below ran (an instant later, but still a separate paint), the
  // stage visibly snapped to its real computed size. That's the "abre
  // primero el tamaño antiguo... y después crece" Victoria reported, and
  // it happened on every arrival at /proyectos regardless of how you got
  // there (navbar click, not just the card-open zoom from Home), since
  // every arrival mounts this same component and runs this same effect.
  // useLayoutEffect still commits after the DOM mutation but BEFORE the
  // browser paints, so this first, synchronous `apply()` call now has a
  // chance to land before anything is shown at all, instead of after. The
  // rAF-deferred second call, the fonts.ready re-check and the
  // ResizeObserver below are untouched -- they're still needed for the
  // separate case (see their own comment) where web fonts are still
  // loading and this first measurement is simply wrong, not just late.
  useLayoutEffect(() => {
    const stage = document.querySelector('.x-stage');
    const wrap = document.querySelector('.stage-wrap');
    const navbar = document.querySelector('[data-nav]');
    const footerEl = document.querySelector('[data-site-footer]');
    if (!stage || !wrap) return;
    const apply = () => {
      const dh = stage.offsetHeight || 888;
      const navH = navbar ? navbar.offsetHeight : 0;
      const footH = footerEl ? footerEl.offsetHeight : 0;
      const availH = window.innerHeight - navH - footH;
      // Set .stage-wrap's own height directly from the room actually left
      // between navbar and footer (identical fix to HomeDesktop.js's
      // fitApply). .page no longer forces height:100vh (see proyectos.css),
      // so without this .stage-wrap would collapse to 0 (flex:1 1 auto with
      // nothing sizing its flex container) -- and leaving it un-set here
      // was the root cause of the whole-page scroll bug (the browser
      // picking some other intrinsic height for .page).
      wrap.style.height = Math.max(0, availH) + 'px';
      const availW = wrap.clientWidth || window.innerWidth;
      // Scale was height-only (`availH / dh`) until Victoria asked for the
      // open project card to adapt on narrower screens instead of getting
      // clipped: with only a height term here, `stageW` below could never
      // shrink below its own 1440 floor, so on any window narrower than
      // that the (always >=1440-wide) canvas overflowed the real viewport
      // and .stage-wrap's `overflow:hidden` silently cropped it -- real
      // content (e.g. a project's left-rail metadata/section nav) could end
      // up partly or fully off-screen with no scroll affordance to reach
      // it. Adding `availW / STAGE_MIN_W` as a third candidate means that on
      // a narrow window, scale shrinks to whatever makes the UNSCALED
      // canvas exactly fill the available width instead of overflowing it
      // -- at that point `stageW` below naturally resolves to exactly
      // STAGE_MIN_W (see its own comment), so the canvas's rendered width
      // always matches the viewport exactly rather than exceeding it. The
      // prev/next "ghost" peek cards live outside that canvas by design
      // (positioned off its left/right edge so only a sliver pokes in --
      // see their `calc(-390px ...)` offset below), so once the canvas
      // stops overflowing, they fall fully outside the visible viewport
      // and simply disappear -- which is the behavior Victoria asked for
      // ("para esos casos los ghosts pueden desaparecer"), with no extra
      // code needed to hide them explicitly. On a short-but-wide window
      // (height is still the binding constraint, as at a typical 1440x900)
      // this term is just smaller than the height term and has no effect,
      // so that already-verified case is unchanged.
      //
      // STAGE_MIN_W is 1550, not the original design's 1440, because
      // .project-card-lg.is-current now measures 1550px wide (Victoria's
      // request) -- using a smaller floor here would let the stage shrink
      // to a box narrower than the card it has to contain, clipping real
      // content off each side on narrow windows. The floor always has to
      // be >= the widest fixed-width thing positioned inside the stage.
      const STAGE_MIN_W = 1550;
      const scale = Math.min(availH / dh, availW / STAGE_MIN_W, 1.25);
      const stageW = Math.max(STAGE_MIN_W, availW / scale);
      stage.style.width = stageW + 'px';
      stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
      // The raw (stageW - STAGE_MIN_W) / 2 is the artifact's own formula
      // (originally confirmed byte-identical to Projects.dc.html's
      // _fitInit, back when the floor was still exactly 1440) -- it pushes
      // the ghost (prev/next) cards further out as the stage stretches
      // wider than its own floor to fill real desktop widths. That's the
      // opposite of what Victoria asked for this round ("que las ghosts no
      // desaparezcan más"): on a wide/short browser window (the common
      // desktop case) this term used to shove them most of the way to the
      // screen edge, far from the card. Dampened further here, from 45% to
      // 25% of the raw formula, so the ghosts still reveal a little more on
      // very wide screens (same intent as the original artifact) but stay
      // much closer to the card instead of reading as "gone". Paired with
      // the smaller base offset below (-390px instead of what the old
      // "move by half the width increase" rule would have given, -415px),
      // this keeps the ghosts visibly nearer the open card at both common
      // desktop sizes and very wide ones. Measured from STAGE_MIN_W (not a
      // hardcoded constant) so this is exactly 0 right at the floor,
      // instead of a stray few px of "growth" baked in just because the
      // floor itself moved up to fit the wider card.
      const peekExtra = Math.max(0, (stageW - STAGE_MIN_W) / 2) * 0.25;
      stage.style.setProperty('--peek-extra', peekExtra + 'px');
    };
    // See the identical effect in HomeDesktop.js for why a single
    // synchronous call on mount isn't enough on its own: it can run before
    // the browser has really settled layout (web fonts loading via @import
    // in globals.css, or just the very first paint), compute a too-small
    // scale from stale navbar/footer/window measurements, and then stay
    // wrong forever since nothing but a real window 'resize' re-triggers
    // it. Confirmed live on Home's identical formula. Same fix here: defer
    // the first call past a real layout pass, re-run once fonts finish
    // loading, and watch navbar/footer specifically (not stage/wrap, which
    // this effect itself resizes -- observing those would retrigger
    // itself).
    let rafId1 = 0;
    let rafId2 = 0;
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(apply);
    });
    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) apply();
      }).catch(() => {});
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    if (ro) {
      if (navbar) ro.observe(navbar);
      if (footerEl) ro.observe(footerEl);
    }

    apply();
    window.addEventListener('resize', apply);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.removeEventListener('resize', apply);
      if (ro) ro.disconnect();
    };
  }, []);

  // Clear every named timer on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(phantomCalcTimerRef.current);
      clearTimeout(phantomTypeTimerRef.current);
      clearTimeout(xFsRef.current);
      clearTimeout(funnelIntroTimerRef.current);
      clearTimeout(funnelJustSwitchedTRef.current);
      clearTimeout(funnelSwitchTimerRef.current);
      clearTimeout(deckT1Ref.current);
      clearTimeout(deckT2Ref.current);
      clearTimeout(arriveFailsafeTRef.current);
      clearTimeout(tocScrollLockTRef.current);
    };
  }, []);

  // The host can keep this page alive and just bring it to the front, so
  // the entrance can be replayed on demand.
  function xArrive(idx) {
    const root = document.documentElement;
    root.classList.remove('arrive');
    void root.offsetWidth;
    root.classList.add('arrive');
    if (coverRef.current && coverRef.current.parentNode) coverRef.current.parentNode.removeChild(coverRef.current);
    coverRef.current = null;
    clearTimeout(xFsRef.current);
    xFsRef.current = setTimeout(() => {
      root.classList.remove('arrive');
      if (coverRef.current && coverRef.current.parentNode) coverRef.current.parentNode.removeChild(coverRef.current);
      coverRef.current = null;
    }, 1400);
  }

  function setFunnelMode(mode) {
    const switchingToAfter = mode === 'after' && funnelMode !== 'after';
    clearTimeout(funnelSwitchTimerRef.current);
    setFunnelModeState(mode);
    setFunnelJustSwitched(switchingToAfter);
    if (switchingToAfter) {
      funnelSwitchTimerRef.current = setTimeout(() => setFunnelJustSwitched(false), 1500);
    }
  }

  // Clicking a side card, or a pill for any other project, all play the
  // same deck-slide MORPH: the target grows straight into the open centre
  // card. Four phases: pre-out (instant) -> out (animated) -> swap
  // (instant) -> in (animated). See the CSS comments in proyectos.css for
  // the full choreography.
  function runDeckTransition(targetIdx, dir) {
    if (deckBusyRef.current || targetIdx === activeProject) return;
    deckBusyRef.current = true;
    clearTimeout(deckT1Ref.current);
    clearTimeout(deckT2Ref.current);
    setDeckDir(dir);
    setDeckPhase('pre-out');
    setDeckTargetIdx(targetIdx);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDeckPhase('out');
        deckT1Ref.current = setTimeout(() => {
          setActiveProject(targetIdx);
          setActiveMapfreSection('meta');
          setDeckPhase('swap');
          setDeckDir(null);
          setDeckTargetIdx(null);
          const sc = document.querySelector('.proj-card-scroll');
          if (sc) sc.scrollTop = 0;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setDeckPhase('in');
              deckT2Ref.current = setTimeout(() => {
                setDeckPhase(null);
                deckBusyRef.current = false;
              }, 340);
            });
          });
        }, 380);
      });
    });
  }

  function prevProject() {
    const n = PROJECTS.length;
    runDeckTransition((activeProject - 1 + n) % n, 'prev');
  }
  function nextProject() {
    const n = PROJECTS.length;
    runDeckTransition((activeProject + 1) % n, 'next');
  }
  function selectProject(i) {
    const dir = i > activeProject ? 'next' : 'prev';
    runDeckTransition(i, dir);
  }

  function scrollToMapfreSection(id) {
    setActiveMapfreSection(id);
    const el = document.getElementById(id);
    if (!el) return;
    const container = el.closest('.proj-card-scroll');
    if (!container) return;
    const COMFORTABLE_OFFSET = 56;
    const startTop = container.scrollTop;
    // The open card renders inside a scaled "stage" wrapper (deck zoom/morph),
    // so getBoundingClientRect() deltas are in on-screen (scaled) pixels while
    // scrollTop/clientHeight are in the container's own unscaled layout
    // pixels. Divide the rect delta by that scale before mixing it with
    // scrollTop, or the target lands far short of the actual section (see
    // the same fix on scrollPhantomDemoIntoView just below).
    const containerRect = container.getBoundingClientRect();
    const scale = container.clientHeight ? (containerRect.height / container.clientHeight) || 1 : 1;
    const elTop = (el.getBoundingClientRect().top - containerRect.top) / scale + container.scrollTop;
    const maxTop = container.scrollHeight - container.clientHeight;
    const targetTop = id === 'meta' ? 0 : Math.max(0, Math.min(maxTop, elTop - COMFORTABLE_OFFSET));
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 1) return;
    tocScrollLockRef.current = id;
    const duration = 500;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      container.scrollTop = startTop + distance * ease(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        tocScrollLockTRef.current = setTimeout(() => {
          if (tocScrollLockRef.current === id) tocScrollLockRef.current = null;
        }, 80);
      }
    };
    requestAnimationFrame(step);
  }

  function handleProjScroll(e) {
    if (tocScrollLockRef.current) return;
    const container = e.target;
    const sections = container.querySelectorAll('[data-toc-id]');
    if (!sections.length) return;
    let activeId = sections[0].getAttribute('data-toc-id');
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    // Sections' getBoundingClientRect() tops are in on-screen (scaled) pixels
    // -- the open card sits inside a scaled "stage" wrapper -- so the
    // threshold has to be scaled down to match, or it reads as nearly the
    // whole card height and the highlighted sidebar item jumps too early
    // while scrolling (same root cause as the scrollToMapfreSection /
    // scrollPhantomDemoIntoView scroll-target fixes above).
    const scale = container.clientHeight ? (containerRect.height / container.clientHeight) || 1 : 1;
    const threshold = Math.min(220, Math.max(100, container.clientHeight * 0.25)) * scale;
    for (let i = 0; i < sections.length; i++) {
      const relTop = sections[i].getBoundingClientRect().top - containerTop;
      if (relTop <= threshold) {
        activeId = sections[i].getAttribute('data-toc-id');
      }
    }
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
    if (atBottom) {
      activeId = sections[sections.length - 1].getAttribute('data-toc-id');
    }
    if (activeId !== activeMapfreSection) setActiveMapfreSection(activeId);
  }

  // ---- Phantom Money "expense-entry" mini-demo ----
  // Tapping a calendar day pops the bottom sheet up over the phone mockup's
  // *own* fixed-height frame (.phantom-demo-phone is a constant 600px tall,
  // overflow:hidden -- the sheet is an absolutely positioned overlay inside
  // it, so the mockup's own size/position never changes). The actual
  // problem this scrolls to fix is upstream of the mockup: Victoria is
  // usually scrolled to wherever the calendar itself first became visible
  // in .proj-card-scroll, which (on most viewports) crops the bottom of the
  // phone -- the AI Insight row and the bottom nav -- below the fold. So on
  // every day tap this recenters the whole mockup in the open card's
  // scroll viewport, same idea as scrollToMapfreSection's TOC-click scroll
  // just below, but targeting a fixed DOM node instead of a section id, and
  // centering (when the mockup is shorter than the viewport) rather than
  // pinning to an offset from the top, so the whole phone -- bezel to bottom
  // nav -- lands in the middle of the card instead of just clearing the
  // fold. Harmless (near-zero distance, skipped by the <1px guard) when the
  // mockup already happens to be fully in view.
  function scrollPhantomDemoIntoView() {
    const el = document.querySelector('.phantom-demo-wrap');
    if (!el) return;
    const container = el.closest('.proj-card-scroll');
    if (!container) return;
    const id = 'phantom-demo';
    tocScrollLockRef.current = id;
    const COMFORTABLE_OFFSET = 32;
    const startTop = container.scrollTop;
    // The open card renders inside a scaled "stage" wrapper (deck zoom/morph),
    // so getBoundingClientRect() deltas are in on-screen (scaled) pixels while
    // scrollTop/clientHeight/offsetHeight are in the container's own unscaled
    // layout pixels. Divide the rect delta by that scale before mixing it with
    // scrollTop, or the target lands far short of where the element actually
    // is in the scrollable content.
    const containerRect = container.getBoundingClientRect();
    const scale = container.clientHeight ? (containerRect.height / container.clientHeight) || 1 : 1;
    const elTop = (el.getBoundingClientRect().top - containerRect.top) / scale + container.scrollTop;
    const maxTop = container.scrollHeight - container.clientHeight;
    const targetTop = Math.max(0, Math.min(maxTop, el.offsetHeight <= container.clientHeight
      ? elTop - (container.clientHeight - el.offsetHeight) / 2
      : elTop - COMFORTABLE_OFFSET));
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 1) { tocScrollLockRef.current = null; return; }
    const duration = 500;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      container.scrollTop = startTop + distance * ease(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        tocScrollLockTRef.current = setTimeout(() => {
          if (tocScrollLockRef.current === id) tocScrollLockRef.current = null;
        }, 80);
      }
    };
    requestAnimationFrame(step);
  }
  function phantomPickDay(d) {
    clearTimeout(phantomCalcTimerRef.current);
    setPhantomDay(d);
    setPhantomAmount('');
    setPhantomCalculating(false);
    setPhantomResult(null);
    setPhantomMathOpen(false);
    scrollPhantomDemoIntoView();
  }
  function phantomCloseSheet() {
    clearTimeout(phantomCalcTimerRef.current);
    setPhantomDay(null);
    setPhantomAmount('');
    setPhantomCalculating(false);
    setPhantomResult(null);
    setPhantomMathOpen(false);
  }
  function phantomAmountChange(e) {
    const digits = (e.target.value || '').replace(/[^0-9]/g, '').slice(0, 5);
    setPhantomAmount(digits);
    setPhantomResult(null);
    setPhantomMathOpen(false);
  }
  function phantomCalculate() {
    if (phantomCalculating || !phantomAmount) return;
    setPhantomCalculating(true);
    setPhantomResult(null);
    setPhantomMathOpen(false);
    clearTimeout(phantomCalcTimerRef.current);
    phantomCalcTimerRef.current = setTimeout(() => {
      setPhantomCalculating(false);
      setPhantomResult(parseInt(phantomAmount, 10) || 0);
    }, 700);
  }
  function phantomOpenMath() {
    if (phantomResult == null) return;
    setPhantomMathOpen(true);
  }
  function phantomCloseMath() {
    setPhantomMathOpen(false);
  }

  // ---- derived view-model (ported from renderVals()) ----
  const n = PROJECTS.length;
  const active = activeProject;
  const prevIdx = (active - 1 + n) % n;
  const nextIdx = (active + 1) % n;
  const current = PROJECTS[active];

  const isMapfreLayout = current.layout === 'mapfre';
  const isGenericLayout = !isMapfreLayout;
  const hasIndexLayout = isGenericLayout && !!current.hasIndex;
  const isPlainGeneric = isGenericLayout && !current.hasIndex;

  const sections = isGenericLayout ? computeGenericSections(current) : [];
  const mapfreToc = isMapfreLayout || hasIndexLayout ? current.toc.map((t) => ({ id: t.id, label: t.label, activeClass: activeMapfreSection === t.id ? 'is-active' : '' })) : [];
  const mapfreSections = isMapfreLayout ? current.sections.map((s) => ({ id: s.id, heading: s.heading, hasSideBox: !!s.hasSideBox, isPlainSection: !s.hasSideBox, blocks: s.blocks })) : [];

  const funnelModeClass = (funnelMode === 'before' ? 'mode-before' : funnelMode === 'after' ? 'mode-after' : '') + (funnelJustSwitched ? ' is-transitioning' : '');
  const funnelBeforeActive = funnelMode === 'before' ? 'is-active' : '';
  const funnelAfterActive = funnelMode === 'after' ? 'is-active' : '';

  // Phantom Money "expense-entry" mini-demo view-model.
  const BALANCE = 2500;
  const RENT = 1100;
  const phantomSheetUp = phantomDay != null;
  const phantomResultVisible = phantomResult != null;
  const phantomSafeBalance = BALANCE - RENT - (phantomResult || 0);
  const phantomHeadline = !phantomResultVisible ? '' : phantomSafeBalance < 0 ? 'That dips you negative 🚨' : phantomSafeBalance < 400 ? 'Cutting it close ⚠️' : "You'll be fine! 🎉";
  const phantomNoteEnding = phantomSafeBalance < 0 ? 'that would put you below zero, worth moving things around before it happens.' : phantomSafeBalance < 400 ? "that's cutting it close, worth keeping an eye on." : "that's a healthy buffer!";
  const phantomCanCalc = !!phantomAmount && !phantomCalculating;
  const phantomNormalView = !phantomMathOpen;
  const phantomCalCells = (() => {
    const DOW_FIRST = 0; // November 2026 starts on a Sunday -- deliberately hardcoded, not computed from the real device clock.
    const cells = [];
    const blank = (k) => ({ isBlank: true, num: '', cellClass: 'phantom-demo-day is-blank', key: 'b' + k });
    for (let i = 0; i < DOW_FIRST; i++) cells.push(blank('lead' + i));
    for (let d = 1; d <= 30; d++) {
      const isSelected = d === phantomDay;
      cells.push({ isBlank: false, num: String(d), cellClass: 'phantom-demo-day phantom-demo-day-target' + (isSelected ? ' is-active' : ''), day: d, key: 'd' + d });
    }
    while (cells.length % 7 !== 0) cells.push(blank('trail' + cells.length));
    return cells;
  })();
  const phantomPromptFull = PHANTOM_PROMPTS[phantomTypeIdx % PHANTOM_PROMPTS.length];
  const phantomPromptText = phantomPromptFull.slice(0, phantomTypeLen);
  const phantomBgDimClass = phantomSheetUp ? 'is-dimmed' : '';
  const phantomSheetClass = (phantomSheetUp ? 'is-up' : '') + (phantomMathOpen ? ' is-math' : '') + (!phantomResultVisible ? ' is-compact' : '');
  const phantomSheetSub = phantomDay != null ? 'For November ' + phantomDay + ', 2026' : '';
  const phantomCalcBtnClass = (phantomCalculating ? 'is-calculating' : '') + (phantomCanCalc ? '' : ' is-disabled');
  const phantomBtnLabel = phantomCalculating ? 'Calculating…' : 'Calculate Impact';
  const phantomResultClass = phantomResultVisible ? 'is-visible' : '';
  const phantomSafeBalanceDisplay = '$' + phantomSafeBalance.toLocaleString('en-US');
  const phantomExpenseDisplay = '$' + (phantomResult || 0).toLocaleString('en-US');
  const pct = (val) => Math.max(2, Math.min(100, Math.round((val / BALANCE) * 100)));
  const phantomBarRent = pct(RENT);
  const phantomBarExpense = pct(phantomResult || 0);
  const phantomBarSafe = pct(Math.max(0, phantomSafeBalance));

  // Deck-slide morph view-model.
  let deckStageClass = '';
  let ghostClass = '';
  if (deckPhase === 'pre-out') {
    deckStageClass = 'deck-instant deck-hide-content ' + (deckDir === 'next' ? 'deck-dir-next' : 'deck-dir-prev');
    ghostClass = 'deck-ghost-show ' + (deckDir === 'next' ? 'deck-ghost-at-next' : 'deck-ghost-at-prev');
  } else if (deckPhase === 'out') {
    deckStageClass = 'deck-anim deck-hide-content deck-anim-current ' + (deckDir === 'next' ? 'deck-dir-next' : 'deck-dir-prev');
    ghostClass = 'deck-ghost-show deck-ghost-at-center';
  } else if (deckPhase === 'swap') {
    deckStageClass = 'deck-instant deck-hide-content';
  } else if (deckPhase === 'in') {
    deckStageClass = 'deck-anim';
  }
  const prevSlotIdx = deckDir === 'prev' && deckTargetIdx != null ? deckTargetIdx : prevIdx;
  const nextSlotIdx = deckDir === 'next' && deckTargetIdx != null ? deckTargetIdx : nextIdx;
  const ghostTargetIdx = deckTargetIdx != null ? deckTargetIdx : deckDir === 'next' ? nextIdx : prevIdx;
  const ghostStyle = { '--ghost-glow': GRADIENTS[ghostTargetIdx] || GRADIENTS[0] };

  const pills = PILL_LABELS.map((label, i) => ({ label, current: i === active, activeClass: i === active ? 'is-active' : '', onClick: () => selectProject(i) }));

  const phantom = {
    phantomPromptText,
    phantomBgDimClass,
    phantomSheetClass,
    phantomSheetSub,
    phantomAmount,
    phantomCalcBtnClass,
    phantomBtnLabel,
    phantomCanCalc,
    phantomNormalView,
    phantomResultClass,
    phantomMathView: phantomMathOpen,
    phantomHeadline,
    phantomNoteEnding,
    phantomSafeBalanceDisplay,
    phantomExpenseDisplay,
    phantomBarRent,
    phantomBarExpense,
    phantomBarSafe,
    phantomCalCells,
  };

  // ---- shared block renderer (covers every block shape used anywhere on
  // this page -- a block that isn't the matching type for a given flag
  // simply doesn't render that branch, so one function safely covers every
  // context the original template used sc-if for). ----
  function renderBlock(block, key) {
    if (block.isP) return <p className="mapfre-p proj-p" key={key}>{block.text}</p>;
    if (block.isLead) return (
      <p className="mapfre-p proj-p" key={key}>
        <strong>{block.lead}</strong>{block.rest}
      </p>
    );
    if (block.isRich) return (
      <p className="mapfre-p proj-p" key={key}>
        {block.pre}<strong>{block.bold}</strong>{block.post}
      </p>
    );
    if (block.isQuote) return (
      <div className="proj-quote-card" key={key}>
        <span className="proj-quote-mark" aria-hidden="true">&ldquo;</span>
        <p className="proj-quote-text">{block.text}</p>
      </div>
    );
    if (block.isCard) return (
      <div className="mapfre-result-card" key={key}>
        <span className="mapfre-result-tag">{block.tag}</span>
        <p className={'mapfre-result-text ' + block.cardClass} style={{ lineHeight: 1.5 }}>{block.text}</p>
      </div>
    );
    if (block.isCalendarLoopDemo) return <CalendarLoopDemo key={key} />;
    if (block.isShowMathDemo) return <ShowMathDemo key={key} />;
    if (block.isNetflixLearnDemo) return <NetflixLearnDemo key={key} />;
    if (block.isPlainImage) return (
      <div className="proj-image" key={key}><span className="proj-image-label">{block.caption}</span></div>
    );
    if (block.isList) return (
      <div className="proj-cards" key={key}>
        {block.items.map((item, i) => (
          <div className="proj-card" key={i}>
            {item.isLead && (<><p className="proj-card-lead">{item.lead}</p><p className="proj-card-body">{item.rest}</p></>)}
            {item.isP && <p className="proj-card-body">{item.text}</p>}
          </div>
        ))}
      </div>
    );
    if (block.isGrid2) return (
      <div className={block.gridClass} key={key}>
        {block.items.map((item, i) => (
          <div className="proj-card" key={i}>
            <p className="proj-card-lead">{item.tag}</p>
            {item.paragraphs.map((para, pi) => (<p className="proj-card-body" key={pi}>{para.text}</p>))}
          </div>
        ))}
      </div>
    );
    if (block.isCols) return (
      <div className="mapfre-section-cols" key={key}>
        <div className="mapfre-section-col">{block.left.map((lb, i) => (<p className="mapfre-p" key={i}>{lb.text}</p>))}</div>
        <div className="mapfre-section-col">{block.right.map((rb, i) => (<p className="mapfre-p" key={i}>{rb.text}</p>))}</div>
      </div>
    );
    if (block.isTwin) return (
      <div className="mapfre-twin-row" key={key}>
        <div className="mapfre-twin-col">
          <h3 className="mapfre-section-heading">{block.leftHeading}</h3>
          {block.left.map((lb, i) => (<p className="mapfre-p" key={i}>{lb.text}</p>))}
        </div>
        <div className="mapfre-twin-col">
          <h3 className="mapfre-section-heading">{block.rightHeading}</h3>
          {block.right.map((rb, i) => (<p className="mapfre-p" key={i}>{rb.text}</p>))}
        </div>
      </div>
    );
    if (block.isRows) return (
      <div className="mapfre-rows" key={key}>
        {block.items.map((item, i) => (
          <div className="mapfre-row" key={i}>
            <div className="proj-card">
              <p className="proj-card-lead">{item.tag}</p>
              <p className="proj-card-body">{item.text}</p>
            </div>
            {item.isQuoteManagerDemo && <QuoteManagerDemo />}
            {item.isBackofficeDemo && <BackofficeDemo />}
            {item.isFailureResponseDemo && <FailureResponseDemo />}
            {item.isLifecycleDemo && <LifecycleDemo />}
            {item.isDashboardDemo && <DashboardDemo />}
            {item.isPlainRowImage && (<div className="mapfre-row-image"><span className="proj-image-label">{item.caption}</span></div>)}
          </div>
        ))}
      </div>
    );
    if (block.isImgRow) return (
      <div className="mapfre-imgrow" key={key}>
        {block.items.map((item, i) => (
          item.hasSrc
            ? (<div className="mapfre-imgrow-item mapfre-imgrow-item--img" key={i}><img className="mapfre-imgrow-img" src={item.src} alt={item.caption} /></div>)
            : (<div className="mapfre-imgrow-item" key={i}><span className="proj-image-label">{item.caption}</span></div>)
        ))}
      </div>
    );
    return null;
  }

  function renderSideImage(simg, key) {
    if (simg.isShowMathDemo) return <ShowMathDemo key={key} />;
    if (simg.isNetflixLearnDemo) return <NetflixLearnDemo key={key} />;
    return (<div className="proj-image" key={key}><span className="proj-image-label">{simg.caption}</span></div>);
  }

  return (
    <>
      <Navbar current="proyectos" />
      <CursorDot />
      {/* Scope wrapper: isolates proyectos.css's selectors (e.g. .page,
          .stage-wrap) from ProyectosMobile's proyectos-mobile.css, which
          Next.js bundles into this route's client CSS regardless of which
          variant actually renders -- see proyectos-desktop-scope /
          proyectos-mobile-scope in the matching .css files. */}
      <div className="proyectos-desktop-scope">
      <main data-page className="page proyectos-desktop is-pending-enter">
        <div className="stage-wrap">
          <div className="x-stage">
            <section className="projects-view" id="projects">
              <div className="projects-top-row">
                <Link className="mini-carousel-btn" href="/" aria-label="Back to home carousel" data-cursor-label="Click to go to home page">
                  <svg className="mini-fan-icon" width="47" height="20" viewBox="0 0 61 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="23" width="14" height="20" rx="2" fill="currentColor" />
                    <rect x="47.741" y="1.64795" width="14" height="20" rx="2" transform="rotate(22 47.741 1.64795)" fill="currentColor" />
                    <rect width="14" height="20" rx="2" transform="matrix(-0.927184 0.374607 0.374607 0.927184 12.9806 1.64795)" fill="currentColor" />
                  </svg>
                </Link>
                <ul className="project-pills" aria-label="Select project">
                  {pills.map((pill, i) => (
                    <li key={i}>
                      <button className={'project-pill ' + pill.activeClass} type="button" onClick={pill.onClick} aria-current={pill.current}>
                        {pill.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={'projects-stage ' + deckStageClass}>
                {/* is-prev slot */}
                <button
                  className="project-card-lg is-prev"
                  type="button"
                  style={{ background: '#202020' }}
                  onClick={prevProject}
                  aria-label={'Previous project: ' + PILL_LABELS[prevSlotIdx]}
                  data-cursor-label="Click to see previous project"
                >
                  <span className="project-card-lg-tag">{PILL_LABELS[prevSlotIdx]}</span>
                </button>

                {/* is-current slot */}
                <div className="project-card-lg is-current" id={current.slug || ''} aria-label={'Current project: ' + PILL_LABELS[active]}>
                  <div className="project-card-content">
                    <div className="proj-card-scroll" onScroll={handleProjScroll}>
                      {isMapfreLayout && (
                        <div className="mapfre-body">
                          <nav className="mapfre-toc" aria-label="Section index">
                            {mapfreToc.map((t) => (
                              <button key={t.id} className={'mapfre-toc-item ' + t.activeClass} type="button" onClick={() => scrollToMapfreSection(t.id)}>
                                {t.label}
                              </button>
                            ))}
                          </nav>

                          <div className="mapfre-content">
                            <div className="mapfre-head-row">
                              <span className="mapfre-status-pill">{current.status}</span>
                              <span className="mapfre-company-label">{current.companyLabel}</span>
                            </div>
                            <h1 className="mapfre-title">{current.title}</h1>

                            <div className="mapfre-meta-grid" id="meta" data-toc-id="meta" style={{ gridTemplateColumns: `repeat(${current.meta.length}, minmax(0, max-content))` }}>
                              {current.meta.map((m, i) => (
                                <div key={i}>
                                  <p className="mapfre-meta-label">{m.label}</p>
                                  <p className="mapfre-meta-value">{m.value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="mapfre-stack">
                              <div className="mapfre-metrics">
                                {current.stats.map((stat, i) => (
                                  <div className="mapfre-metric" key={i}>
                                    <div className="mapfre-metric-value-row">
                                      {stat.hasArrow && (
                                        <>
                                          <span className="mapfre-metric-value">{stat.before}</span>
                                          <span className="mapfre-metric-arrow" aria-hidden="true">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                          </span>
                                          <span className="mapfre-metric-value">{stat.after}</span>
                                        </>
                                      )}
                                      {stat.noArrow && <span className="mapfre-metric-value">{stat.value}</span>}
                                    </div>
                                    <span className="mapfre-metric-label">{stat.label}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mapfre-flow-box">
                                <span className="flow-blob flow-blob-a" aria-hidden="true" />
                                <span className="flow-blob flow-blob-b" aria-hidden="true" />
                                <span className="flow-blob flow-blob-c" aria-hidden="true" />
                                <span className="flow-halo-pulse" aria-hidden="true" />
                                <div className="funnel-view-toggle" role="group" aria-label="Show the before or after state">
                                  <button className={'funnel-view-btn ' + funnelBeforeActive} type="button" onClick={() => setFunnelMode('before')}>Before</button>
                                  <button className={'funnel-view-btn ' + funnelAfterActive} type="button" onClick={() => setFunnelMode('after')}>After</button>
                                </div>
                                <div className="flow-device" aria-hidden="true">
                                  <div className="flow-stage">
                                    <div className={'flow-funnel ' + funnelModeClass}>
                                      <div className="funnel-top">
                                        <div className="funnel-top-left">
                                          <span className="flow-story-live-dot" />
                                          <span className="flow-story-live-label">Live search funnel</span>
                                        </div>
                                        <span className="funnel-rate-chip">
                                          <span className="funnel-rate-value">
                                            <span className="fd-num fd-rate-before">56.5%</span>
                                            <span className="fd-num fd-rate-after">97.4%</span>
                                          </span>
                                          <span className="funnel-rate-suffix">match rate</span>
                                        </span>
                                      </div>

                                      <div className="funnel-stage">
                                        <svg className="funnel-shape" viewBox="0 0 400 100" preserveAspectRatio="none">
                                          <path className="funnel-band" d="M0,10 C100,10 140,40 200,40 C260,40 300,10 400,10 L400,90 C300,90 260,60 200,60 C140,60 100,90 0,90 Z" />
                                        </svg>

                                        <div className="funnel-dots is-before">
                                          <span className="funnel-dot is-success fb-d0" /><span className="funnel-dot is-success fb-d1" /><span className="funnel-dot is-drop fb-d2" />
                                          <span className="funnel-dot is-success fb-d3" /><span className="funnel-dot is-drop fb-d4" /><span className="funnel-dot is-success fb-d5" />
                                          <span className="funnel-dot is-drop fb-d6" /><span className="funnel-dot is-drop fb-d7" /><span className="funnel-dot is-success fb-d8" />
                                          <span className="funnel-dot is-drop fb-d9" /><span className="funnel-dot is-drop fb-d10" /><span className="funnel-dot is-drop fb-d11" />
                                          <span className="funnel-dot is-drop fb-d12" /><span className="funnel-dot is-drop fb-d13" />
                                        </div>
                                        <div className="funnel-dots is-after">
                                          <span className="funnel-dot is-success fd-d0" /><span className="funnel-dot is-success fd-d1" /><span className="funnel-dot is-success fd-d2" />
                                          <span className="funnel-dot is-success fd-d3" /><span className="funnel-dot is-drop fd-d4" /><span className="funnel-dot is-success fd-d5" />
                                          <span className="funnel-dot is-success fd-d6" /><span className="funnel-dot is-success fd-d7" /><span className="funnel-dot is-success fd-d8" />
                                        </div>

                                        <span className="funnel-gate-badge">
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                        </span>

                                        <div className="funnel-sold">
                                          <span className="fd-icon fd-icon-sold">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-3.2a2 2 0 0 1 1.1-1.8l1.8-.9 1.6-3a2 2 0 0 1 1.8-1.1h3.4a2 2 0 0 1 1.8 1.1l1.6 3 1.8.9A2 2 0 0 1 20 12.8V16" /><path d="M4 16h16" /><circle cx="7.5" cy="16" r="1.6" /><circle cx="16.5" cy="16" r="1.6" /></svg>
                                          </span>
                                          <span className="fd-text">
                                            <span className="fd-value">
                                              <span className="fd-value-group is-before">
                                                <span className="fd-digit-static">77</span>
                                                <span className="fd-digit-roll"><span className="fd-digit-strip fd-digit-strip-before"><span className="fd-digit">2</span><span className="fd-digit">3</span><span className="fd-digit">4</span><span className="fd-digit">5</span><span className="fd-digit">6</span></span></span>
                                              </span>
                                              <span className="fd-value-group is-after">
                                                <span className="fd-digit-static">1,04</span>
                                                <span className="fd-digit-roll"><span className="fd-digit-strip fd-digit-strip-after"><span className="fd-digit">2</span><span className="fd-digit">3</span><span className="fd-digit">4</span><span className="fd-digit">5</span><span className="fd-digit">6</span></span></span>
                                              </span>
                                            </span>
                                            <span className="fd-label">Sold today</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {mapfreSections.map((section) => (
                                <div className="mapfre-section" id={section.id} data-toc-id={section.id} key={section.id}>
                                  <h3 className="mapfre-section-heading">{section.heading}</h3>
                                  {section.hasSideBox && (
                                    <div className="mapfre-section-row">
                                      <div className="mapfre-section-text">
                                        {section.blocks.map((block, bi) => block.isP && (<p className="mapfre-p" key={bi}>{block.text}</p>))}
                                      </div>
                                      <div className="mapfre-side-box mapfre-ba-box" aria-hidden="true">
                                        <span className="ba-blob ba-blob-top" />
                                        <span className="ba-blob ba-blob-bottom" />
                                        <div className="ba-pane ba-before">
                                          <span className="ba-pane-label">Before</span>
                                          <div className="ba-input-row">
                                            <span className="ba-input-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg></span>
                                            <span className="ba-input-text">hiudai</span>
                                            <span className="ba-caret" />
                                          </div>
                                          <span className="ba-error-msg">Car not found. Try again.</span>
                                        </div>
                                        <div className="ba-pane ba-after">
                                          <span className="ba-pane-label">After</span>
                                          <div className="ba-input-row">
                                            <span className="ba-input-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg></span>
                                            <span className="ba-input-text">hiudai</span>
                                            <span className="ba-caret" />
                                          </div>
                                          <div className="ba-suggestion">
                                            <span className="ba-suggestion-icon" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-3.2a2 2 0 0 1 1.1-1.8l1.8-.9 1.6-3a2 2 0 0 1 1.8-1.1h3.4a2 2 0 0 1 1.8 1.1l1.6 3 1.8.9A2 2 0 0 1 20 12.8V16" /><path d="M4 16h16" /><circle cx="7.5" cy="16" r="1.6" /><circle cx="16.5" cy="16" r="1.6" /></svg></span>
                                            <span className="ba-suggestion-label">Hyundai Accent</span>
                                            <span className="ba-suggestion-check" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
                                            <span className="ba-click-ripple" aria-hidden="true" />
                                            <span className="ba-click-cursor" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2l16 7.5-6.5 2-2 6.5z" /></svg></span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {section.isPlainSection && section.blocks.map((block, bi) => renderBlock(block, bi))}
                                </div>
                              ))}

                              <button className="mapfre-next-case" type="button" onClick={nextProject}>
                                <span>See next case</span>
                                <span aria-hidden="true">&rarr;</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasIndexLayout && (
                        <div className="mapfre-body">
                          <nav className="mapfre-toc" aria-label="Section index">
                            {mapfreToc.map((t) => (
                              <button key={t.id} className={'mapfre-toc-item ' + t.activeClass} type="button" onClick={() => scrollToMapfreSection(t.id)}>
                                {t.label}
                              </button>
                            ))}
                          </nav>

                          <div className="mapfre-content">
                            <div className="mapfre-head-row">
                              <span className="mapfre-status-pill">{current.status}</span>
                              <span className="mapfre-company-label">{current.companyLabel}</span>
                            </div>
                            <h1 className="mapfre-title">{current.title}</h1>

                            <div className="mapfre-meta-grid" id="meta" data-toc-id="meta" style={{ gridTemplateColumns: `repeat(${current.meta.length}, minmax(0, max-content))` }}>
                              {current.meta.map((m, i) => (
                                <div key={i}>
                                  <p className="mapfre-meta-label">{m.label}</p>
                                  <p className="mapfre-meta-value">{m.value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="mapfre-stack">
                              {sections.map((section) => (
                                <div className="mapfre-section" id={section.id} data-toc-id={section.id} key={section.id}>
                                  {section.leadImageIsExpenseDemo && (
                                    <div className="mapfre-section-row proj-demo-row">
                                      <div className="proj-demo-col">
                                        <ExpenseEntryDemo phantom={phantom} onPhantomPickDay={phantomPickDay} onPhantomCloseSheet={phantomCloseSheet} onPhantomAmountChange={phantomAmountChange} onPhantomCalculate={phantomCalculate} onPhantomOpenMath={phantomOpenMath} />
                                      </div>
                                      <div className="proj-demo-text mapfre-section-text">
                                        <h3 className="mapfre-section-heading">{section.heading}</h3>
                                        {section.blocks.map((block, bi) => renderBlock(block, bi))}
                                      </div>
                                    </div>
                                  )}
                                  {section.leadImageIsVictorDemo && (
                                    <>
                                      <VictorAIDemo />
                                      <button className="mapfre-next-case vai-chat-cta" type="button" aria-label="Open the VictorAI chat" onClick={chat.openChat}>
                                        <span>Try the AI chatbot</span>
                                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10.5946 13.6475L9.79167 16.4583L8.9887 13.6475C8.78117 12.9214 8.39206 12.2602 7.85809 11.7262C7.32413 11.1923 6.66292 10.8032 5.93685 10.5956L3.125 9.79167L5.93586 8.9887C6.66193 8.78117 7.32314 8.39206 7.85711 7.8581C8.39107 7.32413 8.78018 6.66292 8.98772 5.93685L9.79167 3.125L10.5946 5.93586C10.8022 6.66193 11.1913 7.32314 11.7252 7.85711C12.2592 8.39107 12.9204 8.78018 13.6465 8.98772L16.4583 9.79167L13.6475 10.5946C12.9214 10.8022 12.2602 11.1913 11.7262 11.7252C11.1923 12.2592 10.8032 12.9204 10.5956 13.6465L10.5946 13.6475Z" fill="currentColor" stroke="currentColor" strokeWidth="1.48148" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                      </button>
                                    </>
                                  )}
                                  {section.leadImageIsPlain && (<div className="proj-image"><span className="proj-image-label">{section.leadImage.caption}</span></div>)}
                                  {section.leadImageIsVideo && (
                                    <div className="proj-image proj-video">
                                      <video className="proj-video-el" style={{ objectPosition: section.leadImage.videoPosition }} autoPlay loop muted playsInline preload="auto" aria-hidden="true">
                                        <source src={section.leadImage.videoSrc} type="video/mp4" />
                                      </video>
                                    </div>
                                  )}
                                  {section.leadImageIsAxoDemo && <AxoDemo />}
                                  {section.leadImageIsUndpDemo && <UndpDemo />}
                                  {section.showStandardHeading && <h3 className="mapfre-section-heading">{section.heading}</h3>}

                                  {section.hasSideImages && (
                                    <div className="mapfre-section-row proj-split-row">
                                      <div className="mapfre-section-text">
                                        <h3 className="mapfre-section-heading">{section.heading}</h3>
                                        {section.blocks.map((block, bi) => renderBlock(block, bi))}
                                      </div>
                                      <div className="proj-split-images">
                                        {section.sideImages.map((simg, si) => renderSideImage(simg, si))}
                                      </div>
                                    </div>
                                  )}

                                  {section.isPlainBody && section.blocks.map((block, bi) => renderBlock(block, bi))}
                                </div>
                              ))}

                              <button className="mapfre-next-case" type="button" onClick={nextProject}>
                                <span>See next case</span>
                                <span aria-hidden="true">&rarr;</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPlainGeneric && (
                        <>
                          <div className="proj-headline">
                            <h1 className="proj-title">{current.title}</h1>
                            {current.tagline && <p className="proj-tagline">{current.tagline}</p>}
                          </div>
                          <div className="proj-meta-row">
                            {current.role && <p className="proj-meta-role">{current.role}</p>}
                            <span className="proj-status">{current.status}</span>
                          </div>
                          {!!(current.stats && current.stats.length) && (
                            <div className="proj-stats">
                              {current.stats.map((stat, i) => (
                                <div className="proj-stat" key={i}>
                                  <span className="proj-stat-value">{stat.value}</span>
                                  <span className="proj-stat-label">{stat.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {sections.map((section) => (
                            <div className="proj-section" key={section.id}>
                              <div className="proj-section-head">
                                <span className="proj-section-num">{section.num}</span>
                                <h3 className="proj-section-title">{section.heading}</h3>
                              </div>
                              <div className={'proj-section-body ' + section.sectionClass}>
                                {section.blocks.map((block, bi) => renderBlock(block, bi))}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* is-next slot */}
                <button
                  className="project-card-lg is-next"
                  type="button"
                  style={{ background: '#202020' }}
                  onClick={nextProject}
                  aria-label={'Next project: ' + PILL_LABELS[nextSlotIdx]}
                  data-cursor-label="Click to see next project"
                >
                  <span className="project-card-lg-tag">{PILL_LABELS[nextSlotIdx]}</span>
                </button>

                <div className={'deck-ghost ' + ghostClass} style={ghostStyle} aria-hidden="true" />
              </div>
            </section>
          </div>
        </div>
      </main>
      </div>
      <ChatPanel />
      <Footer />
    </>
  );
}

// ============================================================================
// Decorative demo widgets (self-playing CSS-driven mock UIs, ported verbatim)
// ============================================================================

export function ExpenseEntryDemo({ phantom, onPhantomPickDay, onPhantomCloseSheet, onPhantomAmountChange, onPhantomCalculate, onPhantomOpenMath }) {
  return (
    <div className="phantom-demo-wrap">
      <p className="phantom-demo-try">Try it &mdash; tap a day on the calendar</p>
      <div className="phantom-demo-phone">
        <div className={'phantom-demo-bg ' + phantom.phantomBgDimClass}>
          <div className="phantom-demo-search">
            <span className="phantom-demo-sparkle" aria-hidden="true">&#10022;</span>
            <span className="phantom-demo-search-text">{phantom.phantomPromptText}<span className="phantom-demo-type-cursor" aria-hidden="true" /></span>
          </div>
          <div className="phantom-demo-overview">
            <div className="phantom-demo-overview-head">
              <span>This Month&apos;s Overview</span>
              <span className="phantom-demo-trend" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg></span>
            </div>
            <div className="phantom-demo-overview-row">
              <div><strong>$3,240</strong><span><span className="phantom-demo-flow-icon is-income" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg></span>Income</span></div>
              <div><strong>$1,890</strong><span><span className="phantom-demo-flow-icon is-expense" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="7" x2="17" y2="17" /><polyline points="17 7 17 17 7 17" /></svg></span>Expenses</span></div>
            </div>
          </div>
          <div className="phantom-demo-cal">
            <div className="phantom-demo-cal-head">
              <span className="phantom-demo-cal-arrow" aria-hidden="true">&lsaquo;</span>
              <span className="phantom-demo-cal-month">November 2026</span>
              <span className="phantom-demo-cal-arrow" aria-hidden="true">&rsaquo;</span>
            </div>
            <p className="phantom-demo-cal-hint">&#10022; Tap any day to simulate an expense</p>
            <div className="phantom-demo-cal-grid">
              <span className="phantom-demo-cal-dow">Sun</span><span className="phantom-demo-cal-dow">Mon</span><span className="phantom-demo-cal-dow">Tue</span>
              <span className="phantom-demo-cal-dow">Wed</span><span className="phantom-demo-cal-dow">Thu</span><span className="phantom-demo-cal-dow">Fri</span><span className="phantom-demo-cal-dow">Sat</span>
              {phantom.phantomCalCells.map((cell) => (
                <span className={cell.cellClass} key={cell.key} onClick={cell.isBlank ? undefined : () => onPhantomPickDay(cell.day)}>{cell.num}</span>
              ))}
            </div>
          </div>
          <div className="phantom-demo-insight">
            <span className="phantom-demo-insight-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg></span>
            <div className="phantom-demo-insight-body">
              <div className="phantom-demo-insight-head"><span className="phantom-demo-insight-title">AI Insight</span><span className="phantom-demo-insight-arrow" aria-hidden="true">&rsaquo;</span></div>
              <p className="phantom-demo-insight-text">Based on your spending patterns, you&apos;re on track to save <strong>$450</strong> this month. Great job! &#127919;</p>
            </div>
          </div>
          <div className="phantom-demo-nav">
            <div className="phantom-demo-nav-item">
              <span className="phantom-demo-nav-icon" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1v-9" /></svg></span>
              <span className="phantom-demo-nav-label">Home</span>
            </div>
            <div className="phantom-demo-nav-item is-active">
              <span className="phantom-demo-nav-icon" aria-hidden="true"><span className="phantom-demo-nav-icon-glyph">&#10022;</span></span>
              <span className="phantom-demo-nav-label">Cash Flow</span>
            </div>
            <div className="phantom-demo-nav-item">
              <span className="phantom-demo-nav-icon" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg></span>
              <span className="phantom-demo-nav-label">Profile</span>
            </div>
          </div>
        </div>
        <div className={'phantom-demo-sheet ' + phantom.phantomSheetClass}>
          {phantom.phantomNormalView && (
            <>
              <div className="phantom-demo-sheet-handle" />
              <div className="phantom-demo-sheet-head">
                <span className="phantom-demo-sheet-title">Simulate Expense</span>
                <span className="phantom-demo-sheet-close" aria-hidden="true" onClick={onPhantomCloseSheet}>&times;</span>
              </div>
              <p className="phantom-demo-sheet-sub">{phantom.phantomSheetSub}</p>
              <div className="phantom-demo-amount">
                <span className="phantom-demo-amount-dollar">$</span>
                <input className="phantom-demo-amount-value" inputMode="numeric" placeholder="0.00" value={phantom.phantomAmount} onChange={onPhantomAmountChange} />
              </div>
              <div className={'phantom-demo-calc-btn ' + phantom.phantomCalcBtnClass} onClick={onPhantomCalculate}>
                <span className="phantom-demo-spinner" aria-hidden="true" />
                <span>{phantom.phantomBtnLabel}</span>
              </div>
              <div className={'phantom-demo-result ' + phantom.phantomResultClass}>
                <div className="phantom-demo-result-box">
                  <p className="phantom-demo-result-headline">{phantom.phantomHeadline}</p>
                  <p className="phantom-demo-result-sub">Your projected balance will be <strong>{phantom.phantomSafeBalanceDisplay}</strong></p>
                </div>
                <div className="phantom-demo-result-pills">
                  <span className="phantom-demo-pill">&#128022; Move to Savings</span>
                  <span className="phantom-demo-pill">&#128737; Set a Limit</span>
                </div>
                <p className="phantom-demo-show-math" onClick={onPhantomOpenMath}>Show me the math &rsaquo;</p>
              </div>
            </>
          )}
          {phantom.phantomMathView && (
            <>
              <div className="phantom-demo-sheet-handle" />
              <div className="phantom-demo-sheet-head">
                <span className="phantom-demo-sheet-title">How we calculated this</span>
                <span className="phantom-demo-sheet-close" aria-hidden="true" onClick={onPhantomCloseSheet}>&times;</span>
              </div>
              <p className="phantom-demo-math-intro">Here&apos;s a simple breakdown of your money flow:</p>
              <div className="phantom-demo-math">
                <div className="phantom-demo-math-item">
                  <span className="phantom-demo-math-icon is-pos" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M16 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" /><path d="M17 13h.01" /></svg></span>
                  <div className="phantom-demo-math-row">
                    <div className="phantom-demo-math-row-head"><span>Current Balance</span><span className="is-pos">+$2,500</span></div>
                    <div className="phantom-demo-math-bar"><span style={{ width: '100%', background: '#2FB768' }} /></div>
                  </div>
                </div>
                <div className="phantom-demo-math-item">
                  <span className="phantom-demo-math-icon" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1v-9" /></svg></span>
                  <div className="phantom-demo-math-row">
                    <div className="phantom-demo-math-row-head"><span>Minus: Rent (Predicted)</span><span>-$1,100</span></div>
                    <div className="phantom-demo-math-bar"><span style={{ width: phantom.phantomBarRent + '%', background: '#716C7D' }} /></div>
                  </div>
                </div>
                <div className="phantom-demo-math-item">
                  <span className="phantom-demo-math-icon" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21.5 7H6" /></svg></span>
                  <div className="phantom-demo-math-row">
                    <div className="phantom-demo-math-row-head"><span>Minus: This Expense</span><span>-{phantom.phantomExpenseDisplay}</span></div>
                    <div className="phantom-demo-math-bar"><span style={{ width: phantom.phantomBarExpense + '%', background: '#716C7D' }} /></div>
                  </div>
                </div>
                <div className="phantom-demo-math-item">
                  <span className="phantom-demo-math-icon is-purple" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3 11 14.8l4.5-5.6" /></svg></span>
                  <div className="phantom-demo-math-row">
                    <div className="phantom-demo-math-row-head"><span>Equals: Safe Balance</span><span className="is-purple">{phantom.phantomSafeBalanceDisplay}</span></div>
                    <div className="phantom-demo-math-bar"><span style={{ width: phantom.phantomBarSafe + '%', background: '#7657D6' }} /></div>
                  </div>
                </div>
              </div>
              <div className="phantom-demo-math-note">
                <span className="phantom-demo-math-note-icon" aria-hidden="true">$</span>
                <p>After accounting for your predicted expenses, you&apos;ll have <strong>{phantom.phantomSafeBalanceDisplay}</strong> left, and {phantom.phantomNoteEnding}</p>
              </div>
              <p className="phantom-demo-math-done" onClick={onPhantomCloseSheet}>Got it, thanks!</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export function VictorAIDemo() {
  return (
    <div className="vai-demo" aria-hidden="true">
      <div className="vai-demo-stars" aria-hidden="true">
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <filter id="vsBoil1" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" /></filter>
            <filter id="vsBoil2" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" /></filter>
            <filter id="vsBoil3" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="26" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" /></filter>
          </defs>
        </svg>
        <svg className="vai-star vai-star-2" viewBox="20 25 170 195" fill="none" xmlns="http://www.w3.org/2000/svg"><g className="vai-star-g vai-star-g-2"><path d="M87.42 85.98L59.11 34.89C58.05 32.98 60.38 31.00 62.09 32.35L104.70 65.83V28.70C104.70 26.85 107.00 25.99 108.21 27.39L133.50 56.47L169.97 30.06C171.57 28.90 173.70 30.51 173.02 32.36L160.85 65.83L211.51 60.88C213.61 60.68 214.55 63.44 212.77 64.56L170.93 91.02L206.78 127.48C208.30 129.02 206.63 131.54 204.62 130.74L151.5 109.74L116.84 180.36C115.93 182.22 113.12 181.63 113.05 179.55L110.46 109.74L40.56 123.08C38.44 123.49 37.27 120.71 39.05 119.48L87.42 85.98Z" fill="#EB2628" /></g></svg>
        <svg className="vai-star vai-star-1" viewBox="15 125 185 140" fill="none" xmlns="http://www.w3.org/2000/svg"><g className="vai-star-g vai-star-g-1"><path d="M71.59 205.49L22.68 155.97C21.08 154.35 22.98 151.75 25.01 152.78L96.06 188.93L92.99 133.58C92.87 131.42 95.78 130.63 96.77 132.56L125.58 188.93L163.68 146.59C165.17 144.94 167.83 146.58 167.03 148.65L147.90 198.29L193.72 227.29C195.66 228.52 194.35 231.50 192.14 230.91L139.98 217.00L146.85 255.73C147.18 257.62 144.92 258.86 143.51 257.54L103.98 220.60L27.80 249.17C25.72 249.95 24.11 247.27 25.78 245.80L71.59 205.49Z" fill="#EB2628" /></g></svg>
        <svg className="vai-star vai-star-3" viewBox="150 62 140 185" fill="none" xmlns="http://www.w3.org/2000/svg"><g className="vai-star-g vai-star-g-3"><path d="M203.33 141.42L188.06 71.79C187.57 69.56 190.59 68.38 191.74 70.35L223.48 124.86L259.60 74.76C260.96 72.88 263.90 74.44 263.10 76.62L239.32 141.42L282.65 160.88C284.48 161.70 284.09 164.41 282.10 164.69L242.20 170.21L266.80 239.1C267.57 241.24 264.74 242.79 263.34 241L220.61 186.05L198.08 225.91C196.98 227.85 194.00 226.80 194.36 224.60L203.33 170.21L158.67 183.31C156.59 183.92 155.16 181.24 156.83 179.85L203.33 141.42Z" fill="#EB2628" /></g></svg>
      </div>
      <div className="vai-demo-type">
        <span className="vai-demo-type-inner">
          <span className="vai-demo-type-wrap"><span className="vai-demo-type-text">Hello, I&apos;m VictorAI. Let&apos;s chat! Ask me something about Vic&apos;s projects, or about her.</span></span>
          <span className="vai-demo-caret" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

export function AxoDemo() {
  return (
    <div className="axo-demo" aria-hidden="true">
      <div className="axo-stage">
        <div className="axo-scene axo-scene-compose">
          <div className="axo-card">
            <p className="axo-card-label">Get a quote</p>
            <div className="axo-card-body">
              <div className="axo-fields">
                <div className="axo-form-row"><span className="axo-form-field-label">Car</span><span className="axo-form-value axo-form-value-1">Nissan Sentra</span></div>
                <div className="axo-form-row axo-form-row-last"><span className="axo-form-field-label">Coverage</span><span className="axo-form-value axo-form-value-2">Full coverage</span></div>
              </div>
              <div className="axo-quote-preview-shell axo-quote-preview">
                <span className="axo-quote-preview-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg></span>
                <p className="axo-quote-preview-label">Estimated</p>
                <p className="axo-quote-preview-price">$62<span>/mo</span></p>
              </div>
            </div>
            <div className="axo-actions">
              <div className="axo-chip-group">
                <span className="axo-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg></span>
                <span className="axo-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="2.5" y="13" width="4" height="7" rx="2" /><rect x="17.5" y="13" width="4" height="7" rx="2" /><path d="M19.5 20a4 4 0 0 1-4 4h-2" /></svg></span>
                <span className="axo-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M12 20V4M20 20v-7" /></svg></span>
              </div>
              <span className="axo-send"><span className="axo-send-ripple" aria-hidden="true" /><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2.5-7L3 11z" /></svg></span>
            </div>
          </div>
        </div>
        <div className="axo-scene axo-scene-loading">
          <div className="axo-card axo-card-loading">
            <p className="axo-card-label">Syncing across channels</p>
            <div className="axo-card-body">
              <div className="axo-fields">
                <div className="axo-loading-row">
                  <span className="axo-spinner" aria-hidden="true" />
                  <div className="axo-skeleton"><span className="axo-skeleton-bar axo-skeleton-bar-1" /><span className="axo-skeleton-bar axo-skeleton-bar-2" /></div>
                </div>
              </div>
              <div className="axo-quote-preview-shell">
                <span className="axo-skeleton-circle" aria-hidden="true" />
                <span className="axo-skeleton-bar" style={{ width: '70%' }} />
                <span className="axo-skeleton-bar axo-skeleton-bar-lg" style={{ width: '48%' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="axo-result axo-result-1">
          <div className="axo-result-card">
            <span className="axo-result-badge axo-result-badge-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg></span>
            <p className="axo-result-title">Picked up on the site</p>
            <p className="axo-result-sub">Right where they left off</p>
          </div>
        </div>
        <div className="axo-result axo-result-2">
          <div className="axo-result-card">
            <span className="axo-result-badge axo-result-badge-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="2.5" y="13" width="4" height="7" rx="2" /><rect x="17.5" y="13" width="4" height="7" rx="2" /><path d="M19.5 20a4 4 0 0 1-4 4h-2" /></svg></span>
            <p className="axo-result-title">Flagged for a call</p>
            <p className="axo-result-sub">Lead scored automatically</p>
          </div>
        </div>
        <div className="axo-result axo-result-3">
          <div className="axo-result-card">
            <span className="axo-result-badge axo-result-badge-3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M12 20V4M20 20v-7" /></svg></span>
            <p className="axo-result-title">Tracked in the BackOffice</p>
            <p className="axo-result-sub">Through the full policy lifecycle</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UndpDemo() {
  return (
    <div className="undp-demo" aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="undpRgbSplit" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
            <feOffset in="r" dx="6" dy="0" result="ro" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
            <feOffset in="b" dx="-6" dy="0" result="bo" />
            <feBlend in="ro" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="bo" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div className="undp-grain" />
      <div className="undp-questions">
        <p className="undp-q undp-q-1">She gets sick. Her income stops.<br />Then what?</p>
        <p className="undp-q undp-q-2">Why has insurance never<br />spoken her language?</p>
        <p className="undp-q undp-q-3">What if sign-up<br />meant zero forms?</p>
        <p className="undp-q undp-q-4">What does trust look like<br />with no screen at all?</p>
      </div>
      <div className="undp-glitch-scan" />
      <div className="undp-glitch-bar" />
    </div>
  );
}

export function CalendarLoopDemo() {
  return (
    <div className="loop-demo" aria-hidden="true">
      <div className="loop-demo-stage">
        <div className="loop-demo-scene loop-demo-scene-1">
          <p className="loop-demo-hint">&#10022; Tap any day to simulate an expense</p>
          <div className="loop-demo-card">
            <div className="loop-demo-big-cal-row">
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Sun</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">12</span></span></div>
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Mon</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">13</span></span></div>
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Tue</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">14</span></span></div>
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Wed</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">15</span></span></div>
              <div className="loop-demo-big-cal-col is-tapped">
                <span className="loop-demo-big-dow">Thu</span>
                <span className="loop-demo-big-num-wrap"><span className="loop-demo-big-fill" aria-hidden="true" /><span className="loop-demo-big-ripple" aria-hidden="true" /><span className="loop-demo-big-num">16</span></span>
              </div>
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Fri</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">17</span></span></div>
              <div className="loop-demo-big-cal-col"><span className="loop-demo-big-dow">Sat</span><span className="loop-demo-big-num-wrap"><span className="loop-demo-big-num">18</span></span></div>
            </div>
          </div>
        </div>
        <div className="loop-demo-scene loop-demo-scene-2">
          <p className="loop-demo-hint">Simulate Expense</p>
          <div className="loop-demo-big-amount">
            <span className="loop-demo-big-dollar">$</span>
            <span className="loop-demo-big-typed-wrap"><span className="loop-demo-big-typed">45</span></span>
            <span className="loop-demo-big-caret" aria-hidden="true" />
          </div>
          <div className="loop-demo-big-btn">Calculate Impact</div>
        </div>
        <div className="loop-demo-scene loop-demo-scene-3">
          <div className="loop-demo-big-result">
            <span className="loop-demo-big-result-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3 11 14.8l4.5-5.6" /></svg></span>
            <p className="loop-demo-big-result-headline">You&apos;ll be fine</p>
            <p className="loop-demo-big-result-sub">Your projected balance will be <strong>$1,382</strong></p>
          </div>
        </div>
      </div>
      <div className="loop-demo-dots"><span className="loop-demo-dot loop-demo-dot-1" /><span className="loop-demo-dot loop-demo-dot-2" /><span className="loop-demo-dot loop-demo-dot-3" /></div>
    </div>
  );
}

export function ShowMathDemo() {
  return (
    <div className="loop-demo loop-demo-phone" aria-hidden="true">
      <div className="loop-demo-phone-stage">
        <div className="loop-demo-phone-result-view">
          <div className="loop-demo-phone-result-box">
            <p className="loop-demo-phone-result-headline">You&apos;ll be fine! &#127881;</p>
            <p className="loop-demo-phone-result-sub">Your projected balance will be <strong>$1,392</strong></p>
          </div>
          <div className="loop-demo-phone-pills"><span className="loop-demo-phone-pill">&#128022; Move to Savings</span><span className="loop-demo-phone-pill">&#128737; Set a Limit</span></div>
          <div className="loop-demo-tapbtn-wrap"><span className="loop-demo-tapbtn-ripple" aria-hidden="true" /><div className="loop-demo-tapbtn">Show me the math &rsaquo;</div></div>
        </div>
        <div className="loop-demo-phone-drawer">
          <div className="loop-demo-phone-sheet-handle" />
          <div className="loop-demo-phone-drawer-head"><span className="loop-demo-phone-drawer-title">How we calculated this</span><span className="loop-demo-phone-drawer-close" aria-hidden="true">&times;</span></div>
          <div className="loop-demo-phone-rows">
            <div className="loop-demo-phone-row">
              <span className="loop-demo-phone-icon is-pos" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M16 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" /></svg></span>
              <div className="loop-demo-phone-row-main"><div className="loop-demo-phone-row-head"><span>Current Balance</span><span className="is-pos">+$2,500</span></div><div className="loop-demo-phone-bar"><span style={{ width: '100%', background: '#2FB768' }} /></div></div>
            </div>
            <div className="loop-demo-phone-row">
              <span className="loop-demo-phone-icon" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1v-9" /></svg></span>
              <div className="loop-demo-phone-row-main"><div className="loop-demo-phone-row-head"><span>Rent</span><span>-$1,100</span></div><div className="loop-demo-phone-bar"><span style={{ width: '44%', background: '#A9A5B3' }} /></div></div>
            </div>
            <div className="loop-demo-phone-row">
              <span className="loop-demo-phone-icon" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21.5 7H6" /></svg></span>
              <div className="loop-demo-phone-row-main"><div className="loop-demo-phone-row-head"><span>This Week&apos;s Coffee</span><span>-$8</span></div><div className="loop-demo-phone-bar"><span style={{ width: '6%', background: '#A9A5B3' }} /></div></div>
            </div>
            <div className="loop-demo-phone-row">
              <span className="loop-demo-phone-icon is-purple" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3 11 14.8l4.5-5.6" /></svg></span>
              <div className="loop-demo-phone-row-main"><div className="loop-demo-phone-row-head"><span>Safe Balance</span><span className="is-purple">$1,392</span></div><div className="loop-demo-phone-bar"><span style={{ width: '56%', background: '#7657D6' }} /></div></div>
            </div>
          </div>
          <p className="loop-demo-phone-done">Got it, thanks!</p>
        </div>
      </div>
    </div>
  );
}

export function NetflixLearnDemo() {
  return (
    <div className="loop-demo" aria-hidden="true">
      <div className="loop-demo-stage">
        <div className="loop-demo-scene loop-netflix-scene-a">
          <div className="loop-demo-charges-wrap">
            <div className="loop-netflix-list-head">
              <p className="loop-netflix-title">Predicted Charges</p>
              <span className="loop-netflix-editbtn-wrap"><span className="loop-netflix-editbtn-edit">Edit</span><span className="loop-netflix-editbtn-done">Done</span><span className="loop-netflix-ripple loop-netflix-ripple-editbtn" aria-hidden="true" /></span>
            </div>
            <div className="loop-demo-charges-list-wrap">
              <div className="loop-demo-charges-list">
                <div className="loop-demo-charge-row"><span className="loop-netflix-select-dot" aria-hidden="true" /><span className="loop-demo-charge-name">Rent</span><span className="loop-demo-charge-right"><span className="loop-demo-charge-amt">$1,100</span></span></div>
                <div className="loop-demo-charge-row loop-demo-charge-netflix"><span className="loop-netflix-select-dot loop-netflix-select-dot-active" aria-hidden="true">&#10003;</span><span className="loop-demo-charge-name">Netflix</span><span className="loop-demo-charge-right"><span className="loop-demo-charge-amt">$15</span></span><span className="loop-netflix-ripple loop-netflix-ripple-select" aria-hidden="true" /></div>
                <div className="loop-demo-charge-row"><span className="loop-netflix-select-dot" aria-hidden="true" /><span className="loop-demo-charge-name">Spotify</span><span className="loop-demo-charge-right"><span className="loop-demo-charge-amt">$6</span></span></div>
                <div className="loop-demo-charge-row"><span className="loop-netflix-select-dot" aria-hidden="true" /><span className="loop-demo-charge-name">Gym</span><span className="loop-demo-charge-right"><span className="loop-demo-charge-amt">$40</span></span></div>
              </div>
              <div className="loop-demo-charges-fade" aria-hidden="true"><span className="loop-netflix-delete-btn">Delete</span><span className="loop-netflix-ripple loop-netflix-ripple-deletebtn" aria-hidden="true" /></div>
            </div>
          </div>
        </div>
        <div className="loop-demo-scene loop-netflix-scene-b">
          <div className="loop-demo-learn-chip">
            <span className="loop-demo-learn-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3 11 14.8l4.5-5.6" /></svg></span>
            <div><p className="loop-demo-learn-title">Got it, learning from this</p><p className="loop-demo-learn-sub">We won&apos;t count Netflix next month</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuoteManagerDemo() {
  return (
    <div className="mapfre-row-image qm-row-image">
      <div className="qm-browser" aria-hidden="true">
        <div className="qm-browser-bar"><span className="qm-dot qm-dot-r" /><span className="qm-dot qm-dot-y" /><span className="qm-dot qm-dot-g" /></div>
        <div className="qm-stage">
          <div className="qm-pricing-view">
            <div className="qm-frame">
              <div className="qm-screenshot" />
              <div className="qm-cta" />
              <div className="qm-ripple" />
              <div className="qm-cursor"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2l14 7-6 2-2 6-6-15z" /></svg></div>
            </div>
          </div>
          <div className="qm-blank-view" />
        </div>
      </div>
    </div>
  );
}

export function BackofficeDemo() {
  return (
    <div className="mapfre-row-image bo-row-image">
      <div className="bo-stage" aria-hidden="true">
        <div className="bo-scene bo-scene-list">
          <div className="bo-lead-row">
            <span className="bo-avatar">JJ</span>
            <div className="bo-lead-row-text"><span className="bo-lead-name">Jan Jansen</span><span className="bo-lead-sub">Nissan Sentra 2023</span></div>
            <span className="bo-badge">Payment failed</span>
          </div>
        </div>
        <div className="bo-scene bo-scene-detail">
          <div className="bo-detail-head"><span className="bo-avatar bo-avatar-lg">JJ</span><div className="bo-detail-head-text"><span className="bo-lead-name">Jan Jansen</span><span className="bo-badge">Payment failed</span></div></div>
          <div className="bo-detail-rows">
            <div className="bo-detail-row"><span className="bo-detail-label">Vehicle</span><span className="bo-detail-value">Nissan Sentra 2023</span></div>
            <div className="bo-detail-row"><span className="bo-detail-label">Amount due</span><span className="bo-detail-value bo-detail-amount">$1,232.24</span></div>
          </div>
          <div className="bo-contact-wrap"><div className="bo-contact-btn">Contact</div><div className="bo-ripple" /><div className="bo-cursor"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2l14 7-6 2-2 6-6-15z" stroke="#FFFFFF" strokeWidth="1" /></svg></div></div>
        </div>
        <div className="bo-scene bo-scene-whatsapp">
          <div className="bo-wa-header"><span className="bo-wa-back">&lsaquo;</span><span className="bo-avatar bo-avatar-sm">JJ</span><div className="bo-wa-header-text"><span className="bo-wa-name">Jan Jansen</span><span className="bo-wa-status">online</span></div></div>
          <div className="bo-wa-body">
            <div className="bo-wa-bubble bo-wa-bubble-out">
              <span className="bo-wa-bubble-text">Hi Jan, I&apos;m here to help with your payment</span>
              <span className="bo-wa-meta">9:41 <svg className="bo-wa-check" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L4.5 9L10.5 1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 5.5L9 9L15 1.5" stroke="currentColor" strokeWidth="1.3" /></svg></span>
              <div className="bo-wa-cta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14L21 3" /></svg><span>Pay here</span></div>
            </div>
            <div className="bo-wa-typing"><span /><span /><span /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FailureResponseDemo() {
  return (
    <div className="mapfre-row-image fr-row-image">
      <div className="fr-stage" aria-hidden="true">
        <div className="fr-scene fr-scene-quick">
          <div className="fr-pill">
            <div className="fr-pill-state fr-pill-processing"><span className="fr-spinner" /><span className="fr-pill-text">Processing payment&hellip;</span></div>
            <div className="fr-pill-state fr-pill-confirmed"><svg className="fr-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg><span className="fr-pill-text fr-pill-text-ok">Confirmed</span></div>
          </div>
        </div>
        <div className="fr-scene fr-scene-escalate">
          <div className="fr-pill fr-pill-escalate">
            <div className="fr-pill-state fr-pill-state-static"><span className="fr-icon-slot"><span className="fr-spinner fr-spinner-escalate" /><span className="fr-alert-icon">!</span></span><span className="fr-pill-text">Processing payment&hellip;</span></div>
          </div>
          <div className="fr-card">
            <div className="fr-card-head"><span className="fr-card-icon">!</span><span className="fr-card-title">We hit a snag</span></div>
            <div className="fr-chips">
              <span className="fr-chip"><svg className="fr-chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Plan</span>
              <span className="fr-chip"><svg className="fr-chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Data</span>
              <span className="fr-chip"><svg className="fr-chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Progress</span>
            </div>
            <div className="fr-handoff"><span className="fr-agent-avatar">A</span><span className="fr-handoff-text">Picked up with full context</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LifecycleDemo() {
  return (
    <div className="mapfre-row-image lc-row-image">
      <div className="lc-stage" aria-hidden="true">
        <div className="lc-visit lc-visit-renewal"><span className="lc-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg></span><span className="lc-badge-label">Renewal</span></div>
        <div className="lc-visit lc-visit-installments"><span className="lc-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></span><span className="lc-badge-label">Installments</span></div>
        <div className="lc-visit lc-visit-failed"><span className="lc-badge lc-badge-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span><span className="lc-badge-label">Failed payment</span></div>
        <div className="lc-visit lc-visit-cancellations"><span className="lc-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></span><span className="lc-badge-label">Cancellations</span></div>
        <div className="lc-ball" />
        <div className="lc-ring-outline" />
        <div className="lc-ring-dot lc-ring-dot-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg></div>
        <div className="lc-ring-dot lc-ring-dot-right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
        <div className="lc-ring-dot lc-ring-dot-bottom lc-ring-dot-failed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
        <div className="lc-ring-dot lc-ring-dot-left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
      </div>
    </div>
  );
}

export function DashboardDemo() {
  return (
    <div className="mapfre-row-image db-row-image">
      <div className="db-browser">
        <div className="db-browser-bar"><span className="db-dot db-dot-r" /><span className="db-dot db-dot-y" /><span className="db-dot db-dot-g" /></div>
        <div className="db-stage" aria-hidden="true">
          <img className="db-screenshot" src="/axa-dashboard.png" alt="" />
        </div>
      </div>
    </div>
  );
}
