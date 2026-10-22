'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { VictorAIChatProvider, useChatContext } from '@/components/chat/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';
import Navbar from '@/components/nav/Navbar';
import Footer from '@/components/layout/Footer';
import { TOPICS, STARTERS } from '@/content/chatTopics';
import {
  PHANTOM_PROMPTS,
  GRADIENTS as PROJECT_GRADIENTS,
  ExpenseEntryDemo,
  VictorAIDemo,
  AxoDemo,
  UndpDemo,
  CalendarLoopDemo,
  ShowMathDemo,
  NetflixLearnDemo,
  QuoteManagerDemo,
  BackofficeDemo,
  FailureResponseDemo,
  LifecycleDemo,
  DashboardDemo,
} from './ProyectosDesktop';
import './proyectos-mobile.css';

// ============================================================================
// Static data -- ported verbatim from ProjectsMobile.dc.html's own data array,
// which is itself a mobile-first reshape of the desktop case-study content
// (same copy, same facts): a single flat `sections` list per project (no
// Mapfre-specific TOC/meta-grid layout -- desktop's mapfre-toc rail has no
// mobile equivalent on purpose), and the funnel demo folded in as an
// ordinary lead block (demoId 'mapfre-funnel') instead of a separate fixed
// box. Kept as mobile's own copy of this data (rather than importing
// desktop's PROJECTS) because the shapes genuinely differ -- only the demo
// widgets below are shared, since those are pixel-identical markup.
// ============================================================================

const PROJECT_LABELS = [
  'Driving 35% YoY growth',
  'AI Cash Flow Predictor',
  'Unlocking Health Access',
  'Scaling enterprise sales',
  'VictorAI',
  'Inclusive finance architecture',
];
// Stable anchor ids for direct linking (e.g. #mapfre), same order as
// PROJECT_LABELS -- do not rename or reorder, they may be referenced externally.
const PROJECT_SLUGS = ['mapfre', 'ai-cash-flow-predictor', 'pulso', 'axa', 'victorai', 'onu-pnud'];

const P = (text) => ({ isP: true, text });
const QUOTE = (text) => ({ isQuote: true, text });
const IMG = (caption, demoId) => ({ isImage: true, caption, demoId: demoId || null });
const VIDEO = (src, position, isLead) => ({ isVideo: true, videoSrc: src, videoStyle: { objectPosition: position || 'center' }, isLeadVideo: !!isLead });
const CARD = (tag, text) => ({ isCard: true, tag, text, cardClass: tag === 'After' ? 'is-after' : '' });
const LEAD = (lead, rest) => ({ lead, rest: ' ' + rest });
const LIST = (items) => ({ isList: true, items });
const QITEM = (tag, paragraphs) => ({ tag, paragraphs: paragraphs.map((t) => ({ text: t })) });
const GRID2 = (items) => ({ isGrid2: true, items });
const COLS = (left, right) => ({ isCols: true, left: left.map((t) => ({ text: t })), right: right.map((t) => ({ text: t })) });
const TWIN = (leftHeading, leftParas, rightHeading, rightParas) => ({ isTwin: true, leftHeading, rightHeading, left: leftParas.map((t) => ({ text: t })), right: rightParas.map((t) => ({ text: t })) });
const RITEM = (tag, text, caption, demoId) => ({ tag, text, caption, demoId: demoId || null });
const ROWS = (items) => ({ isRows: true, items });
const IMGROW = (captions) => ({
  isImgRow: true,
  items: captions.map((c) => {
    const isStr = typeof c === 'string';
    const caption = isStr ? c : c.caption || '';
    const src = isStr ? null : c.src || null;
    return { caption, src, hasSrc: !!src, noSrc: !src };
  }),
});
const SEC = (id, heading, blocks) => ({ id, heading, hasHeading: !!heading, blocks });

