// ── Interact Space seed data ─────────────────────────────────────────
// One city (Lagos, Nigeria) fully populated so the demo never feels empty.
// All dates are relative to a demo "today" of 2026-07-17.

export const TAGS = {
  business: { label: 'Business', group: 'work' },
  entrepreneurship: { label: 'Entrepreneurship', group: 'work' },
  startups: { label: 'Startups', group: 'work' },
  marketing: { label: 'Marketing', group: 'work' },
  finance: { label: 'Finance', group: 'work' },
  'small-business': { label: 'Small Business', group: 'work' },
  marketplace: { label: 'Marketplace', group: 'work' },
  tech: { label: 'Tech', group: 'skills' },
  coding: { label: 'Coding', group: 'skills' },
  'web-development': { label: 'Web Development', group: 'skills' },
  design: { label: 'Design', group: 'skills' },
  data: { label: 'Data & AI', group: 'skills' },
  photography: { label: 'Photography', group: 'creative' },
  art: { label: 'Art', group: 'creative' },
  music: { label: 'Music', group: 'creative' },
  fashion: { label: 'Fashion', group: 'creative' },
  writing: { label: 'Writing', group: 'creative' },
  food: { label: 'Food', group: 'lifestyle' },
  fitness: { label: 'Fitness', group: 'lifestyle' },
  farming: { label: 'Farming', group: 'impact' },
  agriculture: { label: 'Agriculture', group: 'impact' },
  sustainability: { label: 'Sustainability', group: 'impact' },
  'renewable-energy': { label: 'Renewable Energy', group: 'impact' },
  'urban-farming': { label: 'Urban Farming', group: 'impact' },
  learning: { label: 'Learning', group: 'growth' },
  mentorship: { label: 'Mentorship', group: 'growth' },
  networking: { label: 'Networking', group: 'growth' },
  community: { label: 'Community Building', group: 'growth' },
}

