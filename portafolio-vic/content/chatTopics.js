// VictorAI's local topic/follow-up map. This was duplicated verbatim into
// all 6 .dc.html files in Claude Design (every page's chat picks follow-up
// questions from the same pool) -- consolidated here into one file so it's
// edited once instead of three times. The actual reply text always comes
// from the live Supabase Edge Function now; `a` here is only a fallback and
// is used to decide which follow-up pool to show next (see useVictorAIChat).

const bioLead =
  "She starts with the problem, not the screen, and won't settle for the first way it gets framed if there's a sharper one underneath. She moves easily between the small details of a flow and the bigger picture of the product and business, often pulling ideas from outside insurtech instead of repeating what's already common in the industry. She owns things end to end, from defining the problem to launch, working with development as one team instead of handing off a finished design. And she's hands on with AI throughout, from prototyping to vibe coding, always looking for better ways to collaborate with developers.";
const bioLeadership =
  "Vic's approach to leading is giving her team whatever they need to do their best work, starting with full context on a project from day one, even for people whose work starts later, like engineers or QA. She runs daily standups with a lighthearted personal question to build real connection on a remote team, and treats 1:1s as space to talk about growth, not just status updates. She picked up this style from The Servant by James C. Hunter, and it's been her compass ever since she became a lead.";
const bioAxaBridge =
  "AXA is the clearest example. Vic led a team of designers across three connected products (the e-commerce site, the BackOffice tool, and the performance dashboard), reviewing every screen before it shipped and presenting flows directly to AXA's team herself. Leading design at that scale meant defending decisions in front of an enterprise client in person, not just handing off files.";
const bioNextRole =
  "She wants a company that still has a human touch, one that's figuring out a healthy relationship with AI rather than chasing it blindly, and that pushes people to think out of the box and imagine the best possible experience for the user. She's open to any industry, she has deep insurtech experience but genuinely just wants to work on something that makes someone's experience better.";
const bioOutside =
  "She's Mexican and proud of it, now living in Eindhoven in the Netherlands. She shoots analog photography, mostly nature, and reads thrillers and Mexican magical realism (she recommends Los Recuerdos del Porvenir by Elena Garro). She's also become a self declared cafe connoisseur around town, without drinking coffee herself.";
const mapfreStory =
  "At Mapfre, Vic led the redesign of the car insurance quoting flow, search bar included. Search efficiency jumped from 56.5% to 97.4%, a 72% relative improvement, and total sales grew 35.2% year over year. The fix wasn't AI answering every search live, it was a fuzzy search engine built from the real typos already sitting in the data (like 'Hiundai' instead of 'Hyundai'), with AI used earlier on to spot those patterns, not to decide things at checkout.";