const PROJECTS = [
  {
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
      { value: '35.2% YoY', before: '', after: '', hasArrow: false, noArrow: true, label: 'Total sales growth' },
      { value: '', before: '56.5%', after: '97.4%', hasArrow: true, noArrow: false, label: 'Search efficiency' },
      { value: '+$21,140', before: '', after: '', hasArrow: false, noArrow: true, label: 'Recovered annual premium' },
    ],
    sections: [
      SEC('wrong-fix', 'The wrong fix we almost shipped', [
        IMG('Live search funnel: match rate climbing from 56.5% to 97.4%', 'mapfre-funnel'),
        P('Once we relaunched the entire car insurance quotation experience mobile first, something new showed up in the metrics: a huge share of users were dropping off right at the landing page. The obvious move was to redesign the landing page and add more trust signals.'),
        P('But before touching a single pixel, we dug deeper into the funnel and found the real pattern. Most of that drop off was not about the landing page at all. It was happening because users typed their car\'s brand or model and our search could not find it. "Hyundai" typed as "Hiundai" returned nothing. One typo, and the sale was gone before it ever started.'),
        P('The fallback for a failed search was a wizard: collect the user\'s info and have an agent call them with a quote later. It felt like a safety net. It was actually a leak, because most of those users never answered the call. The team\'s first instinct was to fix this with a better CX follow up strategy: improve callback timing, improve the email copy, chase the leads harder. It is a completely reasonable idea, and exactly the kind of patch that quietly turns into its own project, its own backlog, its own team, while the real problem stays untouched underneath it. So we stopped and asked a simpler question: what is actually broken here? Not "how do we get people to pick up the phone." The problem was that users could not find their own car.'),
      ]),
      SEC('real-fix', 'The real fix: Teach the search to understand typos, not the user to spell better with AI', [
        P('If someone had walked into an insurance office in 1995 and said "I have a Hiundai," the agent would have understood instantly and fixed it without even mentioning it. The system needed to do what the human always did.'),
        P('The first idea on the table was to throw AI at every search query, having a model read each user\'s input in real time and figure out what car they meant, on the spot, every single time someone searched. We considered it, and turned it down for this specific problem. Not because AI cannot do it, but because it was the wrong tool for a problem we already understood: we already knew the most common misspellings our users made. So instead of processing every input through a live model, we built a fuzzy search engine tagged against the real, recurring typos we had already seen in the data, using AI as a development accelerator to help spot and tag those patterns faster, not as the live decision maker at checkout.'),
        P('A simple search bar. No live inference. Just real, recurring "wrong" spellings mapped to the right answer.'),
      ]),
      SEC('result', 'From "No" to "Found It" in one sprint', [
        CARD('Before', 'Search efficiency sat at 56.5%. We were only finding about 5 out of every 10 cars people actually owned.'),
        CARD('After', 'Search efficiency got to 97.4%. Nearly 10 out of 10. An estimated +$21,140 in annual premiums that had been silently lost to a search bar that could not spell.'),
        P('Once the search stopped rejecting real customers, total sales grew 35.2% year over year, adding more than 400 additional policies sold per month compared to the year before. Today, when a user\'s car is not found, it is because of a clear business rule, like pickup trucks or motorcycles that this insurer does not underwrite online, not because the tool failed them. That naturally opens the next question: how do we turn those vehicles into a sale too? That is not solved yet, but that is what is coming next.'),
      ]),
      SEC('takeaway', 'The takeaway', [
        P('The biggest lesson here was not technical. It was about where to look. The team\'s first instinct was to treat the symptom, low callback rates, as its own new project. The real fix was one level up: stop losing the user in the first place.'),
        P('Design\'s job was not to make checkout prettier. It was to notice that "we need better CX follow up" was really code for "our search bar is broken," and to have the discipline to zoom out before building the wrong solution.'),
      ]),
    ],
  },
  {
    slug: 'ai-cash-flow-predictor',
    companyLabel: 'Stanford University COURSE: UX/UI for AI Products',
    title: 'AI Cash Flow Predictor: Phantom Money',
    status: 'Stanford concept project',
    meta: [
      { label: 'Role', value: 'Product Designer' },
      { label: 'Timeline', value: '2026, during the course' },
      { label: 'Skills', value: 'Product Design, AI Agents, Ethics in AI Design, UX for AI Systems' },
    ],
    stats: [],
    sections: [
      SEC('no-banking-app', 'The question no banking app in México was answering', [
        IMG('Space for the expense-entry demo: type an upcoming expense, see the prediction', 'expense-entry'),
        P("You open your banking app. The number is positive. You feel fine. Two days later the electricity bill hits, or an annual insurance payment you'd forgotten about, and suddenly that \"fine\" balance wasn't fine at all. That gap, between what your balance shows and what you can actually spend, became the seed of this project: an AI module for a banking app built to answer one question, every day."),
        QUOTE('"How much money do I actually have free to spend, without putting my future commitments at risk?"'),
        P("This was designed during a UX/UI for AI Products course at Stanford. It's a concept, not a shipped product. I'm including it because the thinking behind it, the trade offs, the ethics, is exactly the kind of thinking I want to keep doing."),
      ]),
      SEC('showing-the-past', 'Why "showing the past" was never going to be enough', [
        P('Every banking app I looked at is good at one thing: showing you where your money went. Categorized, colored, charted. A rearview mirror. Nobody was answering the forward looking question. "What did I spend" is easy to answer. "What can I still spend without breaking something later" is the one that mattered, and that gap looked small on paper, until I started talking to real people.'),
      ]),
      SEC('never-the-rent', "It's never the rent", [
        P('Two users stood out: a 54 year old professional who manages his money in Excel and mental subaccounts, and a 20 year old psychology student who checks her balance like a traffic light, money left means keep spending, money low means stop.'),
        P("Different generations, different tools, same exact wound. Both were blindsided by small, irregular expenses, never the big fixed ones. He already has rent and insurance prorated like clockwork; what gets him is the accumulation of small unplanned purchases. She doesn't budget at all, she just watches the number drop, surprised at how fast daily coffees eat through what felt like \"extra\" money."),
        P('This is where the idea stopped being a guess and became a target. Instead of "track your spending," the real problem became "catch the pattern you can\'t see yourself." Fixed expenses are easy to plan around. Irregular ones are invisible until they\'ve already hurt you.'),
      ]),
      SEC('copilot-never-autopilot', 'Copilot, never autopilot', [
        P('The next question was harder: how much should the AI be allowed to do on its own, moving money, blocking a purchase, versus only recommend, leaving the click to the user? Technically, full automation would have been easier and more "intelligent looking." I decided against it, because both users had already built their own manual systems of control, his subaccounts, her separate "off limits" savings, and they trusted those systems because they\'d built them themselves. An algorithm quietly moving their money would feel like losing control over something personal, not like help.'),
        P("So the rule became: the AI can calculate anything, but it can never execute anything. Every projection comes with a real choice sitting next to it, and the user clicks, every time, nothing moves, nothing gets blocked, unless they say so. Think of a copilot next to an autopilot: an autopilot flies the plane for you, while a copilot sits beside you, points at what's ahead, and keeps your hands on the wheel. Once I named that principle, I used it as a filter for every decision after it."),
        P("On screen, that principle takes the shape of a calendar. The user taps any day and a simulator opens, asking how much they're thinking of spending. The projection comes back next to small, secondary actions the user can choose from, and always an option that means nothing happens at all. No step executes on its own."),
        IMG('Calendar demo: tap a day, enter a hypothetical expense, see the projection', 'calendar-loop'),
      ]),
      SEC('black-box-honest', 'Making a black box feel honest', [
        P("A prediction is only useful if people believe it, and I didn't want that belief to depend on blind faith in an algorithm. People tend to stop questioning a number the moment AI produces it, so every prediction here needed to bring its own evidence."),
        P("Show the Math, a low hierarchy button, opens a breakdown: current balance, minus predicted rent, minus this week's coffee pattern, equals your safe balance. I designed it the way you'd explain math to a curious kid, not the way you'd explain an algorithm to an engineer. The user can also correct it: if the AI assumes a Netflix charge that got cancelled, they edit that line right there, and the system remembers. That protects the user's sense of agency and makes the model more accurate over time, at the same time."),
        P('Language mattered just as much. Never "you will have exactly $500." Always a range: "$450 to $550, approximately." Certainty is a promise an algorithm can\'t keep, so the interface never makes promises the model can\'t back up.'),
        P('On screen, that same idea shows up in how simple the breakdown stays, numbers anyone can follow at a glance, nothing that asks the user to think like an analyst.'),
        IMG('Demo: tap "Show the Math" to reveal the breakdown', 'show-math'),
        IMG('Demo: user correcting a Netflix charge, and the AI learning from it', 'netflix-learn'),
      ]),
      SEC("question-couldnt-design-around", "The question I couldn't design around", [
        P('The further I got, one uncomfortable question kept surfacing: if this works, what happens when it works too well?'),
        LIST([
          LEAD('Bias', ' An algorithm trained to flag "risky" spending could easily penalize people living paycheck to paycheck or on irregular freelance income, mistaking survival for recklessness. I built in a way for users to flag atypical expenses, a medical emergency, for example, so one event never becomes a permanent judgment.'),
          LEAD('Privacy turning into a gate', " In one of the course's ethics discussions, we looked at a scenario where a \"safe balance\" leaked outside the app and was used to include or exclude someone from a service. That scenario is exactly why the Safe Balance can never be queried by any third party, not stores, not other apps, not even other modules of the same bank, without explicit permission. A privacy mode also hides real numbers in public settings, because financial dignity shouldn't depend on who's standing next to you at checkout."),
          LEAD('Quiet dependency', " The Gen Z user in my research already runs on a reactive traffic light system. A tool this convenient could easily make her stop thinking altogether and just wait for a green light. So I built in deliberate friction: anything critical forces an actual human click, never a silent automatic action."),
        ]),
        P("None of these are solved problems. They're the kind of thing you keep watching for, not check off a list. Naming them before a single line of code felt like the responsible way to design something this close to people's real anxieties."),
      ]),
      SEC('where-this-leaves-me', 'Where this leaves me', [
        P('This project represents the way I like to design: start from a real, specific, almost embarrassing human moment (checking your balance and still getting surprised), follow it all the way down to the ethical edge cases nobody wants to think about, and land on interface decisions that respect the person on the other end of the screen.'),
        P('Whether this exact concept ever gets built is honestly beside the point. The muscle I trained here, holding "helpful" and "respectful of autonomy" in the same hand without letting go of either, is the one I bring to every project since.'),
      ]),
    ],
  },
  {
    slug: 'pulso',
    companyLabel: '',
    title: 'Pulso: Unlocking Health Access',
    status: 'Paused startup project',
    meta: [
      { label: 'Role', value: 'UX Designer & Co-Founder' },
      { label: 'Timeline', value: '2025' },
      { label: 'Team with', value: 'Santiago Villarreal, Viridiana González and Brenda Sánchez' },
      { label: 'Skills', value: 'Strategic Product Design, UX' },
    ],
    stats: [],
    sections: [
      SEC('the-moment', 'The moment that started everything', [
        VIDEO('/pulso-video-1.mp4', 'center 20%', true),
        P('A patient walks into a private clinic in Mexico needing treatment. The clinic can help them. They walk back out anyway, because the cost has to be paid upfront and there is no fast, low friction way to cover it in that moment. A large share of healthcare spending in Mexico comes directly out of people\'s pockets, and traditional credit rarely reaches the people this hits hardest. Most don\'t have a credit card, and even when a bank approves a loan, the process is too slow for a decision that often needs to happen the same day, in a clinic waiting room.'),
        P('Pulso was our answer to that gap. It started inside Guros: my boss there invited me and two other colleagues to build it with him, and the four of us became cofounders. Together we set out to build a financing product connecting clinics, lenders and patients through a fast, low risk application flow, so people could access medical procedures they could not otherwise afford in the moment.'),
        P("I was the UX designer and a cofounder, responsible for the full patient facing experience: how someone discovers Pulso inside a clinic, how they apply, how the system recognizes them if they come back, and how all of this holds together across channels. The business model, the lender partnerships and the credit logic were shaped together as a team, but the interaction design, the flow architecture and the decisions about reducing friction for this specific user were mine to define."),
        P("The person we were designing for earns one to two minimum wages, usually without a credit card and without much history with formal banking. Many are not frequent smartphone users beyond messaging apps like WhatsApp, and digital forms, uploading documents or navigating an app are not things they do often or comfortably. Every decision below was shaped around that person."),
      ]),
      SEC('wrong-place', 'Why the counter was the wrong place to ask', [
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
      ]),
      SEC('whatsapp-signup', 'Why WhatsApp carried the whole signup', [
        P("For this audience, a traditional email and password signup adds unnecessary weight it doesn't need to carry. The right channel had to be one people already trusted and already had open. I chose WhatsApp for verification because it is close to universal in Mexico: INEGI's 2025 household survey on internet use puts penetration above 90% among the country's internet users, well ahead of any other messaging platform. Most people already have it open and know how to use it, unlike a dedicated app they would need to download and learn."),
        P("I designed registration around the phone number as the identifier, verified once through a WhatsApp one time code. If someone drops off mid application, we still have their contact and can bring them back through WhatsApp instead of losing them entirely. The application itself splits into two paths. A new user goes through registration, clinic identification, choosing an amount and payment plan, and then identity verification, in that order, so the person sees the benefit, how much, how many payments, before being asked for anything sensitive. A returning user gets a much shorter path: phone plus OTP, clinic code, treatment cost, and a quick confirmation that their address and income are still accurate. Because they already have a payment history, approval can come back in minutes instead of hours."),
        P('Every screen in the form asks only one question at a time, and numeric fields automatically bring up the number keyboard instead of the full keyboard. Small details, but they matter for users who are not necessarily comfortable navigating digital forms. The whole signup was built to ask as little as possible, as late as possible.'),
      ]),
      SEC('the-wait', 'Building in a wait nobody technically needed', [
        VIDEO('/pulso-video-3.mp4', 'center 20%'),
        P("The actual credit review can take just seconds or minutes. I still designed a 24 hour approval window on top of it, on purpose. The theory behind it: if the approval feels like the result of a careful review rather than an instant decision, people may value it more and take their payments more seriously. An answer that comes back too fast can read as careless, even when it's accurate."),
        P('I designed the copy around that waiting period to reinforce this, with language closer to "we\'re reviewing your case carefully to get you the best possible rate," and a follow up message during the wait so the user doesn\'t feel forgotten. This is still a hypothesis I want to test, and the theory is what shaped the decision to keep the wait rather than remove it.'),
      ]),
      SEC('trust-out-loud', 'Trust had to be said out loud', [
        P("A returning user with a good payment history already represents lower risk. I didn't want the system to just apply that quietly in the background. I wanted it to tell the person."),
        P("If someone shows renewed interest in applying again, WhatsApp can let them know they are likely to qualify faster this time. The same idea shows up right after a successful application, on the thank you screen, where a returning user with good history sees a note about their improved standing, along with a simple button to receive more information by WhatsApp if they want it. It's an opt in way of keeping the relationship open, rather than pushing messages at someone who didn't ask for them. Trust, once earned, became something the product said back to the user instead of something it just quietly counted."),
      ]),
      SEC('open-questions', "Open questions I'm still working through", [
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
            "One option I'm considering is pointing the person toward other places where they could still apply for financing, rather than leaving them at a dead end.",
          ]),
          QITEM('A missed payment', [
            "In a similar way, I've thought through the approval side of trust, but not yet the moment where someone falls behind. Getting that tone right, especially if the reason behind a late payment might be that someone's health took a turn for the worse, is still ahead of me.",
          ]),
        ]),
      ]),
      SEC('where-it-stands', 'Where this project stands', [
        P('Pulso as a company is currently paused. A large partnership opportunity came up that needed our full time attention elsewhere, and the three of us moved on to that. But the problem stayed with me, and I keep iterating on the concept in my own time, refining the flow and thinking through the open questions above. This case study reflects that ongoing thinking rather than a finished, shipped product.'),
      ]),
    ],
  },
  {
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
    stats: [],
    sections: [
      SEC('storefront', 'A storefront that almost nobody walks through', [
        IMG('A way to represent omnichanelty', 'axa-omnichannel'),
        P("AXA is one of Mexico's top 3 auto insurers, and individual auto is the only product it sells online. People show up every day: they open the site, request a quote, look around. Then almost all of them buy the old way, on the phone, with an agent walking them through it step by step."),
        P('The easy fix is a better storefront: a cleaner checkout, clearer trust signals, a nicer quote screen. But the real pattern lives somewhere else. Someone can\'t find their own car in the search. A payment stalls. A tab gets closed halfway through. They vanish, with no record and no way back. That vanishing moment, more than the storefront, was the real thing to design for.'),
      ]),
      SEC('phone-calls', 'What the phone calls were really saying', [
        P("As Design Lead, I didn't start from a redesign brief. I started by asking why demand and conversion didn't match: quote requests were healthy, purchases weren't, and the two should have moved together if the gap were really about UI polish."),
        P('The pattern that explained it lived in the handoff between channels. Insurance is a trust-heavy purchase, and the moment a customer\'s path online broke, even briefly, they reverted to the one channel they already trusted: a human on the phone. A fix that stayed inside the website would only ever help people who never hit a snag. The people actually worth designing for were the ones who did.'),
        P("That reframing is what I took into the room with AXA's architect, product owner and tech lead: how do we build a system that can lose nobody, even when the website can't finish the job alone?"),
      ]),
      SEC('system-behind', 'The system behind the storefront', [
        P('The brief grew into three connected products: the e-commerce site where a customer finds their car, compares coverage and pays; the BackOffice the Contact Center uses to pick up a customer right where they left off; and a Dashboard where AXA can see how the whole channel performs, end to end. A few decisions carried the reframing all the way to the screen:'),
        ROWS([
          RITEM('The Quote Manager', 'Was built to feel like a real decision someone is making, in plain language instead of legal text. Packages are ordered so comparing them takes less effort, and personalization sits visually secondary, there for the customer who wants it, without competing with the easy choice.', 'Space for a Quote Manager screenshot', 'quote-manager'),
          RITEM('Lead scoring at every drop-off', 'Leaving the quote screen, abandoning at checkout, a failed payment: each one creates a lead in the BackOffice, rated on a five-star scale by how close the customer got to buying. The Contact Center stops guessing who to call first.', 'Space for a screenshot of a dropped flow handed to an agent on WhatsApp', 'backoffice-whatsapp'),
          RITEM('A step-by-step response to failure', 'A brief hiccup retries quietly and the customer never notices. A longer one surfaces a clear message, and saves exactly where the customer was: plan, data, progress, so an agent can continue the conversation with no repeated questions.', 'Space for a real-time error detection screenshot', 'failure-response'),
          RITEM('The full policy lifecycle', 'Renewals, installments, failed payments and cancellations all follow the same pattern: automated attempts first, then a smooth handoff to a person when it\'s needed.', 'Space for a screenshot of the automated full policy cycle', 'lifecycle'),
          RITEM('The Dashboard', 'Pulls data from both products so different teams, from a Contact Center supervisor to someone tracking overall performance, each see where in the funnel people are lost, without having to interpret numbers that were never meant for them.', 'Space for a dashboard screenshot, zoomed from the full view into the metric cards', 'dashboard'),
        ]),
      ]),
      SEC('what-this-proves', 'What this proves', [
        P('A conversion problem is rarely a UI problem. This gap wasn\'t going to close with a nicer button, it closed by designing for everyone the button failed.'),
        P('Omnichannel is not a buzzword when it means an agent never has to ask "can you repeat that." It is a design commitment that shows up in every screen and every handoff.'),
        P('Designing a lifecycle, not just a funnel, changes what "done" looks like. A sale is not the finish line. Renewal, a smooth cancellation, and a fair endorsement process are part of the same product.'),
        P('Scoring and prioritization are design decisions, not just backend logic. Deciding what makes a lead worth calling first is a judgment call about the business, made visible through design.'),
        P('Design leadership at this scale means proposing and defending solutions in front of a large enterprise client, not just handing off files. Being in the room, walking AXA through the reasoning behind a flow, is part of the job, not a side effect of it.'),
      ]),
    ],
  },
  {
    slug: 'victorai',
    companyLabel: 'Ai assistant for my portfolio',
    title: "VictorAI: When I'm not in the room, my portfolio still answers",
    status: 'Shipped & live',
    meta: [
      { label: 'Role', value: 'Owner' },
      { label: 'Timeline', value: 'Free time in 2026' },
      { label: 'Skills', value: 'UX Copy, Frontend Design, Research Synthesis' },
    ],
    stats: [],
    sections: [
      SEC('silence-problem', 'The silence problem', [
        IMG("hello, I'm VictorAI", 'victorai-intro'),
        P("Someone lands on my portfolio and gets curious about a project. They read the Mapfre case study, get hooked on the jump from 56% to 97% search success, and want to know more. What was the first idea that did not work? There is no one there to ask. A portfolio tells its story once and stops. The visitor either accepts the silence and moves on, or closes the tab with a half formed question still stuck in their head."),
        P("Every one of those questions is a small leak in the only thing a portfolio is actually for: turning curiosity into a conversation. Multiply that across every visitor, and the loss adds up quietly, with nobody noticing it happen. So I built something that could stay in the room after I leave it. The starting question was a product one: what does someone actually need when I am not there to answer."),
      ]),
      SEC('giving-voice', '', [
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
      ]),
      SEC('designing-conversation', 'Designing the conversation', [
        P('A blank chat box is intimidating. Most people will not type the first question. They will stare at it and leave. So the landing screen offers three doors instead of a blank page: one metric hook, one about how I lead a team, one about who I am outside of work. Whichever one someone picks already says a lot about what they came here for.'),
        P('From there, every topic has a pool of six follow up questions, shown three at a time. Click one and it is marked as seen, so the conversation never repeats itself. In every set of three, one question deliberately opens a door into a different project, so a chat about one case study can wander into leadership, or into a completely different story, without the visitor having to think of what to ask next.'),
        P('Project links follow one small rule: share it once someone shows real interest, never repeat it unprompted in the same conversation. Mentioning it every message would feel like a pop-up ad. Mentioning it once, right when curiosity peaks, feels like a recommendation.'),
      ]),
      SEC('boring-decisions', 'The boring decisions that kept it safe', [
        P('None of this was my usual territory. My day to day is product flows. Learning enough Supabase to make these two decisions on purpose, instead of leaving them to chance, was its own small leap outside what I normally do. Not every decision here makes a good story. Some are just the difference between a project that survives real visitors and one that quietly breaks or gets abused.'),
        GRID2([
          QITEM('Decision', ['A 25 message daily cap per visitor, with a warm "keep talking by email" message instead of a hard stop.']),
          QITEM('Why', ['Keeps the cost predictable without ever making someone feel cut off.']),
          QITEM('Decision', ['The secret backend key never touches the browser, only a public, safe to expose key does.']),
          QITEM('Why', ['One leaked key in frontend code would have handed over the whole database.']),
        ]),
      ]),
      SEC('takeaway', 'The takeaway', [
        P('One more thing worth saying. Writing the content for it turned into time alone with myself, really seeing what I have grown into these past few years, and being honest about what I still want to learn.'),
        P('A chatbot sounds like a gimmick until you notice what it actually takes: a voice that sounds like someone who knows me well, real boundaries, a sense of when to stay quiet, and a plan for the moment it breaks.'),
        P('That is the same list I would use to describe good product design, with or without AI in the room. The chatbot just happens to be the one project where I get to prove it while I am asleep.'),
      ]),
    ],
  },
  {
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
    stats: [],
    sections: [
      SEC('insurance-exists', "Insurance already exists, but it wasn't built for her", [
        IMG('A way to represent the project', 'undp-kit'),
        P('Every week, thousands of women across rural Mexico walk into their nearest microfinance lender to make the payment that keeps their business alive: a market stall, a taco stand, a home sewing shop. Then she gets sick, or pregnant, or her mother needs care. The business stops, and so does the income. The bills keep coming, so she borrows more just to cover the gap her business used to fill.'),
        P('Insurance already exists for exactly these risks: maternity, illness, job loss, death. But it was built for someone else, someone with paperwork to hand over, a claims office nearby, and a fixed paycheck that lines up with a fixed monthly premium. Her income arrives in small, irregular amounts, week by week, and nobody had designed a policy that could move at that same rhythm. She had simply never been invited in.'),
      ]),
      SEC('habit-already-had', 'We built around a habit she already had', [
        P('Every fintech project like this reaches the same fork: build a sleek app, or build around the person already standing in front of you. We chose the second path, and the reasoning came straight from who we were designing for.'),
        P("Most of these women were simply unfamiliar with an app they had never heard of. They had no home internet to open it with and no nearby hospital to make the promise feel real. Asking her to adopt a brand new habit was asking for trust she had no reason yet to give. So we looked for the habit she already had: her weekly walk to the microfinance lender to make her loan payment. That single observation shaped everything that came after it."),
      ]),
      SEC('architecture-behind', 'The architecture behind the folder, the key and the card', [
        P("The real work here lived in the full flow of how trust moves from a person to a product: how a habit becomes an onboarding moment, how a shared data connection with the lender's system replaces a signup form, how a physical key replaces a password, how a claim gets resolved through people who already know her. We mapped every one of those decision points with engineering before a single screen got designed."),
        GRID2([
          QITEM('Offered where trust already lives', ['The same counter where she pays her loan, the same person she already knows, offers the coverage the same day, using information the lender already has on file.']),
          QITEM("Priced to disappear into a payment she's already making", ['Under $3 USD a week, folded into her existing installment, so it never shows up as a new bill to track.']),
          QITEM('Made physical, in three pieces', ['A durable pink folder that keeps every document safe at home. A personal key that works like a login and pulls up her policy to start a claim. A pocket card with emergency numbers, always within reach in their wallet.']),
          QITEM('Claimable through people', ['When something goes wrong, she walks to the corner store or counter she already trusts, and someone she knows helps her file the report.']),
        ]),
        IMGROW([
          { caption: 'An illustration of the laminated pink folder', src: '/undp-folder.png' },
          { caption: "The folder's sticker with a QR code and an 8-digit code", src: '/undp-sticker.png' },
          { caption: 'The pink wallet card with emergency numbers and instructions', src: '/undp-wallet-card.png' },
        ]),
        P('We took the finished architecture to the UNDP offices in Mexico City, competing against other teams for the mandate to bring financial protection to women entrepreneurs who had been left out of it. We placed second, which is the closest thing we have to a metric so far, and it tells us the reasoning held up under real pressure.'),
      ]),
      SEC('what-this-taught', 'What this taught me as a designer', [
        P('Trust is something you design with, not a feature you add at the end. The channel we chose mattered more than any interface we could have built.'),
        P('The best onboarding is one nobody notices. Hers already existed, we just built inside it.'),
        P('Designing a lifecycle, not just a funnel, changes what "done" looks like. A sale is not the finish line. Renewal, a smooth cancellation, and a fair endorsement process are part of the same product.'),
        P('Designing for someone offline still means designing a system, it just runs through people instead of screens.'),
      ]),
    ],
  },
];