// ── People ───────────────────────────────────────────────────────────
export const USERS = [
  {
    id: 'u-adaeze', name: 'Adaeze Okafor', handle: '@adaeze',
    title: 'Founder, Kola Foods', city: 'Lagos', area: 'Lekki',
    interests: ['food', 'small-business', 'marketing'], skills: ['branding', 'retail operations'],
    goals: ['Scale my food brand across West Africa'],
    bio: 'Building a snack brand from my grandmother’s recipes. Always happy to talk retail.',
    communities: ['lagos-entrepreneurs', 'balogun-market-hub'], color: '#B4472A',
  },
  {
    id: 'u-tunde', name: 'Tunde Bakare', handle: '@tunde',
    title: 'Software Engineer', city: 'Lagos', area: 'Yaba',
    interests: ['coding', 'web-development', 'mentorship'], skills: ['React', 'Node.js', 'teaching'],
    goals: ['Mentor 10 junior developers this year'],
    bio: 'Engineer at a fintech by day, coding mentor by night. Ask me about your first PR.',
    communities: ['naija-devs', 'african-startup-network'], color: '#1F5FA8',
  },
  {
    id: 'u-zainab', name: 'Zainab Yusuf', handle: '@zainab',
    title: 'Documentary Photographer', city: 'Lagos', area: 'Ikeja',
    interests: ['photography', 'art', 'writing'], skills: ['portrait photography', 'photo editing'],
    goals: ['Publish a photo book on Lagos markets'],
    bio: 'I shoot the everyday poetry of Lagos streets. Leica in one hand, suya in the other.',
    communities: ['lagos-lens-collective'], color: '#6B3FA0',
  },
  {
    id: 'u-chidi', name: 'Chidi Nwosu', handle: '@chidi',
    title: 'Agritech Founder', city: 'Lagos', area: 'Ikorodu',
    interests: ['farming', 'agriculture', 'sustainability', 'startups'], skills: ['hydroponics', 'operations'],
    goals: ['Bring vertical farming to 100 Lagos homes'],
    bio: 'Ex-banker turned farmer. I grow vegetables in shipping containers and I’m not sorry.',
    communities: ['green-lagos', 'lagos-entrepreneurs'], color: '#1B7F3B',
  },
  {
    id: 'u-funke', name: 'Funke Alabi', handle: '@funke',
    title: 'Fashion Designer', city: 'Lagos', area: 'Surulere',
    interests: ['fashion', 'small-business', 'art'], skills: ['tailoring', 'adire dyeing'],
    goals: ['Open a second studio in Abuja'],
    bio: 'Adire textiles with a modern cut. Made in Surulere, worn everywhere.',
    communities: ['balogun-market-hub'], color: '#E84A8A',
  },
  {
    id: 'u-emeka', name: 'Emeka Obi', handle: '@emeka',
    title: 'Renewable Energy Engineer', city: 'Lagos', area: 'Ajah',
    interests: ['renewable-energy', 'sustainability', 'tech'], skills: ['solar installation', 'project management'],
    goals: ['Take 500 homes off generator power'],
    bio: 'Solar evangelist. If your generator is louder than your dreams, talk to me.',
    communities: ['green-lagos'], color: '#F2C94C',
  },
  {
    id: 'u-bisi', name: 'Bisi Adewale', handle: '@bisi',
    title: 'Product Designer', city: 'Lagos', area: 'Victoria Island',
    interests: ['design', 'tech', 'learning'], skills: ['UI/UX', 'Figma', 'user research'],
    goals: ['Move from agency work to a product startup'],
    bio: 'I design interfaces people don’t have to think about. Currently thinking about yours.',
    communities: ['naija-devs', 'african-startup-network'], color: '#0F6E6E',
  },
  {
    id: 'u-yemi', name: 'Yemi Ogunleye', handle: '@yemi',
    title: 'Angel Investor', city: 'Lagos', area: 'Ikoyi',
    interests: ['startups', 'finance', 'mentorship'], skills: ['fundraising', 'financial modelling'],
    goals: ['Back 5 African founders this year'],
    bio: 'I write early cheques for stubborn founders solving unglamorous problems.',
    communities: ['african-startup-network', 'lagos-entrepreneurs'], color: '#C0A062',
  },
  {
    id: 'u-ngozi', name: 'Ngozi Eze', handle: '@ngozi',
    title: 'Community Health Worker', city: 'Lagos', area: 'Mushin',
    interests: ['community', 'learning', 'fitness'], skills: ['public health', 'event organizing'],
    goals: ['Start a neighborhood wellness club'],
    bio: 'Health is a community project. I organize free screenings and street workouts.',
    communities: ['green-lagos'], color: '#E85A4A',
  },
  {
    id: 'u-seun', name: 'Seun Adeleke', handle: '@seun',
    title: 'Data Analyst', city: 'Lagos', area: 'Gbagada',
    interests: ['data', 'coding', 'learning'], skills: ['Python', 'SQL', 'dashboards'],
    goals: ['Transition into machine learning'],
    bio: 'I turn messy spreadsheets into decisions. Learning ML one notebook at a time.',
    communities: ['naija-devs'], color: '#5AE84A',
  },
  {
    id: 'u-halima', name: 'Halima Abubakar', handle: '@halima',
    title: 'Urban Farmer', city: 'Lagos', area: 'Badagry',
    interests: ['urban-farming', 'farming', 'sustainability', 'food'], skills: ['composting', 'crop planning'],
    goals: ['Teach 50 families to grow their own vegetables'],
    bio: 'My balcony feeds my family. Yours can too — let me show you how.',
    communities: ['green-lagos', 'balogun-market-hub'], color: '#8BC34A',
  },
  {
    id: 'u-kunle', name: 'Kunle Fashola', handle: '@kunle',
    title: 'Filmmaker & Editor', city: 'Lagos', area: 'Festac',
    interests: ['photography', 'art', 'music'], skills: ['video editing', 'storytelling'],
    goals: ['Shoot a short documentary on Lagos danfo culture'],
    bio: 'Stories are the cheapest way to travel. I make short films about long journeys.',
    communities: ['lagos-lens-collective'], color: '#7B4AE8',
  },
  {
    id: 'u-amina', name: 'Amina Bello', handle: '@amina',
    title: 'Marketing Lead, PayQick', city: 'Lagos', area: 'Marina',
    interests: ['marketing', 'startups', 'writing'], skills: ['growth marketing', 'copywriting'],
    goals: ['Build a personal brand in African fintech'],
    bio: 'Growth marketer. I believe distribution beats product — fight me in the comments.',
    communities: ['african-startup-network', 'lagos-entrepreneurs'], color: '#8A5D0B',
  },
  {
    id: 'u-obi', name: 'Obi Ikenna', handle: '@obi',
    title: 'Student, UNILAG', city: 'Lagos', area: 'Akoka',
    interests: ['coding', 'learning', 'startups'], skills: ['JavaScript basics'],
    goals: ['Land my first internship in tech'],
    bio: 'Final-year computer science student. Building small things until one gets big.',
    communities: ['naija-devs'], color: '#4AC7E8',
  },
  {
    id: 'u-folake', name: 'Folake Martins', handle: '@folake',
    title: 'Baker & Caterer', city: 'Lagos', area: 'Ogba',
    interests: ['food', 'small-business', 'learning'], skills: ['baking', 'catering logistics'],
    goals: ['Get my pastries into 10 Lagos cafés'],
    bio: 'Small-chops with big ambitions. Weekend markets are my runway.',
    communities: ['balogun-market-hub'], color: '#E8A24A',
  },
  {
    id: 'u-david', name: 'David Mensah', handle: '@davidm',
    title: 'Startup Founder (Accra)', city: 'Accra', area: 'Osu',
    interests: ['startups', 'tech', 'networking'], skills: ['product management', 'pitching'],
    goals: ['Expand my logistics startup into Nigeria'],
    bio: 'Ghanaian founder scouting the Lagos market. Coffee is on me if you know logistics.',
    communities: ['african-startup-network'], color: '#4AE87B',
  },
  {
    id: 'u-rekia', name: 'Rekia Salau', handle: '@rekia',
    title: 'Sustainability Consultant', city: 'Lagos', area: 'Ilupeju',
    interests: ['sustainability', 'renewable-energy', 'agriculture', 'community'], skills: ['ESG reporting', 'grant writing'],
    goals: ['Help 20 SMEs win green grants'],
    bio: 'I translate "save the planet" into budgets, grants, and quarterly reports.',
    communities: ['green-lagos', 'lagos-entrepreneurs'], color: '#4AE8A8',
  },
]