export const TOPICS = {
  Bio: [
    { q: "What makes Vic's design approach unique?", a: bioLead },
    { q: 'How does Vic like to lead a design team?', a: bioLeadership },
    { q: "What's a project where that leadership style really showed up?", a: bioAxaBridge, opens: 'AXA' },
    { q: 'What is Vic looking for in her next role?', a: bioNextRole },
    { q: "What's Vic like outside of work?", a: bioOutside },
    { q: "What's the story behind Vic's biggest win so far?", a: mapfreStory, opens: 'Mapfre' },
  ],
  Mapfre: [
    {
      q: 'What exactly did Vic build to fix the search problem?',
      a: "Instead of adding real time AI to every search, Vic's team built a fuzzy search engine trained on the typos people were actually making, things like typing 'Hiundai' for 'Hyundai'. AI was used earlier in the process to detect those patterns in the data, not as the decision engine at checkout.",
    },
    {
      q: 'How big was the impact of that fix?',
      a: "Search efficiency jumped from 56.5% to 97.4%, a 72% relative improvement, and total sales grew 35.2% year over year on one of Mexico's top 5 car insurers. That translated into real premiums that used to get lost, plus hundreds of extra policies sold every month.",
    },
    {
      q: "What was Vic's day to day role at Guros?",
      a: 'At Guros, Vic owns end to end delivery of product flows across auto insurance quoting, mobile claims, and partner activation, from defining the problem all the way to launch, staying hands on with key flows while leading design and development as one team.',
      opens: 'Bio',
    },
    {
      q: 'What did Vic learn from this project?',
      a: "The initial instinct was to improve what happened after someone failed to find their car, better customer service and follow up. But the real problem was a level above that: people simply couldn't find their own car in the search bar in the first place.",
    },
    {
      q: 'Why not just add AI to every search in real time?',
      a: "Vic's team used AI as an accelerator during development, to detect the real typo patterns already in the data, rather than putting a live AI model in the middle of checkout. It made the fix faster to build and easier to trust in a moment where reliability matters.",
    },
    {
      q: 'Has Vic worked on other insurance projects like this one?',
      a: "Yes, at AXA she led design across three connected products for one of Mexico's top 3 auto insurers, tackling a similar kind of problem: people were interested, they just weren't converting into buyers online.",
      opens: 'AXA',
    },
  ],
  'AI Cash Flow Predictor': [
    {
      q: 'What problem was this project trying to solve?',
      a: 'Most banking apps show you the past, how much you spent, but not the question that actually matters: how much can you safely spend today without risking money you already owe tomorrow. This was a concept Vic designed for a UX/UI for AI Products course at Stanford.',
    },
    {
      q: 'What does "copilot, never autopilot" mean here?',
      a: "The AI can calculate and project your finances, but it never takes action on its own, it never moves money or blocks a purchase without the user clicking to approve it. Every projection also comes with a simple visual breakdown so the person can correct it if the AI gets something wrong, like a Netflix charge that was already cancelled.",
    },
    {
      q: 'Where did Vic study this?',
      a: 'She studied it at Stanford in 2026, in a UX/UI Design for AI Products certificate. She also holds the Google UX Design Professional Certificate from 2025, studied product design at ITESM in Mexico, and did exchanges at the University of Leeds and Aalto University in Helsinki.',
      opens: 'Bio',
    },
    {
      q: 'What did the research with real users show?',
      a: 'Vic interviewed a 54 year old professional who manages money in Excel and a 20 year old psychology student who checks her balance like a traffic light. Despite the generational gap, both were caught off guard by small, irregular expenses, not big fixed bills.',
    },
    {
      q: 'How accurate were the predictions?',
      a: "In simulation, the model hit 91% accuracy on 30 day balance projections, and usability testers reported feeling less short term financial stress when using the 'Safe Balance' feature. It's a concept, not a shipped product, so these are simulation results, not live numbers.",
    },
    {
      q: 'Does Vic use AI like this in her actual day to day work?',
      a: "Definitely. She drives AI adoption across her team's whole design workflow at Guros, from AI assisted prototyping to usability exploration and vibe coding to test ideas quickly, always looking for better ways to collaborate with developers using AI as part of the process.",
      opens: 'Bio',
    },
  ],
  Pulso: [
    {
      q: 'How did Pulso start?',
      a: "Pulso started inside Guros, when Vic's boss invited her and two colleagues to build it together, four cofounders in total. Vic was cofounder and Lead Product Designer, owning the entire patient facing experience.",
    },
    {
      q: 'What was the biggest challenge with the people Pulso is for?',
      a: "Pulso is built for people earning one to two minimum wages, without credit cards and without much digital fluency beyond WhatsApp. In Mexico, a lot of healthcare spending comes straight out of pocket, and private clinics see patients who simply can't pay upfront or qualify for traditional credit fast enough.",
    },
    {
      q: 'How is this different from the AXA project?',
      a: "AXA is enterprise insurance for people who already have digital habits and credit access. Pulso is the opposite end of the spectrum, designing financial trust from scratch for people with low digital fluency and no credit history, which meant rethinking things as basic as how someone signs up.",
      opens: 'AXA',
    },
    {
      q: 'What was the "Exit Kit" and why does it exist?',
      a: "Vic realized that asking to borrow money out loud, in a clinic waiting room, is uncomfortable, so the application couldn't happen at the counter, it had to travel home with the patient. The Exit Kit is a small physical card with a 4 digit code and a QR code the patient takes home to finish applying at their own pace, later evolved so the clinic can send the pre loaded request straight to the patient's WhatsApp.",
    },
    {
      q: "What's the state of Pulso today?",
      a: "Pulso as a company is paused, a big partnership opportunity came up that absorbed all four founders' time, but Vic keeps iterating on the concept on her own. She's upfront about what's still unresolved: whether it should be a native app or WhatsApp and web only, what happens if a patient can't use their phone, and how to handle a late payment with empathy.",
    },
    {
      q: "What does Vic do when business and user needs don't match?",
      a: "She pushes for testing both the business proposal and the design proposal with real numbers and metrics, since business often lacks the user or UX context to land on the right answer alone. If you only build what the commercial side wants, the product usually ends up not working, because it isn't solving what the user actually needs.",
      opens: 'Bio',
    },
  ],
  AXA: [
    {
      q: "What was Vic's role leading this project?",
      a: "Vic is Design Lead at Guros, AXA's product partner for this channel, leading strategy and end to end design execution across the whole thing.",
    },
    {
      q: "What was actually broken before Vic's team stepped in?",
      a: "AXA is one of Mexico's top 3 auto insurers, and demand was never the problem, people asked for quotes constantly. The real problem was conversion, most of them ended up buying over the phone with an agent instead of finishing online.",
    },
    {
      q: "What's Vic proudest of professionally?",
      a: 'This project, actually. AXA came out of a long competitive process where Vic\'s team built live prototypes AXA could try themselves instead of just describing the idea, using her vibe coding skills to get a working prototype in front of them at an early stage.',
      opens: 'Bio',
    },
    {
      q: 'What decisions did Vic make to fix it?',
      a: "She reframed the problem: it wasn't about designing a checkout, it was about catching anyone who got stuck (a car not found, a failed payment, a page closed halfway) and handing them to a human without making them repeat themselves. That included a Quote Manager in plain language instead of insurance jargon, live pricing, and automatic lead scoring so the Contact Center knew who to call first.",
    },
    {
      q: 'What did leading design at this scale look like day to day?',
      a: "She led a team of designers across three connected products (the e-commerce site, the BackOffice, and AXA's own performance dashboard), reviewing and approving every screen before it shipped, and presenting flows and logic directly to AXA in person.",
    },
    { q: 'Has Vic solved a similar problem somewhere else?', a: mapfreStory, opens: 'Mapfre' },
  ],
  'ONU/PNUD': [
    {
      q: 'What was the problem Vic was designing for?',
      a: "Women in rural Mexico running small businesses on microcredit often lose their income if they get sick or pregnant, and traditional insurance was never built for them, it asks for paperwork they don't have and fixed monthly payments that don't match irregular weekly income. This project was presented at the PNUD (UNDP) inclusive finance competition in Mexico, where it placed second.",
    },
    {
      q: 'What was the "skip the app" decision about?',
      a: "Instead of asking them to adopt a brand new app habit, Vic's design built the insurance into a habit they already had: their weekly walk to pay off their microcredit. The coverage is offered at the same counter, priced under $3 USD a week, folded into the payment they're already making.",
    },
    {
      q: "How does this compare to Pulso, another one of Vic's finance projects?",
      a: "Both are about designing financial trust for people underserved by traditional systems, but this one goes further offline: the coverage is delivered as three physical pieces (a folder, a personal key, an emergency card) and claimed through people the person already trusts, like the store counter, not a portal or call center.",
      opens: 'Pulso',
    },
    {
      q: 'How did the physical kit work?',
      a: "It's three pieces: a durable pink folder for documents, a personal key or code that works as a login, and a pocket card with emergency numbers. A shared data connection with the microfinance institution replaces a new registration form, and the physical key replaces a password.",
    },
    {
      q: 'What did Vic learn from designing for people without digital access?',
      a: "That trust gets designed, it isn't something added at the end, and the best onboarding is the one nobody notices because it already existed, you just build inside it. Designing for someone offline is still designing a system, it just runs through people instead of screens.",
    },
    { q: 'What kind of role is Vic looking for next?', a: bioNextRole, opens: 'Bio' },
  ],
};

export const STARTERS = [
  { q: "What's the story behind Vic's +72% search win at Mapfre?", a: mapfreStory, topic: 'Mapfre' },
  { q: 'How does Vic lead a design team?', a: bioLeadership, topic: 'Bio' },
  {
    q: "What's something about Vic her portfolio won't tell you?",
    a: "She's an analog photography person who thinks in single frames instead of bursts, and she's an unofficial cafe connoisseur in general even though she doesn't actually drink coffee. And if you dig a bit deeper, she'd tell you she has an open heart, sometimes doubts herself more than she should, and laughs a lot.",
    topic: 'Bio',
  },
];