// A lead block's demoId gets its own real, ported illustration instead of
// the plain "Space for..." placeholder box -- see IMG/RITEM above. Only a
// slot with no recognized demoId (none of ours, on purpose) falls back to
// the placeholder.
const LEAD_DEMO_IDS = { 'expense-entry': 1, 'axa-omnichannel': 1, 'victorai-intro': 1, 'mapfre-funnel': 1, 'undp-kit': 1 };

// ============================================================================
// Component
// ============================================================================

export default function ProyectosMobile() {
  return (
    <VictorAIChatProvider topics={TOPICS} starters={STARTERS}>
      <ProyectosMobileInner />
    </VictorAIChatProvider>
  );
}

function ProyectosMobileInner() {
  const chat = useChatContext();

  const [activeProject, setActiveProject] = useState(0);
  const [barHidden, setBarHidden] = useState(false);
  const [projSwitching, setProjSwitching] = useState(false);
  const [phantomDay, setPhantomDay] = useState(null);
  const [phantomAmount, setPhantomAmount] = useState('');
  const [phantomCalculating, setPhantomCalculating] = useState(false);
  const [phantomResult, setPhantomResult] = useState(null);
  const [phantomMathOpen, setPhantomMathOpen] = useState(false);
  const [phantomTypeIdx, setPhantomTypeIdx] = useState(0);
  const [phantomTypeLen, setPhantomTypeLen] = useState(0);
  const [phantomTypeDir, setPhantomTypeDir] = useState('type');
  const [funnelMode, setFunnelModeState] = useState('auto');
  const [funnelJustSwitched, setFunnelJustSwitched] = useState(false);
  const [arriveCoverGradient, setArriveCoverGradient] = useState(null);

  const phantomCalcTimerRef = useRef(null);
  const phantomTypeTimerRef = useRef(null);
  const funnelIntroTimerRef = useRef(null);
  const funnelJustSwitchedTRef = useRef(null);
  const funnelSwitchTimerRef = useRef(null);
  const projSwitchT1Ref = useRef(null);
  const projSwitchT2Ref = useRef(null);
  const arriveFailsafeTRef = useRef(null);
  const xFsRef = useRef(null);
  const projSwitchBusyRef = useRef(false);
  const programmaticRef = useRef(false);
  const progTRef = useRef(null);
  const lastYRef = useRef(0);
  const bcRef = useRef(null);
  const arriveRef = useRef(null);
  const pillsWrapRef = useRef(null);

  if (arriveRef.current === null && typeof window !== 'undefined') {
    let xt = '';
    try {
      xt = window.sessionStorage.getItem('xt') || '';
      window.sessionStorage.removeItem('xt');
    } catch (err) {
      /* ignore */
    }
    const isArrive = !!xt && Date.now() - parseInt(xt, 10) < 8000;
    arriveRef.current = isArrive;
    if (isArrive) {
      document.documentElement.classList.add('arrive');
      const h = parseInt(window.location.hash.replace('#', ''), 10);
      setArriveCoverGradient(PROJECT_GRADIENTS[!isNaN(h) && h >= 0 && h < PROJECT_GRADIENTS.length ? h : 0]);
    }
  }

  // Auto-play the before state briefly, then settle on after -- unless the
  // viewer already picked a side themselves.
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

  // Decorative "ask the AI" search-bar typewriter loop, same as desktop.
  useEffect(() => {
    function tick() {
      setPhantomTypeIdx((prevIdx) => {
        setPhantomTypeDir((prevDir) => {
          setPhantomTypeLen((prevLen) => {
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
            setPhantomTypeDir(nextDir);
            setPhantomTypeIdx(nextIdx);
            phantomTypeTimerRef.current = setTimeout(tick, delay);
            return nextLen;
          });
          return prevDir;
        });
        return prevIdx;
      });
    }
    phantomTypeTimerRef.current = setTimeout(tick, 38);
    return () => clearTimeout(phantomTypeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arriving from a specific card on the Home carousel passes its index (or
  // slug) as a hash, e.g. /proyectos#3 or /proyectos#mapfre -- plus the
  // hide-on-scroll pill bar, mouse-drag scrolling for that bar, the
  // cross-tab "bring to front" BroadcastChannel listener and the arrive
  // failsafe, all mirrored from ProjectsMobile.dc.html's componentDidMount.
  useEffect(() => {
    const n = PROJECT_LABELS.length;
    const raw = window.location && window.location.hash ? window.location.hash.replace('#', '') : '';
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < n) {
      setActiveProject(parsed);
      requestAnimationFrame(() => centerPill(parsed));
    } else if (raw) {
      const slugIdx = PROJECT_SLUGS.indexOf(raw);
      if (slugIdx >= 0) {
        setActiveProject(slugIdx);
        requestAnimationFrame(() => centerPill(slugIdx));
      }
    }

    lastYRef.current = window.scrollY || 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const dy = y - lastYRef.current;
      let hide = barHidden;
      if (y < 12) hide = false;
      else if (dy > 6) hide = true;
      else if (dy < -6) hide = false;
      if (Math.abs(dy) > 6 || y < 12) lastYRef.current = y;
      setBarHidden((prev) => (hide !== prev ? hide : prev));
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const pw = pillsWrapRef.current;
    let down = false;
    let moved = false;
    let sx = 0;
    let sl = 0;
    const pDown = (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true;
      moved = false;
      sx = e.clientX;
      sl = pw.scrollLeft;
    };
    const pMove = (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) {
        moved = true;
        pw.classList.add('is-dragging');
      }
      if (moved) pw.scrollLeft = sl - dx;
    };
    const pUp = () => {
      if (!down) return;
      down = false;
      setTimeout(() => pw.classList.remove('is-dragging'), 0);
    };
    if (pw) {
      pw.addEventListener('pointerdown', pDown);
      window.addEventListener('pointermove', pMove);
      window.addEventListener('pointerup', pUp);
    }

    try {
      bcRef.current = new BroadcastChannel('vic-xt-mobile');
      bcRef.current.onmessage = (ev) => {
        const d = ev.data || {};
        if (d.type !== 'open') return;
        const idx = d.idx >= 0 && d.idx < n ? d.idx : 0;
        setActiveProject(idx);
        requestAnimationFrame(() => centerPill(idx));
        xArrive(idx);
      };
    } catch (err) {
      /* ignore */
    }

    if (arriveRef.current) {
      arriveFailsafeTRef.current = setTimeout(() => {
        document.documentElement.classList.remove('arrive');
        setArriveCoverGradient(null);
      }, 1400);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (pw) {
        pw.removeEventListener('pointerdown', pDown);
        window.removeEventListener('pointermove', pMove);
        window.removeEventListener('pointerup', pUp);
      }
      try {
        if (bcRef.current) bcRef.current.close();
      } catch (err) {
        /* ignore */
      }
      clearTimeout(arriveFailsafeTRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear every named timer on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(phantomCalcTimerRef.current);
      clearTimeout(phantomTypeTimerRef.current);
      clearTimeout(funnelIntroTimerRef.current);
      clearTimeout(funnelJustSwitchedTRef.current);
      clearTimeout(funnelSwitchTimerRef.current);
      clearTimeout(projSwitchT1Ref.current);
      clearTimeout(projSwitchT2Ref.current);
      clearTimeout(arriveFailsafeTRef.current);
      clearTimeout(xFsRef.current);
      clearTimeout(progTRef.current);
    };
  }, []);

  function centerPill(i) {
    const wrap = pillsWrapRef.current;
    const pill = wrap && wrap.querySelectorAll('.project-pill')[i];
    if (!wrap || !pill) return;
    wrap.scrollTo({ left: pill.offsetLeft - (wrap.clientWidth - pill.offsetWidth) / 2, behavior: 'smooth' });
  }

  // The host can keep this page alive and just bring it to the front, so
  // the entrance can be replayed on demand.
  function xArrive(idx) {
    const root = document.documentElement;
    root.classList.remove('arrive');
    void root.offsetWidth;
    root.classList.add('arrive');
    setArriveCoverGradient(PROJECT_GRADIENTS[idx] || PROJECT_GRADIENTS[0]);
    clearTimeout(xFsRef.current);
    xFsRef.current = setTimeout(() => {
      root.classList.remove('arrive');
      setArriveCoverGradient(null);
    }, 1400);
  }

  // Switching project (prev/next card, or "See next case") swaps the
  // content of the same .proj-article in place, so scroll back up to just
  // below the sticky navbar/pill bar -- same fix desktop does by resetting
  // its own scroll container to 0.
  function scrollToActiveProjectTop() {
    const art = document.querySelector('.proj-article');
    if (!art) return;
    const navEl = document.querySelector('.navbar');
    const barEl = document.querySelector('.proj-bar');
    const offset = (navEl ? navEl.getBoundingClientRect().height : 0) + (barEl ? barEl.getBoundingClientRect().height : 0);
    const top = art.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  // Minimal blur+fade cut between projects: the current .proj-article blurs
  // and fades out, the data swaps while it's fully hidden, then it blurs
  // back in sharp.
  function switchProject(idx) {
    if (projSwitchBusyRef.current || idx === activeProject) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActiveProject(idx);
      setBarHidden(false);
      scrollToActiveProjectTop();
      return;
    }
    projSwitchBusyRef.current = true;
    clearTimeout(projSwitchT1Ref.current);
    clearTimeout(projSwitchT2Ref.current);
    setProjSwitching(true);
    projSwitchT1Ref.current = setTimeout(() => {
      setActiveProject(idx);
      setBarHidden(false);
      scrollToActiveProjectTop();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setProjSwitching(false);
          projSwitchT2Ref.current = setTimeout(() => {
            projSwitchBusyRef.current = false;
          }, 190);
        });
      });
    }, 170);
  }

  function prevProject() {
    const n = PROJECT_LABELS.length;
    switchProject((activeProject - 1 + n) % n);
  }
  function nextProject() {
    const n = PROJECT_LABELS.length;
    switchProject((activeProject + 1) % n);
  }
  // Pills get the same blur cut as prev/next and "See next case" for a
  // consistent feel, but the pill's own centering/highlight happens right
  // away.
  function selectProject(i) {
    programmaticRef.current = true;
    clearTimeout(progTRef.current);
    progTRef.current = setTimeout(() => {
      programmaticRef.current = false;
    }, 700);
    centerPill(i);
    switchProject(i);
  }

  // ---- Phantom Money "expense-entry" mini-demo (shared with desktop) ----
  function phantomPickDay(d) {
    clearTimeout(phantomCalcTimerRef.current);
    setPhantomDay(d);
    setPhantomAmount('');
    setPhantomCalculating(false);
    setPhantomResult(null);
    setPhantomMathOpen(false);
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

  function setFunnelMode(mode) {
    const switchingToAfter = mode === 'after' && funnelMode !== 'after';
    clearTimeout(funnelSwitchTimerRef.current);
    setFunnelModeState(mode);
    setFunnelJustSwitched(switchingToAfter);
    if (switchingToAfter) {
      funnelSwitchTimerRef.current = setTimeout(() => setFunnelJustSwitched(false), 1500);
    }
  }

  // ---- derived view-model ----
  const n = PROJECT_LABELS.length;
  const active = activeProject;
  const prevIdx = (active - 1 + n) % n;
  const nextIdx = (active + 1) % n;

  const pills = PROJECT_LABELS.map((label, i) => ({ label, current: i === active, activeClass: i === active ? 'is-active' : '', onClick: () => selectProject(i) }));

  const funnel = {
    funnelModeClass: (funnelMode === 'before' ? 'mode-before' : funnelMode === 'after' ? 'mode-after' : '') + (funnelJustSwitched ? ' is-transitioning' : ''),
    funnelBeforeActive: funnelMode === 'before' ? 'is-active' : '',
    funnelAfterActive: funnelMode === 'after' ? 'is-active' : '',
    setFunnelBefore: () => setFunnelMode('before'),
    setFunnelAfter: () => setFunnelMode('after'),
  };

  const BALANCE = 2500;
  const RENT = 1100;
  const phantomSheetUp = phantomDay != null;
  const phantomResultVisible = phantomResult != null;
  const phantomSafeBalance = BALANCE - RENT - (phantomResult || 0);
  const phantomHeadline = !phantomResultVisible ? '' : phantomSafeBalance < 0 ? 'That dips you negative 🚨' : phantomSafeBalance < 400 ? 'Cutting it close ⚠️' : "You'll be fine! 🎉";
  const phantomNoteEnding = phantomSafeBalance < 0 ? 'that would put you below zero, worth moving things around before it happens.' : phantomSafeBalance < 400 ? "that's cutting it close, worth keeping an eye on." : "that's a healthy buffer!";
  const phantomCanCalc = !!phantomAmount && !phantomCalculating;
  const phantomCalCells = (() => {
    const DOW_FIRST = 0; // November 2026 starts on a Sunday -- deliberately hardcoded.
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
  const pct = (val) => Math.max(2, Math.min(100, Math.round((val / BALANCE) * 100)));
  const phantom = {
    phantomBgDimClass: phantomSheetUp ? 'is-dimmed' : '',
    phantomPromptText,
    phantomCalCells,
    phantomSheetClass: (phantomSheetUp ? 'is-up' : '') + (phantomMathOpen ? ' is-math' : '') + (!phantomResultVisible ? ' is-compact' : ''),
    phantomSheetSub: phantomDay != null ? 'For November ' + phantomDay + ', 2026' : '',
    phantomAmount,
    phantomCalcBtnClass: (phantomCalculating ? 'is-calculating' : '') + (phantomCanCalc ? '' : ' is-disabled'),
    phantomBtnLabel: phantomCalculating ? 'Calculating…' : 'Calculate Impact',
    phantomResultClass: phantomResultVisible ? 'is-visible' : '',
    phantomNormalView: !phantomMathOpen,
    phantomMathView: phantomMathOpen,
    phantomHeadline,
    phantomSafeBalanceDisplay: '$' + phantomSafeBalance.toLocaleString('en-US'),
    phantomNoteEnding,
    phantomExpenseDisplay: '$' + (phantomResult || 0).toLocaleString('en-US'),
    phantomBarRent: pct(RENT),
    phantomBarExpense: pct(phantomResult || 0),
    phantomBarSafe: pct(Math.max(0, phantomSafeBalance)),
  };

  const t = PROJECTS[active];
  const annotateBlock = (b) => {
    if (!b.isImage) return b;
    const id = b.demoId;
    if (id === 'expense-entry') return { ...b, isExpenseEntryDemo: true, ...phantom };
    if (id === 'axa-omnichannel') return { ...b, isAxoDemo: true };
    if (id === 'victorai-intro') return { ...b, isVictorDemo: true };
    if (id === 'mapfre-funnel') return { ...b, isFunnelDemo: true, ...funnel };
    if (id === 'undp-kit') return { ...b, isUndpDemo: true };
    if (id === 'calendar-loop') return { ...b, isCalendarLoopDemo: true };
    if (id === 'show-math') return { ...b, isShowMathDemo: true };
    if (id === 'netflix-learn') return { ...b, isNetflixLearnDemo: true };
    return { ...b, isPlainImage: true };
  };
  const annotateRowItem = (ri) => ({
    ...ri,
    isQuoteManagerDemo: ri.demoId === 'quote-manager',
    isBackofficeDemo: ri.demoId === 'backoffice-whatsapp',
    isFailureResponseDemo: ri.demoId === 'failure-response',
    isLifecycleDemo: ri.demoId === 'lifecycle',
    isDashboardDemo: ri.demoId === 'dashboard',
    isPlainRowImage: !ri.demoId,
  });
  const sections = (t.sections || []).map((sec) => {
    const rawBlocks = (sec.blocks || []).map((b) => (b.isRows ? { ...b, items: b.items.map(annotateRowItem) } : annotateBlock(b)));
    const first = rawBlocks[0];
    const hasLeadDemo = !!(first && ((first.isVideo && first.isLeadVideo) || (first.isImage && LEAD_DEMO_IDS[first.demoId])));
    return { ...sec, hasLeadDemo, noLeadDemo: !hasLeadDemo, leadBlock: hasLeadDemo ? first : {}, blocks: hasLeadDemo ? rawBlocks.slice(1) : rawBlocks };
  });
  const activeData = {
    index: active,
    slug: PROJECT_SLUGS[active] || '',
    companyLabel: t.companyLabel,
    hasCompanyLabel: !!t.companyLabel,
    title: t.title,
    status: t.status,
    meta: t.meta,
    stats: t.stats,
    hasStats: !!(t.stats && t.stats.length),
    sections,
  };

  const barClass = barHidden ? 'is-hidden' : '';
  const projSwitchClass = projSwitching ? 'is-switching' : '';

  function renderBlock(b, key) {
    if (b.isP) return <p className="proj-p2" key={key}>{b.text}</p>;
    if (b.isQuote) return (
      <div className="proj-quote-card" key={key}>
        <span className="proj-quote-mark" aria-hidden="true">&ldquo;</span>
        <p className="proj-quote-text">{b.text}</p>
      </div>
    );
    if (b.isVideo) return (
      <div className="proj-image proj-video" key={key}>
        <video className="proj-video-el" style={b.videoStyle} autoPlay loop muted playsInline>
          <source src={b.videoSrc} type="video/mp4" />
        </video>
      </div>
    );
    if (b.isCalendarLoopDemo) return <CalendarLoopDemo key={key} />;
    if (b.isShowMathDemo) return <ShowMathDemo key={key} />;
    if (b.isNetflixLearnDemo) return <NetflixLearnDemo key={key} />;
    if (b.isPlainImage) return (
      <div className="proj-image" key={key}><p className="proj-image-label">{b.caption}</p></div>
    );
    if (b.isCard) return (
      <div className={'proj-card ' + b.cardClass} key={key}>
        <p className="proj-card-lead">{b.tag}</p>
        <p className="proj-card-body">{b.text}</p>
      </div>
    );
    if (b.isList) return (
      <ul className="proj-list" key={key}>
        {b.items.map((it, i) => (
          <li className="proj-list-item" key={i}>
            <span className="proj-list-marker" aria-hidden="true" />
            <p className="proj-list-text"><strong>{it.lead}</strong>{it.rest}</p>
          </li>
        ))}
      </ul>
    );
    if (b.isGrid2) return (
      <div className="proj-grid2" key={key}>
        {b.items.map((qi, i) => (
          <div className="proj-qitem" key={i}>
            <p className="proj-qitem-tag">{qi.tag}</p>
            {qi.paragraphs.map((pp, pi) => (<p className="proj-qitem-p" key={pi}>{pp.text}</p>))}
          </div>
        ))}
      </div>
    );
    if (b.isCols) return (
      <div className="proj-cols" key={key}>
        <div className="proj-col">{b.left.map((pp, i) => (<p className="proj-col-p" key={i}>{pp.text}</p>))}</div>
        <div className="proj-col">{b.right.map((pp, i) => (<p className="proj-col-p" key={i}>{pp.text}</p>))}</div>
      </div>
    );
    if (b.isTwin) return (
      <div className="proj-twin" key={key}>
        <div className="proj-twin-part">
          <h3 className="proj-twin-heading">{b.leftHeading}</h3>
          {b.left.map((pp, i) => (<p className="proj-twin-p" key={i}>{pp.text}</p>))}
        </div>
        <div className="proj-twin-part">
          <h3 className="proj-twin-heading">{b.rightHeading}</h3>
          {b.right.map((pp, i) => (<p className="proj-twin-p" key={i}>{pp.text}</p>))}
        </div>
      </div>
    );
    if (b.isRows) return (
      <div className="proj-rows" key={key}>
        {b.items.map((ri, i) => (
          <div className="proj-row-item" key={i}>
            <p className="proj-row-lead">{ri.tag}</p>
            <p className="proj-row-text">{ri.text}</p>
            {ri.isQuoteManagerDemo && <QuoteManagerDemo />}
            {ri.isBackofficeDemo && <BackofficeDemo />}
            {ri.isFailureResponseDemo && <FailureResponseDemo />}
            {ri.isLifecycleDemo && <LifecycleDemo />}
            {ri.isDashboardDemo && <DashboardDemo />}
            {ri.isPlainRowImage && (<div className="mapfre-row-image"><p className="proj-image-label">{ri.caption}</p></div>)}
          </div>
        ))}
      </div>
    );
    if (b.isImgRow) return (
      <div className="proj-imgrow" key={key}>
        {b.items.map((im, i) => (
          <div className="proj-image" key={i}>
            {im.hasSrc ? <img className="proj-imgrow-img" src={im.src} alt={im.caption} /> : <p className="proj-image-label">{im.caption}</p>}
          </div>
        ))}
      </div>
    );
    return null;
  }

  function renderLeadDemo(leadBlock) {
    if (leadBlock.isExpenseEntryDemo) {
      return (
        <ExpenseEntryDemo
          phantom={leadBlock}
          onPhantomPickDay={phantomPickDay}
          onPhantomCloseSheet={phantomCloseSheet}
          onPhantomAmountChange={phantomAmountChange}
          onPhantomCalculate={phantomCalculate}
          onPhantomOpenMath={phantomOpenMath}
        />
      );
    }
    if (leadBlock.isAxoDemo) return <AxoDemo />;
    if (leadBlock.isUndpDemo) return <UndpDemo />;
    if (leadBlock.isVictorDemo) {
      return (
        <>
          <VictorAIDemo />
          <button className="vai-chat-cta" type="button" aria-label="Open the VictorAI chat" onClick={chat.openChat}>
            <span>Try the AI chatbot</span>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10.5946 13.6475L9.79167 16.4583L8.9887 13.6475C8.78117 12.9214 8.39206 12.2602 7.85809 11.7262C7.32413 11.1923 6.66292 10.8032 5.93685 10.5956L3.125 9.79167L5.93586 8.9887C6.66193 8.78117 7.32314 8.39206 7.85711 7.8581C8.39107 7.32413 8.78018 6.66292 8.98772 5.93685L9.79167 3.125L10.5946 5.93586C10.8022 6.66193 11.1913 7.32314 11.7252 7.85711C12.2592 8.39107 12.9204 8.78018 13.6465 8.98772L16.4583 9.79167L13.6475 10.5946C12.9214 10.8022 12.2602 11.1913 11.7262 11.7252C11.1923 12.2592 10.8032 12.9204 10.5956 13.6465L10.5946 13.6475Z" fill="currentColor" stroke="currentColor" strokeWidth="1.48148" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      );
    }
    if (leadBlock.isFunnelDemo) return <FunnelDemo funnel={leadBlock} />;
    if (leadBlock.isVideo) return (
      <div className="proj-image proj-video">
        <video className="proj-video-el" style={leadBlock.videoStyle} autoPlay loop muted playsInline>
          <source src={leadBlock.videoSrc} type="video/mp4" />
        </video>
      </div>
    );
    return null;
  }

  return (
    <>
      <Navbar current="proyectos" variant="mobile" />
      <main data-page className="page proyectos-mobile">
        <section className="projects-view" id="projects">
          <div className={'proj-bar ' + barClass}>
            <Link className="mini-carousel-btn" href="/" aria-label="Back to home carousel">
              <svg className="mini-icon" width="46.9" height="20" viewBox="0 0 61 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="23" width="14" height="20" rx="2" />
                <rect x="47.741" y="1.64795" width="14" height="20" rx="2" transform="rotate(22 47.741 1.64795)" />
                <rect width="14" height="20" rx="2" transform="matrix(-0.927184 0.374607 0.374607 0.927184 12.9806 1.64795)" />
              </svg>
            </Link>
            <div className="pills-wrap">
              <ul className="project-pills" id="proj-pills" ref={pillsWrapRef} aria-label="Select project">
                {pills.map((pill, i) => (
                  <li key={i}>
                    <button className={'project-pill ' + pill.activeClass} type="button" onClick={pill.onClick} aria-current={pill.current}>
                      {pill.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <article className={'proj-article ' + projSwitchClass} id={activeData.slug}>
            <div className="proj-head-row">
              <span className="proj-status-pill">{activeData.status}</span>
              {activeData.hasCompanyLabel && <span className="proj-company">{activeData.companyLabel}</span>}
            </div>
            <div className="proj-headline">
              <h1 className="proj-title">{activeData.title}</h1>
            </div>

            <div className="proj-meta-card">
              {activeData.meta.map((m, i) => (
                <div className="proj-meta-item" key={i}>
                  <p className="proj-meta-label">{m.label}</p>
                  <p className="proj-meta-value">{m.value}</p>
                </div>
              ))}
            </div>

            {activeData.hasStats && (
              <div className="proj-stats">
                {activeData.stats.map((stat, i) => (
                  <div className="proj-stat" key={i}>
                    <div className="proj-stat-value-row">
                      {stat.hasArrow && (
                        <>
                          <span className="proj-stat-value">{stat.before}</span>
                          <span className="proj-stat-arrow" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                          <span className="proj-stat-value">{stat.after}</span>
                        </>
                      )}
                      {stat.noArrow && <span className="proj-stat-value">{stat.value}</span>}
                    </div>
                    <span className="proj-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            {activeData.sections.map((sec) => (
              <section className="proj-sec" id={sec.id} key={sec.id}>
                {sec.hasLeadDemo && (
                  <>
                    {renderLeadDemo(sec.leadBlock)}
                    <div className="proj-sec-divider-lead" />
                  </>
                )}
                {sec.noLeadDemo && <div className="proj-sec-divider" />}

                {sec.hasHeading && (
                  <div className="proj-sec-head">
                    <h2 className="proj-sec-title">{sec.heading}</h2>
                  </div>
                )}
                <div className="proj-sec-body">{sec.blocks.map((b, bi) => renderBlock(b, bi))}</div>
              </section>
            ))}

            <button className="proj-next-case" type="button" onClick={nextProject}>
              <span>See next case</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </article>
        </section>
      </main>
      {arriveCoverGradient && <div className="arrive-cover" style={{ background: arriveCoverGradient }} aria-hidden="true" />}
      <ChatPanel />
      <Footer />
    </>
  );
}

// Mobile folds the funnel demo into a section's lead block (desktop keeps it
// as a fixed box inside the Mapfre meta stack instead) -- isolated here into
// its own component since, unlike desktop, mobile renders it from a single
// reusable lead-demo switch rather than inline in a bespoke layout.
function FunnelDemo({ funnel }) {
  return (
    <div className="mapfre-flow-box">
      <span className="flow-blob flow-blob-a" aria-hidden="true" />
      <span className="flow-blob flow-blob-b" aria-hidden="true" />
      <span className="flow-blob flow-blob-c" aria-hidden="true" />
      <span className="flow-halo-pulse" aria-hidden="true" />
      <div className="funnel-view-toggle" role="group" aria-label="Show the before or after state">
        <button className={'funnel-view-btn ' + funnel.funnelBeforeActive} type="button" onClick={funnel.setFunnelBefore}>Before</button>
        <button className={'funnel-view-btn ' + funnel.funnelAfterActive} type="button" onClick={funnel.setFunnelAfter}>After</button>
      </div>
      <div className="flow-device" aria-hidden="true">
        <div className="flow-stage">
          <div className={'flow-funnel ' + funnel.funnelModeClass}>
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
  );
}