// ── Default current-user persona (completed during AI onboarding) ────
export const DEFAULT_PROFILE = {
  id: 'u-me', name: 'Dami Adeyemi', handle: '@dami',
  title: 'New citizen of Interact Space', city: 'Lagos', area: 'Yaba',
  interests: [], skills: [], goals: [],
  bio: 'Just arrived in the city.',
  communities: [], connections: [], color: '#D8A63A',
  privacy: 'city-only', // exact | city-only | hidden
  onboarded: false,
}

// ── Communities ──────────────────────────────────────────────────────
export const COMMUNITIES = [
  {
    id: 'lagos-entrepreneurs', name: 'Lagos Entrepreneurs', scope: 'local', city: 'Lagos',
    tagline: 'Builders of the city’s next businesses',
    description: 'A community of founders, side-hustlers and operators building businesses in Lagos. Weekly meetups, honest pitch feedback, and members who actually reply.',
    tags: ['entrepreneurship', 'business', 'startups', 'mentorship', 'networking'],
    memberCount: 2418, memberIds: ['u-adaeze', 'u-chidi', 'u-yemi', 'u-amina', 'u-rekia'],
    moderators: ['u-yemi', 'u-amina'], accent: '#8A5D0B', icon: 'briefcase',
    trending: true,
    rules: [
      'Give feedback before you ask for it.',
      'No unsolicited DMs pitching services to members.',
      'Deals and partnerships must be disclosed in-thread.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
  {
    id: 'african-startup-network', name: 'African Startup Network', scope: 'global', city: 'Pan-African',
    tagline: 'One network, 54 countries, infinite hustle',
    description: 'The global home for African founders, operators and investors on Interact Space. Cross-border intros, funding announcements, and city chapters from Lagos to Nairobi to Accra.',
    tags: ['startups', 'tech', 'finance', 'networking', 'entrepreneurship'],
    memberCount: 18452, memberIds: ['u-tunde', 'u-bisi', 'u-yemi', 'u-amina', 'u-david'],
    moderators: ['u-david'], accent: '#1F5FA8', icon: 'globe',
    trending: true,
    rules: [
      'Intros must be double opt-in.',
      'Funding announcements welcome; hype threads are not.',
      'Respect chapter autonomy — local chapters set local norms.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
  {
    id: 'lagos-lens-collective', name: 'Lagos Lens Collective', scope: 'local', city: 'Lagos',
    tagline: 'The city, one frame at a time',
    description: 'Street photographers, portrait shooters and filmmakers documenting Lagos. Monthly photo walks, critique circles, and an annual open-air exhibition.',
    tags: ['photography', 'art', 'community'],
    memberCount: 684, memberIds: ['u-zainab', 'u-kunle'],
    moderators: ['u-zainab'], accent: '#6B3FA0', icon: 'camera',
    trending: false,
    rules: [
      'Critique the work, never the person.',
      'Always get consent for street portraits before posting.',
      'Watermarks allowed, spam is not.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
  {
    id: 'naija-devs', name: 'Naija Devs Learning Circle', scope: 'local', city: 'Lagos',
    tagline: 'Learn in public, grow together',
    description: 'A learning-first coding community. Weekly study groups, code reviews from senior engineers, and a no-stupid-questions policy that is actually enforced.',
    tags: ['coding', 'web-development', 'learning', 'mentorship', 'tech', 'data'],
    memberCount: 3127, memberIds: ['u-tunde', 'u-bisi', 'u-seun', 'u-obi'],
    moderators: ['u-tunde'], accent: '#0F6E6E', icon: 'code',
    trending: true,
    rules: [
      'No question is too basic — mockery gets you removed.',
      'Share what you learn: one post per month minimum is encouraged.',
      'Job posts go in the #opportunities thread only.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
  {
    id: 'balogun-market-hub', name: 'Balogun Makers & Market Hub', scope: 'local', city: 'Lagos',
    tagline: 'Small businesses, big neighborhood',
    description: 'Makers, bakers, tailors and traders supporting each other’s hustle. Weekend pop-up markets, bulk-buying groups, and honest advice on pricing your work.',
    tags: ['small-business', 'marketplace', 'food', 'fashion', 'business'],
    memberCount: 1893, memberIds: ['u-adaeze', 'u-funke', 'u-halima', 'u-folake'],
    moderators: ['u-funke'], accent: '#B4472A', icon: 'store',
    trending: false,
    rules: [
      'Buy from members first when you can.',
      'One promo post per week per business.',
      'Disputes between traders go to moderators, not the timeline.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
  {
    id: 'green-lagos', name: 'Green Lagos Initiative', scope: 'local', city: 'Lagos',
    tagline: 'Growing a cooler, greener megacity',
    description: 'Urban farmers, solar engineers and sustainability advocates making Lagos livable. Community gardens, cleanup days, and practical workshops on growing food in small spaces.',
    tags: ['sustainability', 'farming', 'agriculture', 'urban-farming', 'renewable-energy', 'community'],
    memberCount: 1156, memberIds: ['u-chidi', 'u-emeka', 'u-ngozi', 'u-halima', 'u-rekia'],
    moderators: ['u-rekia'], accent: '#1B7F3B', icon: 'leaf',
    trending: true,
    rules: [
      'Practical over performative — share what you actually did.',
      'Workshops are free for members; never resell a spot.',
      'Keep politics to policy discussions, not parties.',
      'Follow the Interact Space Charter at all times.',
    ],
  },
]

// ── Events (dates relative to demo today: 2026-07-17) ────────────────
export const EVENTS = [
  {
    id: 'ev-pitch-night', communityId: 'lagos-entrepreneurs',
    title: 'First-Cheque Pitch Night', date: '2026-07-21', time: '6:00 PM',
    venue: 'Workbay, Yaba', mode: 'in-person',
    description: 'Six founders, five minutes each, real investors in the room. Yemi Ogunleye hosts.',
    tags: ['startups', 'entrepreneurship', 'networking'], attending: 87, host: 'u-yemi',
  },
  {
    id: 'ev-photo-walk', communityId: 'lagos-lens-collective',
    title: 'Makoko at Golden Hour — Photo Walk', date: '2026-07-19', time: '4:30 PM',
    venue: 'Makoko Waterfront (meet at Third Mainland gate)', mode: 'in-person',
    description: 'Monthly photo walk. Bring any camera — phones welcome. Zainab leads, consent cards provided.',
    tags: ['photography', 'art'], attending: 34, host: 'u-zainab',
  },
  {
    id: 'ev-solar-workshop', communityId: 'green-lagos',
    title: 'Home Solar 101: Off the Generator', date: '2026-07-25', time: '10:00 AM',
    venue: 'Green Hub, Ajah', mode: 'in-person',
    description: 'Emeka walks through sizing, pricing and installing a starter home solar setup. Live demo rig.',
    tags: ['renewable-energy', 'sustainability'], attending: 52, host: 'u-emeka',
  },
  {
    id: 'ev-balcony-farm', communityId: 'green-lagos',
    title: 'Balcony Farming Starter Workshop', date: '2026-07-23', time: '9:00 AM',
    venue: 'Freedom Park, Lagos Island', mode: 'in-person',
    description: 'Halima teaches container growing: soil mix, what grows in Lagos heat, and pest control without chemicals. Free seedlings for the first 30.',
    tags: ['urban-farming', 'farming', 'agriculture', 'food'], attending: 41, host: 'u-halima',
  },
  {
    id: 'ev-js-study', communityId: 'naija-devs',
    title: 'Weekly Study Group: JavaScript Deep Dive', date: '2026-07-18', time: '11:00 AM',
    venue: 'Online (community video room)', mode: 'online',
    description: 'This week: closures and the event loop, explained with danfo bus analogies. Beginners very welcome.',
    tags: ['coding', 'web-development', 'learning'], attending: 126, host: 'u-tunde',
  },
  {
    id: 'ev-market-popup', communityId: 'balogun-market-hub',
    title: 'Weekend Makers Pop-Up Market', date: '2026-07-19', time: '10:00 AM',
    venue: 'Hearts Garden, Surulere', mode: 'in-person',
    description: '30 member stalls: food, fashion, crafts. Free table for first-time sellers — DM Funke.',
    tags: ['small-business', 'marketplace', 'food', 'fashion'], attending: 210, host: 'u-funke',
  },
  {
    id: 'ev-asn-demo-day', communityId: 'african-startup-network',
    title: 'Pan-African Virtual Demo Day', date: '2026-08-02', time: '3:00 PM',
    venue: 'Online (global stream)', mode: 'online',
    description: '12 startups from 6 countries pitch to a pan-African investor panel. Lagos watch party at Workbay.',
    tags: ['startups', 'finance', 'tech'], attending: 942, host: 'u-david',
  },
  {
    id: 'ev-farm-tour', communityId: 'green-lagos',
    title: 'Container Farm Open Day', date: '2026-08-08', time: '12:00 PM',
    venue: 'Chidi’s Farm, Ikorodu', mode: 'in-person',
    description: 'Tour a working vertical farm in shipping containers. See hydroponics up close, taste the harvest.',
    tags: ['farming', 'agriculture', 'sustainability', 'startups'], attending: 63, host: 'u-chidi',
  },
]

// ── Discussion posts per community ───────────────────────────────────
export const POSTS = [
  {
    id: 'p1', communityId: 'lagos-entrepreneurs', authorId: 'u-adaeze', ago: '2h',
    title: 'How I got Kola Foods into 12 supermarkets (long post, real numbers)',
    body: 'People keep asking, so here is the full breakdown: distributor margins, the two chains that ghosted me, and the packaging change that doubled reorders…',
    replies: 23, likes: 141, pinned: true,
  },
  {
    id: 'p2', communityId: 'lagos-entrepreneurs', authorId: 'u-yemi', ago: '1d',
    title: 'I read 40 Lagos pitch decks last month. Here are the 5 mistakes I saw in 30 of them.',
    body: 'Mistake #1: your market size slide is a fantasy. Nobody is capturing 1% of all of Africa…',
    replies: 56, likes: 312, pinned: false,
  },
  {
    id: 'p3', communityId: 'lagos-entrepreneurs', authorId: 'u-rekia', ago: '3d',
    title: 'Green grants for SMEs — application window closes Aug 15',
    body: 'The Lagos State green business fund is open again. I helped 4 members win it last cycle. Requirements thread below, ask me anything.',
    replies: 18, likes: 97, pinned: false,
  },
  {
    id: 'p4', communityId: 'african-startup-network', authorId: 'u-david', ago: '5h',
    title: 'Accra → Lagos expansion: what I wish someone told me',
    body: 'Three months into scouting the Lagos market. Regulatory stuff was easier than expected, logistics partnerships much harder…',
    replies: 31, likes: 189, pinned: false,
  },
  {
    id: 'p5', communityId: 'african-startup-network', authorId: 'u-amina', ago: '2d',
    title: 'Growth thread: what actually works for fintech user acquisition in 2026',
    body: 'Agent networks still beat digital ads on CAC in every market we tested. Data inside…',
    replies: 44, likes: 267, pinned: true,
  },
  {
    id: 'p6', communityId: 'lagos-lens-collective', authorId: 'u-zainab', ago: '6h',
    title: 'Critique circle #31 — post one frame from this week',
    body: 'Rules as always: one image, one sentence of context, and give two critiques before posting your own.',
    replies: 27, likes: 88, pinned: true,
  },
  {
    id: 'p7', communityId: 'lagos-lens-collective', authorId: 'u-kunle', ago: '1d',
    title: 'Danfo documentary: looking for a sound recordist (paid)',
    body: 'Shooting 4 days in August around Oshodi. Budget is small but real. Portfolio in comments.',
    replies: 9, likes: 45, pinned: false,
  },
  {
    id: 'p8', communityId: 'naija-devs', authorId: 'u-tunde', ago: '3h',
    title: 'Code review Friday: drop your GitHub link, get a senior review this weekend',
    body: 'Same rules as last month: public repos only, be specific about what feedback you want.',
    replies: 38, likes: 154, pinned: true,
  },
  {
    id: 'p9', communityId: 'naija-devs', authorId: 'u-obi', ago: '9h',
    title: 'I finally deployed my first full-stack app (and everything that broke)',
    body: 'Six weeks, three rewrites, one CORS meltdown. Writing it all down for the next beginner…',
    replies: 21, likes: 132, pinned: false,
  },
  {
    id: 'p10', communityId: 'naija-devs', authorId: 'u-seun', ago: '2d',
    title: 'Study group poll: SQL window functions or intro to ML next month?',
    body: 'We can only fit one. Vote in replies, majority wins, losers get it in September.',
    replies: 47, likes: 76, pinned: false,
  },
  {
    id: 'p11', communityId: 'balogun-market-hub', authorId: 'u-folake', ago: '4h',
    title: 'Pricing help: am I undercharging for event catering?',
    body: 'Did a 200-guest wedding last weekend and barely broke even. Sharing my full cost sheet — tell me where I went wrong.',
    replies: 33, likes: 102, pinned: false,
  },
  {
    id: 'p12', communityId: 'balogun-market-hub', authorId: 'u-funke', ago: '1d',
    title: 'Bulk fabric order closing Thursday — adire and ankara',
    body: 'We hit the minimum for the mill discount. Last call to join the group order, 30% below market.',
    replies: 15, likes: 67, pinned: true,
  },
  {
    id: 'p13', communityId: 'green-lagos', authorId: 'u-halima', ago: '5h',
    title: 'What survived the heat wave: my July balcony harvest report',
    body: 'Ugu and okra thrived, lettuce gave up entirely. Full notes with photos for anyone starting a container garden…',
    replies: 19, likes: 84, pinned: false,
  },
  {
    id: 'p14', communityId: 'green-lagos', authorId: 'u-emeka', ago: '1d',
    title: 'Solar payback calculator — I made a spreadsheet for Lagos homes',
    body: 'Enter your generator fuel spend, get your break-even month. Most members land between 14 and 22 months.',
    replies: 29, likes: 156, pinned: true,
  },
  {
    id: 'p15', communityId: 'green-lagos', authorId: 'u-ngozi', ago: '3d',
    title: 'Community garden + health screening day in Mushin — volunteers needed',
    body: 'Pairing the garden opening with free blood pressure checks. Need 6 more volunteers for the Saturday shift.',
    replies: 12, likes: 58, pinned: false,
  },
]

// ── Opportunities ────────────────────────────────────────────────────
export const OPPORTUNITIES = [
  {
    id: 'op1', type: 'Job', title: 'Junior Frontend Developer (Hybrid, Yaba)',
    org: 'PayQick', tags: ['coding', 'web-development', 'tech'],
    detail: 'Fintech scale-up hiring juniors from the Naija Devs community. Mentorship built in.',
    via: 'naija-devs',
  },
  {
    id: 'op2', type: 'Grant', title: 'Lagos Green Business Fund — up to ₦5M',
    org: 'Lagos State Govt', tags: ['sustainability', 'small-business', 'renewable-energy', 'agriculture'],
    detail: 'Grants for SMEs with a sustainability angle. Applications close Aug 15. Rekia is coaching applicants.',
    via: 'green-lagos',
  },
  {
    id: 'op3', type: 'Gig', title: 'Sound Recordist for Danfo Documentary (Paid)',
    org: 'Kunle Fashola', tags: ['photography', 'art', 'music'],
    detail: '4 shoot days in August around Oshodi. Small but real budget.',
    via: 'lagos-lens-collective',
  },
  {
    id: 'op4', type: 'Mentorship', title: 'Founder Office Hours with Yemi Ogunleye',
    org: 'Lagos Entrepreneurs', tags: ['startups', 'entrepreneurship', 'finance'],
    detail: 'Four 30-minute slots each Friday. Come with one specific problem.',
    via: 'lagos-entrepreneurs',
  },
  {
    id: 'op5', type: 'Market stall', title: 'Free First-Timer Stall — Weekend Pop-Up',
    org: 'Balogun Makers Hub', tags: ['small-business', 'marketplace', 'food', 'fashion'],
    detail: 'Never sold at a market before? Your first table is free this Saturday.',
    via: 'balogun-market-hub',
  },
  {
    id: 'op6', type: 'Volunteer', title: 'Garden & Health Day Volunteers (Mushin)',
    org: 'Green Lagos Initiative', tags: ['community', 'sustainability', 'fitness'],
    detail: 'Six volunteer slots left for Saturday. No experience needed, lunch included.',
    via: 'green-lagos',
  },
]

// ── Onboarding goal options ──────────────────────────────────────────
export const GOAL_OPTIONS = [
  { id: 'meet', label: 'Meet people', icon: 'users' },
  { id: 'join', label: 'Join communities', icon: 'community' },
  { id: 'learn', label: 'Learn something', icon: 'book' },
  { id: 'opportunities', label: 'Find opportunities', icon: 'sparkle' },
  { id: 'share', label: 'Share ideas', icon: 'megaphone' },
  { id: 'create', label: 'Create a community', icon: 'plus-circle' },
  { id: 'business', label: 'Promote a business', icon: 'store' },
  { id: 'events', label: 'Attend events', icon: 'calendar' },
]

// ── Quick Jobs categories — local trade & gig work ────────────────────
export const JOB_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: 'wrench' },
  { id: 'electrical', label: 'Electrical', icon: 'zap' },
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkle' },
  { id: 'moving', label: 'Moving & Hauling', icon: 'truck' },
  { id: 'painting', label: 'Painting', icon: 'store' },
  { id: 'carpentry', label: 'Carpentry', icon: 'wrench' },
  { id: 'appliance-repair', label: 'Appliance Repair', icon: 'wrench' },
  { id: 'gardening', label: 'Gardening & Landscaping', icon: 'leaf' },
  { id: 'delivery', label: 'Delivery & Errands', icon: 'truck' },
  { id: 'tutoring', label: 'Tutoring', icon: 'book' },
  { id: 'photography-gig', label: 'Photography', icon: 'camera' },
  { id: 'event-help', label: 'Event Help', icon: 'calendar' },
  { id: 'tech-support', label: 'Tech Support', icon: 'code' },
  { id: 'catering-gig', label: 'Catering', icon: 'store' },
  { id: 'auto-repair', label: 'Auto Repair', icon: 'wrench' },
]

export const CHARTER = [
  'Safety first — no harassment, threats, or harmful activity.',
  'Respect every member, in every community, in every country.',
  'Privacy is protected — location sharing is always in your control.',
  'Communities are independent, but the Charter applies everywhere.',
]

// ── Globe — public events happening around the world right now ───────
// Demo data styled as if aggregated from public event platforms.
export const WORLD_EVENTS = [
  { id: 'we1', city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, title: 'First-Cheque Pitch Night', platform: 'Interact Space', attending: 87 },
  { id: 'we2', city: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219, title: 'Silicon Savannah Founders Meetup', platform: 'Meetup', attending: 214 },
  { id: 'we3', city: 'Accra', country: 'Ghana', lat: 5.6037, lon: -0.1870, title: 'West Africa Fintech Summit', platform: 'Eventbrite', attending: 640 },
  { id: 'we4', city: 'London', country: 'UK', lat: 51.5072, lon: -0.1276, title: 'Diaspora Tech Founders Night', platform: 'Eventbrite', attending: 312 },
  { id: 'we5', city: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, title: 'Global Creators Marketplace', platform: 'Ticketmaster', attending: 1204 },
  { id: 'we6', city: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, title: 'LatAm x Africa Trade Forum', platform: 'Meetup', attending: 455 },
  { id: 'we7', city: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, title: 'Cross-Border Commerce Expo', platform: 'Eventbrite', attending: 980 },
  { id: 'we8', city: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, title: 'Urban Farming Collective Fair', platform: 'Meetup', attending: 173 },
  { id: 'we9', city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, title: 'Renewable Energy Innovators Night', platform: 'Eventbrite', attending: 288 },
  { id: 'we10', city: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, title: 'Green Cities Symposium', platform: 'Interact Space', attending: 340 },
  { id: 'we11', city: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, title: 'African Diaspora Business Expo', platform: 'Ticketmaster', attending: 502 },
  { id: 'we12', city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, title: 'Creative Makers Salon', platform: 'Meetup', attending: 197 },
  { id: 'we13', city: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219, title: 'Community Health Screening Day', platform: 'Interact Space', attending: 88 },
  { id: 'we14', city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, title: 'Pan-Asia Startup Demo Day', platform: 'Eventbrite', attending: 720 },
  { id: 'we15', city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, title: 'Weekend Makers Pop-Up Market', platform: 'Interact Space', attending: 210 },
  { id: 'we16', city: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, title: 'Sustainable Cities Workshop', platform: 'Meetup', attending: 265 },
]

export const PURPOSE =
  'Voidaj exists to connect people, empower communities, and unlock opportunities by creating a trusted digital environment where individuals can discover their place, share their value, and build meaningful connections that improve lives.'
