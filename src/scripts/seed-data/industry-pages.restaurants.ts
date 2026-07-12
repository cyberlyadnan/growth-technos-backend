import { CmsPublicationStatus } from '@core/constants/cms';
import { IndustryPageSeed, IndustryStubService } from './industry-pages.types';

export const restaurantsIndustryPage: IndustryPageSeed = {
  // ─── Identity ───────────────────────────────────────────────────────────────
  slug: 'restaurants',
  name: 'Restaurants',
  icon: 'UtensilsCrossed',
  displayOrder: 2,
  isFeatured: true,
  publicationStatus: CmsPublicationStatus.PUBLISHED,

  // ─── SEO ────────────────────────────────────────────────────────────────────
  focusKeyword: 'restaurant digital marketing',
  metaTitle: 'Restaurant Digital Marketing Agency | Growth Technos',
  metaDescription:
    'Fill tables, drive direct orders & build guest loyalty. Growth Technos — India\'s F&B digital growth agency for restaurants, cafes & cloud kitchens.',
  metaKeywords: [
    'restaurant digital marketing',
    'restaurant marketing agency India',
    'restaurant website design',
    'food delivery app marketing',
    'restaurant local SEO',
    'cloud kitchen marketing',
    'cafe digital marketing',
    'restaurant online ordering system',
    'restaurant reservation system',
    'restaurant guest retention',
    'F&B digital agency',
    'restaurant growth agency',
  ],
  ogTitle: 'Restaurant Digital Marketing That Fills Tables | Growth Technos',
  ogDescription:
    'From local SEO and direct ordering systems to guest loyalty automation — Growth Technos builds the full digital engine for restaurants, cafes, and cloud kitchens.',
  ogImage: '/uploads/industries/restaurants/og.webp',
  twitterTitle: 'Restaurant Digital Marketing | Growth Technos',
  twitterDescription:
    'Fill tables, grow direct orders, and keep guests coming back. India\'s F&B digital growth agency.',
  twitterImage: '/uploads/industries/restaurants/og.webp',
  faqSchema: true,

  // ─── Description fields ──────────────────────────────────────────────────────
  description:
    'End-to-end digital growth for restaurants, cafes, QSRs, cloud kitchens, and F&B brands — from local discovery and direct-ordering systems to guest loyalty and revenue-multiplying marketing.',
  shortDescription:
    'We help restaurants fill tables, cut aggregator dependency, and build loyal guest databases through conversion-focused websites, direct-ordering tech, local SEO, and data-driven marketing.',
  fullDescription:
    'Growth Technos is India\'s dedicated F&B digital growth partner. We combine restaurant-first strategy with high-performance execution — building direct-ordering platforms that protect your margins, local SEO that wins the "restaurants near me" race, and guest automation that keeps tables filled on slow days. Whether you\'re a single café, a multi-location QSR chain, or a cloud kitchen scaling across cities, we design every touchpoint to convert hungry browsers into loyal regulars.',

  // ─── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    eyebrow: 'Restaurant Digital Growth Agency',
    title: 'Fill Tables. Own Direct Orders. Build Loyal Guests.',
    subtitle:
      'We build the complete digital engine for restaurants, cafes, and cloud kitchens — local SEO that wins discovery, direct-ordering systems that kill aggregator fees, and loyalty automation that keeps regulars coming back.',
    trustStatement:
      'Trusted by 40+ F&B brands across India to drive reservations, direct orders, and guest retention.',
    primaryCta: {
      label: 'Free Restaurant Growth Audit',
      url: '/contact?intent=industry-audit',
    },
    secondaryCta: {
      label: 'See Food Brand Work',
      url: '/work',
    },
    image: {
      url: '/uploads/industries/restaurants/hero.webp',
      alt: 'Restaurant digital marketing — filled dining room and direct online ordering dashboard',
    },
    badges: [
      'Google-Certified F&B Partner',
      'Direct Ordering Specialists',
      'Local SEO Experts',
      'Guest Loyalty Automation',
      'Zomato & Swiggy Growth Playbooks',
    ],
    stats: [
      { label: 'F&B Brands Served', value: '40+', description: 'Restaurants, cafes & cloud kitchens' },
      { label: 'Avg. Direct Order Lift', value: '3.2×', description: 'Within 90 days of launch' },
      { label: 'Avg. Table Occupancy Gain', value: '+34%', description: 'Across reservation-enabled clients' },
      { label: 'Guest Retention Rate', value: '68%', description: 'Via loyalty & automation programs' },
    ],
  },

  // ─── Banner & Gallery ────────────────────────────────────────────────────────
  bannerImage: {
    url: '/uploads/industries/restaurants/banner.webp',
    alt: 'Restaurant digital marketing solutions — online ordering, local SEO, and guest loyalty',
  },
  gallery: [
    {
      url: '/uploads/industries/restaurants/gallery-1.webp',
      alt: 'Restaurant website with direct online ordering and menu showcase',
      caption: 'High-converting restaurant websites built for direct orders',
      order: 1,
    },
    {
      url: '/uploads/industries/restaurants/gallery-2.webp',
      alt: 'QR digital menu and table-side ordering experience',
      caption: 'QR menus and contactless ordering for dine-in guests',
      order: 2,
    },
    {
      url: '/uploads/industries/restaurants/gallery-3.webp',
      alt: 'Restaurant guest loyalty dashboard and WhatsApp automation',
      caption: 'Guest loyalty and WhatsApp re-engagement automation',
      order: 3,
    },
  ],

  // ─── Trusted By ──────────────────────────────────────────────────────────────
  trustedBy: {
    stats: [
      { label: 'F&B Brands Grown', value: '40+', description: 'Restaurants, cafes, QSRs & cloud kitchens' },
      { label: 'Direct Orders Generated', value: '₹8 Cr+', description: 'Bypassing aggregator commissions' },
      { label: 'Google Map Impressions', value: '12 Lakh+', description: 'Monthly for restaurant clients' },
      { label: 'Guest Loyalty Campaigns', value: '200+', description: 'Automated re-engagement flows sent' },
    ],
    logoNote: 'Trusted by growing restaurant and F&B brands across India.',
  },

  // ─── Problems (EXACTLY 10) ───────────────────────────────────────────────────
  problems: [
    {
      title: 'Aggregator Platforms Eat Your Margins',
      description:
        'Zomato and Swiggy charge 18–30% commission on every order, leaving restaurants with razor-thin profits while the platforms own your customer data. Brands that depend solely on aggregators lose ₹15–₹40 per order and have zero ability to retarget or retain those diners.',
      icon: 'BadgePercent',
    },
    {
      title: 'Tables Sit Empty on Slow Days',
      description:
        'Without a reservation system or targeted promotions tied to off-peak hours, restaurants suffer predictable revenue valleys on weekday lunches and early evenings. A 20% seat occupancy drop directly translates to staff cost inefficiency and perishable food waste.',
      icon: 'CalendarX',
    },
    {
      title: 'No Visibility in "Restaurants Near Me" Searches',
      description:
        'When hungry diners search Google Maps, restaurants without optimised Business Profiles, consistent NAP data, and review velocity lose the local pack entirely. Missing local SEO means losing customers who are already two minutes away and ready to spend.',
      icon: 'MapPinOff',
    },
    {
      title: 'No Direct-Order Website or Branded App',
      description:
        'Most restaurant websites are digital brochures with no ordering capability. Without a direct-ordering channel, every online sale gets routed through aggregators, surrendering margin, customer data, and brand relationship — permanently.',
      icon: 'ShoppingBagX',
    },
    {
      title: 'Guest Database Is Zero or Non-Existent',
      description:
        'Without capturing guest names, emails, and phone numbers at POS or reservation, restaurants cannot run loyalty programs, birthday campaigns, or re-engagement sequences. A restaurant with no guest database is fully dependent on advertising spend to refill tables every single week.',
      icon: 'DatabaseZap',
    },
    {
      title: 'Social Media Looks Active But Drives No Revenue',
      description:
        'Posting food photos generates likes but rarely translates into reservations or orders when there is no conversion strategy, call-to-action funnel, or paid promotion amplifying the content. Vanity metrics mask the real problem: social is costing time and money with near-zero ROI.',
      icon: 'TrendingDown',
    },
    {
      title: 'Inconsistent Brand Experience Across Channels',
      description:
        'When menus differ across Zomato, Google, the website, and in-store signage, trust erodes and guests abandon orders. Inconsistent pricing, photos, and descriptions also trigger negative reviews and lost upsell opportunities at every touchpoint.',
      icon: 'GitMerge',
    },
    {
      title: 'New Launches Fail to Generate Opening-Day Buzz',
      description:
        'Restaurants launching without a digital pre-launch strategy — influencer seeding, Google listing optimisation, reservation waiting lists — see thin footfall in the critical first 30 days, making it nearly impossible to build organic momentum and early review mass.',
      icon: 'PartyPopper',
    },
    {
      title: 'No System to Handle and Leverage Customer Reviews',
      description:
        'Negative reviews left unanswered destroy conversion rates — a 3.6-star average vs 4.4-star can reduce diner intent by over 40%. Without a review-generation and response playbook, restaurants bleed future diners to competitors who actively manage their reputation.',
      icon: 'StarOff',
    },
    {
      title: 'Cloud Kitchens Invisible on Delivery Platforms',
      description:
        'Cloud kitchens competing on Zomato and Swiggy without menu SEO, listing images, and review velocity get buried below top-ranked listings, resulting in fewer impressions, lower click-through rates, and perpetually disappointing order volumes despite competitive pricing.',
      icon: 'Cloud',
    },
  ],

  // ─── Solutions (EXACTLY 10) ──────────────────────────────────────────────────
  solutions: [
    {
      problemTitle: 'Aggregator Platforms Eat Your Margins',
      title: 'Direct-Ordering Website & Commission-Free Sales Engine',
      description:
        'We build branded, mobile-first online ordering websites integrated with your POS and payment gateway — so guests order directly, you keep 100% of margins, and you own every buyer\'s data for future remarketing. Includes WhatsApp order confirmations and loyalty opt-ins.',
      result: 'Clients average 3.2× increase in direct order revenue within 90 days of launch.',
      icon: 'ShoppingCart',
    },
    {
      problemTitle: 'Tables Sit Empty on Slow Days',
      title: 'Smart Reservation System & Off-Peak Promotion Automation',
      description:
        'We deploy online reservation systems with real-time table management and build automated off-peak campaigns via WhatsApp, SMS, and email — targeting your existing guest database with time-sensitive offers to fill slow shifts without discounting your brand.',
      result: 'Reservation-enabled clients see average +34% improvement in weekday table occupancy.',
      icon: 'CalendarCheck',
    },
    {
      problemTitle: 'No Visibility in "Restaurants Near Me" Searches',
      title: 'Hyper-Local SEO & Google Business Profile Dominance',
      description:
        'We optimise your Google Business Profile with high-quality photos, keyword-rich descriptions, menu uploads, weekly posts, and systematic review acquisition — engineering your restaurant to rank #1–3 in Google Maps for all high-intent local search queries.',
      result: 'Average 12 lakh monthly Google Map impressions across restaurant clients.',
      icon: 'MapPin',
    },
    {
      problemTitle: 'No Direct-Order Website or Branded App',
      title: 'Conversion-Optimised Restaurant Website with Online Ordering',
      description:
        'We design and develop lightning-fast restaurant websites that showcase your menu with professional food photography, embed direct-ordering functionality, and include reservation CTA placement — converting every web visit into a table booking or direct order.',
      result: 'Websites deliver 4–8% conversion rates vs. the 0.5–1% industry average.',
      icon: 'Globe',
    },
    {
      problemTitle: 'Guest Database Is Zero or Non-Existent',
      title: 'Guest Data Capture & CRM Setup',
      description:
        'We implement zero-friction guest capture at every touchpoint — Wi-Fi sign-in, QR menus, reservation forms, and loyalty programme enrolment — building a segmented CRM that powers birthday campaigns, win-back sequences, and VIP guest experiences automatically.',
      result: 'Restaurants build 1,000+ contactable guests within the first 60 days.',
      icon: 'Users',
    },
    {
      problemTitle: 'Social Media Looks Active But Drives No Revenue',
      title: 'Revenue-Linked Social Media & Influencer Strategy',
      description:
        'We build social content calendars anchored to business outcomes — reservation-driving reels, UGC repurposing, regional food influencer collaborations, and paid social targeting neighbours, office workers, and weekend diners within a precise radius of your outlet.',
      result: 'Social campaigns achieve 5–12× ROAS on Instagram and Facebook for restaurant ads.',
      icon: 'Instagram',
    },
    {
      problemTitle: 'Inconsistent Brand Experience Across Channels',
      title: 'Omni-Channel Menu & Brand Consistency Management',
      description:
        'We audit and synchronise your menu, pricing, photos, and brand voice across Google, Zomato, Swiggy, your website, and in-store QR menus — eliminating trust gaps and enabling seamless upselling that increases average order value by 20–35%.',
      result: 'Consistent brand presentation increases average order value by 20–35%.',
      icon: 'LayoutGrid',
    },
    {
      problemTitle: 'New Launches Fail to Generate Opening-Day Buzz',
      title: 'Restaurant Launch Marketing Blueprint',
      description:
        'We execute 45-day pre-launch and 30-day post-launch digital campaigns — Google listing setup, press outreach, food blogger invites, Instagram countdown content, early-bird reservation drives, and Google Ads geo-targeting — engineering opening-day queues.',
      result: 'Launch clients average 300+ covers in their first two weeks of opening.',
      icon: 'Rocket',
    },
    {
      problemTitle: 'No System to Handle and Leverage Customer Reviews',
      title: 'Reputation Management & 5-Star Review Engine',
      description:
        'We deploy automated post-visit review request flows via WhatsApp and email, build response playbooks for negative reviews, and monitor all review platforms in real time — consistently lifting your average star rating and winning the trust of future diners.',
      result: 'Clients lift average rating from 3.8★ to 4.5★ within 90 days.',
      icon: 'Star',
    },
    {
      problemTitle: 'Cloud Kitchens Invisible on Delivery Platforms',
      title: 'Cloud Kitchen Listing Optimisation & Aggregator Growth Strategy',
      description:
        'We optimise cloud kitchen listings with keyword-rich dish names, high-CTR food photos, strategic promotional pricing, and review velocity campaigns on Zomato and Swiggy — engineering your kitchen to surface in top results for every relevant category.',
      result: 'Cloud kitchen clients see average 2.8× order volume within 60 days of optimisation.',
      icon: 'ChefHat',
    },
  ],

  // ─── Benefits (6) ────────────────────────────────────────────────────────────
  benefits: [
    {
      title: 'Own Your Customer Relationships',
      description:
        'Direct-ordering systems and guest CRM give you a first-party database of verified diners — enabling loyalty campaigns, personalised offers, and retention programs that aggregators can never provide or take away.',
      icon: 'UserCheck',
    },
    {
      title: 'Higher Margins on Every Order',
      description:
        'Shifting even 30% of orders from aggregators to direct channels saves ₹15–₹40 per order net — compounding into lakhs of additional profit annually without changing your menu or pricing.',
      icon: 'TrendingUp',
    },
    {
      title: 'Dominate Local Discovery',
      description:
        'Rank in the top 3 on Google Maps for every high-intent search in your locality — "best biryani near me", "rooftop restaurant Bangalore", "cafe with wifi Pune" — capturing diners at peak intent before competitors.',
      icon: 'MapPin',
    },
    {
      title: 'Tables Filled Predictably, Not by Chance',
      description:
        'Automated reservation systems, off-peak WhatsApp campaigns, and loyalty nudges turn slow shifts into reliable revenue — giving managers visibility and control over occupancy every day of the week.',
      icon: 'CalendarRange',
    },
    {
      title: 'Premium Brand Perception',
      description:
        'Professional food photography, a beautifully designed website, consistent social presence, and a seamless digital ordering experience signal quality before the guest even arrives — justifying premium pricing and reducing price sensitivity.',
      icon: 'Gem',
    },
    {
      title: 'One Agency, Full F&B Growth Stack',
      description:
        'Website, local SEO, ordering tech, social media, paid ads, CRM, and loyalty — all delivered by a team that speaks F&B. No vendor juggling, no strategy gaps, no monthly deck-and-disappear consultants.',
      icon: 'Layers',
    },
  ],

  // ─── Business Results (6) ────────────────────────────────────────────────────
  businessResults: [
    { label: 'Direct Order Revenue Lift', value: '3.2×', description: 'Average within 90 days of direct-ordering launch' },
    { label: 'Table Occupancy Improvement', value: '+34%', description: 'For reservation-enabled restaurant clients' },
    { label: 'Google Map Impressions', value: '12 Lakh+', description: 'Monthly across active restaurant clients' },
    { label: 'Aggregator Commission Saved', value: '₹8 Cr+', description: 'Direct order revenue generated for clients' },
    { label: 'Review Rating Lift', value: '3.8★ → 4.5★', description: 'Average improvement in 90 days' },
    { label: 'Cloud Kitchen Order Lift', value: '2.8×', description: 'Order volume within 60 days of optimisation' },
  ],

  // ─── Process (8 steps: Discover→Growth) ─────────────────────────────────────
  process: [
    {
      title: 'Discover',
      description:
        'Deep audit of your restaurant\'s digital footprint — Google listing health, aggregator performance, website conversion rate, social presence, review profile, and competitor positioning in your locality.',
      order: 1,
    },
    {
      title: 'Guest Intelligence',
      description:
        'Map the full guest journey: how diners discover you, what drives the reservation or order decision, where they drop off, and what brings them back. Identify highest-value guest segments and peak demand windows.',
      order: 2,
    },
    {
      title: 'Strategy Blueprint',
      description:
        'Deliver a 90-day Restaurant Growth Blueprint covering local SEO priorities, direct-ordering rollout plan, social content strategy, paid media targets, and loyalty programme architecture — with clear KPIs for every initiative.',
      order: 3,
    },
    {
      title: 'Tech Build',
      description:
        'Build or upgrade your digital ordering platform, reservation system, QR menu, and guest CRM integrations — engineered for mobile-first performance, POS compatibility, and frictionless checkout.',
      order: 4,
    },
    {
      title: 'Local Domination',
      description:
        'Execute the full local SEO playbook: Google Business Profile optimisation, citation building, review acquisition campaigns, on-page SEO for location pages, and structured data markup for rich search results.',
      order: 5,
    },
    {
      title: 'Activate & Launch',
      description:
        'Launch social campaigns, Google Ads, and WhatsApp automation with conversion-tracked creative. Coordinate influencer seedings, opening events, or seasonal promotions with end-to-end digital amplification.',
      order: 6,
    },
    {
      title: 'Measure & Optimise',
      description:
        'Track weekly KPIs across every channel — direct order volume, reservation conversion, local pack rankings, review velocity, ad ROAS, and guest repeat rate — and optimise continuously based on real restaurant data.',
      order: 7,
    },
    {
      title: 'Growth',
      description:
        'Scale what works: expand to multiple locations, launch new delivery brands, grow loyalty programme membership, launch a mobile app, and compound compounding digital assets into a long-term competitive moat.',
      order: 8,
    },
  ],

  // ─── Why Us (8) ──────────────────────────────────────────────────────────────
  whyUs: [
    {
      title: 'F&B-First Thinking, Not Generic Agency Playbooks',
      description:
        'We understand the 30% aggregator margin problem, the 11am–noon delivery dead zone, and the psychology of a diner choosing between three similar restaurants on Google Maps. Our strategies are built for F&B realities, not repurposed from e-commerce or SaaS.',
      icon: 'UtensilsCrossed',
    },
    {
      title: 'End-to-End Digital Stack Under One Roof',
      description:
        'Website design, direct-ordering tech, local SEO, paid ads, social content, influencer outreach, CRM, and guest automation — all owned and executed by Growth Technos. No handoffs to subagencies, no strategy execution gaps.',
      icon: 'Layers',
    },
    {
      title: 'Proven Direct-Ordering Revenue Results',
      description:
        'Our direct-ordering implementations generate measurable commission savings and margin recovery — averaging ₹8 Cr+ in direct orders tracked across our restaurant client base, with live dashboards you can verify.',
      icon: 'BarChart3',
    },
    {
      title: 'Local SEO Dominance That Outlasts Ad Spend',
      description:
        'We engineer sustainable local rankings that keep filling tables long after a campaign ends — not just short-term paid visibility that evaporates the moment ad budgets pause.',
      icon: 'Search',
    },
    {
      title: 'Restaurant Launch Specialists',
      description:
        'Whether you\'re opening your first outlet or your fifth, our launch marketing blueprint is proven to generate opening-day queues, seed early reviews, and build organic momentum in the first 30 days.',
      icon: 'Rocket',
    },
    {
      title: 'CRM & Guest Loyalty That Actually Runs Itself',
      description:
        'We build fully automated guest communication flows — birthday offers, re-engagement sequences, loyalty milestones, and post-visit review requests — that run 24/7 without any manual effort from your team.',
      icon: 'Workflow',
    },
    {
      title: 'Transparent, KPI-Anchored Reporting',
      description:
        'Weekly dashboards showing direct order volume, reservation conversions, Google Map impressions, ad spend efficiency, and review ratings — in plain language your management team can act on, not agency jargon.',
      icon: 'LineChart',
    },
    {
      title: 'Deep Ecosystem Expertise: Zomato, Swiggy & Google',
      description:
        'We know the ranking algorithms, promotional structures, and listing optimisation tactics that move your restaurant up the aggregator stack — not guesswork, but systematic execution refined across 40+ F&B clients.',
      icon: 'Award',
    },
  ],

  // ─── Technology (5) ──────────────────────────────────────────────────────────
  technology: [
    { name: 'Next.js / React (Restaurant Websites & Ordering)', level: 95 },
    { name: 'Google Business Profile & Local SEO Stack', level: 97 },
    { name: 'WhatsApp Business API & CRM Automation', level: 90 },
    { name: 'Meta & Google Ads (F&B Targeting)', level: 92 },
    { name: 'POS Integration (Petpooja, UrbanPiper, Dotpe)', level: 85 },
    { name: 'Zomato & Swiggy Listing Optimisation', level: 93 },
  ],

  // ─── Pricing ─────────────────────────────────────────────────────────────────
  pricing: {
    starting: '₹25,000/month',
    timeline: '6–16 weeks depending on scope',
    included: [
      'Restaurant growth audit & strategy workshop',
      'Conversion-optimised website with online ordering',
      'Google Business Profile & local SEO foundation',
      'Social media content & paid ad management',
      'Guest CRM setup and WhatsApp automation',
      'Monthly performance reporting & roadmap review',
    ],
    note: 'Custom pricing for multi-location chains, cloud kitchen networks, and full-stack builds including mobile apps or reservation systems.',
  },

  // ─── FAQs (EXACTLY 15) ───────────────────────────────────────────────────────
  faqs: [
    {
      question: 'How does Growth Technos help restaurants reduce aggregator dependency?',
      answer:
        'We build branded direct-ordering websites and, where appropriate, PWA-based ordering apps that give diners a compelling reason to order directly — through exclusive member prices, loyalty points, faster checkout, and a better brand experience. We then drive traffic to your direct channel via Google Ads, social media, and in-restaurant QR codes, steadily shifting order mix from aggregators to commission-free channels. Most clients reduce aggregator share by 25–40% within 6 months.',
    },
    {
      question: 'What results can a restaurant realistically expect from local SEO?',
      answer:
        'Restaurants typically see Google Business Profile impressions double within 60–90 days of a full optimisation — covering keyword-rich descriptions, professional photo uploads, weekly Google Posts, Q&A management, and a systematic review acquisition campaign. In competitive markets like Mumbai, Delhi, and Bangalore, ranking in the top 3 for primary cuisine + location queries drives an additional 30–60 covers per month without any paid advertising spend.',
    },
    {
      question: 'Do you work with cloud kitchens, or only dine-in restaurants?',
      answer:
        'We work extensively with cloud kitchens. Our cloud kitchen growth playbook covers aggregator listing optimisation (keyword-rich dish names, high-CTR hero images, strategic promotional pricing), review velocity campaigns to improve platform rankings, and direct-ordering website setup for brands that want to build off-platform revenue. We also help cloud kitchen operators launch multiple virtual brands from a single kitchen to maximise order volume.',
    },
    {
      question: 'How long does it take to build a restaurant website with online ordering?',
      answer:
        'A standard restaurant website with integrated online ordering typically takes 4–6 weeks from kickoff to launch. This includes strategy, design, menu build, payment gateway integration, POS connection, and quality assurance testing across devices. For multi-location chains or custom mobile apps, timelines extend to 10–16 weeks. We always launch a landing page within the first 2 weeks so you can start capturing leads immediately.',
    },
    {
      question: 'What is a QR digital menu and why should my restaurant use one?',
      answer:
        'A QR digital menu replaces printed menus with a mobile-optimised menu page that guests access by scanning a table QR code. Beyond cost savings on print reprinting, QR menus enable real-time price and item updates, upsell prompts, allergen information, and optional table-side ordering integration. We build QR menus that match your brand identity and link seamlessly with your direct-ordering system, increasing average order value by 15–25% through smart item placement and combo suggestions.',
    },
    {
      question: 'Can you help with both Zomato/Swiggy listings AND our own website?',
      answer:
        'Yes — this is our recommended dual-channel approach. We optimise your aggregator listings for maximum platform visibility and order conversion (the right photos, dish descriptions, pricing strategy, and promotional cadence), while simultaneously building your direct-ordering channel to gradually reduce commission dependency. The two channels complement each other: aggregators drive discovery for new guests, while your direct channel retains them and captures margin on repeat orders.',
    },
    {
      question: 'How does restaurant guest loyalty automation work?',
      answer:
        'We connect your reservation or ordering system to a CRM and build automated WhatsApp and email flows triggered by guest behaviour. Examples include: a post-visit thank-you with a review request link, a birthday offer 7 days before the guest\'s birthday, a win-back message after 30 days of inactivity, and a loyalty milestone congratulation when a guest hits their 5th order. All flows run automatically, building brand relationship at scale without manual team effort.',
    },
    {
      question: 'What does a restaurant reservation system from Growth Technos include?',
      answer:
        'Our reservation system implementation includes: an embeddable booking widget for your website, a Google Reserve integration for direct booking from Google Maps, automated WhatsApp/SMS confirmation and reminder sequences, a real-time table availability dashboard for your host team, and wait-list management for peak periods. We also build no-show reduction features — prepayment for peak slots and automated reminders — that cut no-show rates by 50–70%.',
    },
    {
      question: 'How do you handle restaurant reputation management and negative reviews?',
      answer:
        'Our reputation management playbook has three layers: prevention (automated post-visit feedback collection via WhatsApp to catch dissatisfied guests privately before they post publicly), response (timely, branded responses to all reviews on Google, Zomato, Swiggy, and TripAdvisor), and generation (systematic 5-star review acquisition campaigns targeting happy regulars). Most clients lift their Google rating by 0.5–0.8 stars within 90 days, which directly increases click-through rates and reservation conversions.',
    },
    {
      question: 'Do you offer social media management for restaurants specifically?',
      answer:
        'Yes. Our F&B social media service is built around conversion, not just content. We produce a monthly content calendar that balances brand storytelling, menu showcases, UGC repurposing, and offer-driven posts designed to generate reservation enquiries and direct order clicks. We also manage Instagram and Facebook ad campaigns with hyper-local targeting — reaching diners within 3–10 km of your outlet during their peak discovery windows, typically 11am–1pm and 6pm–8pm.',
    },
    {
      question: 'What is included in the Free Restaurant Growth Audit?',
      answer:
        'The Free Restaurant Growth Audit is a 45–60 minute deep-dive covering: Google Business Profile health score and ranking position for your top 10 keywords, website performance and conversion rate analysis, aggregator listing quality review, social media content and paid spend efficiency assessment, review profile analysis, and competitor benchmarking. You receive a prioritised growth roadmap document (valued at ₹10,000) with specific, actionable recommendations — whether or not you engage us further.',
    },
    {
      question: 'How do you drive more walk-in traffic to a new restaurant location?',
      answer:
        'For new locations, we run a 45-day pre-launch and 30-day post-launch activation campaign. Pre-launch: Google Business Profile setup and optimisation, geo-targeted Instagram and Facebook ads in the catchment area, food blogger and micro-influencer seeding, and an early-bird reservation drive. Post-launch: review generation campaign, launch PR content, Google Maps verification and photo upload blitz, and retargeting ads for page visitors who didn\'t book. This system consistently delivers 200–400 covers in the first two weeks.',
    },
    {
      question: 'Can Growth Technos help a café chain scale from 3 to 10 locations digitally?',
      answer:
        'Absolutely. Multi-location scaling is a core competency. We build location-specific landing pages for local SEO, centralised CRM for unified guest data, location-level Google Business Profiles managed under a group dashboard, and a scalable paid media framework where each new location gets a proven launch playbook. We also advise on tech stack standardisation — POS, ordering systems, and CRM — so each new location inherits the same digital infrastructure from day one.',
    },
    {
      question: 'How do paid ads work for restaurants? What platforms do you use?',
      answer:
        'We run restaurant paid campaigns across Google (Local Services Ads, Search, and Maps Ads for "restaurants near me" queries) and Meta (Instagram and Facebook with radius targeting and interest-based food segments). Restaurant ad creative focuses on high-appetite visual content, time-sensitive offers, and clear CTAs that link directly to your reservation system or ordering page. We track cost-per-reservation and cost-per-order — not just impressions — so every rupee of ad spend is accountable to revenue.',
    },
    {
      question: 'What makes Growth Technos different from a general digital marketing agency?',
      answer:
        'Three things: F&B domain depth, full-stack execution, and outcome accountability. We understand the economics of a restaurant — food cost, table turn, aggregator margin — and build strategies around restaurant P&L, not generic traffic metrics. We own the full digital stack — tech, SEO, social, paid, CRM, automation — so there are no strategy-execution gaps. And we report on covers, orders, and revenue, not followers and impressions. Our clients stay with us because the numbers move.',
    },
  ],

  // ─── Resources ───────────────────────────────────────────────────────────────
  resources: [
    {
      title: 'Free Restaurant Growth Audit (Worth ₹10,000)',
      description:
        'Get a full audit of your restaurant\'s digital presence — Google ranking, website conversion, aggregator performance, social media, and reputation — with a prioritised action roadmap delivered within 48 hours.',
      href: '/contact?intent=industry-audit',
      type: 'audit',
    },
    {
      title: 'Restaurant Digital Growth Checklist',
      description:
        '47-point checklist covering every digital touchpoint a restaurant must optimise — from Google Business Profile to QR menu setup, direct ordering, and guest loyalty — with a priority score for each item.',
      href: '/resources/restaurant-digital-growth-checklist',
      type: 'download',
    },
    {
      title: 'The Complete Guide to Restaurant Local SEO in India',
      description:
        'A definitive guide to ranking #1 on Google Maps for restaurant searches in Indian cities — covering GBP optimisation, review strategy, citation building, and local content frameworks.',
      href: '/blog/local-seo-double-restaurant-reservations',
      type: 'guide',
    },
    {
      title: 'Restaurant vs Aggregator ROI Calculator',
      description:
        'Enter your monthly order volume and average order value to instantly calculate how much commission you\'re surrendering to Zomato and Swiggy — and your potential direct-order profit recovery.',
      href: '/tools/restaurant-aggregator-roi-calculator',
      type: 'download',
    },
    {
      title: 'Restaurant Social Media Content Calendar Template',
      description:
        'A ready-to-use monthly content calendar template for restaurant social media — with 30 post ideas, caption frameworks, hashtag strategy, and posting time recommendations for Indian F&B brands.',
      href: '/resources/restaurant-social-media-content-calendar',
      type: 'template',
    },
  ],

  // ─── Audit CTA ───────────────────────────────────────────────────────────────
  auditCta: {
    title: 'Free Restaurant Growth Audit — Valued at ₹10,000',
    description:
      'In 45 minutes, we\'ll audit your restaurant\'s Google ranking, website conversion rate, aggregator performance, social presence, and review profile — then hand you a prioritised growth roadmap to fill more tables and grow direct orders. No obligation, no pitch deck.',
    buttonLabel: 'Claim Your Free Audit',
    buttonUrl: '/contact?intent=industry-audit',
  },

  // ─── Final CTA ───────────────────────────────────────────────────────────────
  finalCta: {
    title: 'Ready to Fill Tables and Own Your Growth?',
    description:
      'Book a strategy call with a Growth Technos F&B specialist. We\'ll map out a 90-day plan to drive direct orders, fill off-peak covers, and build the guest loyalty system your restaurant deserves.',
    buttonLabel: 'Book Your Strategy Call',
    buttonUrl: '/contact?intent=strategy-call',
  },

  // ─── Testimonials (3) ────────────────────────────────────────────────────────
  testimonials: [
    {
      author: 'Arjun Mehta',
      position: 'Co-Founder',
      company: 'The Spice Route — Multi-Outlet Restaurant Chain, Pune',
      text: 'Growth Technos transformed our digital presence completely. Within 90 days of launching our direct ordering website and running their local SEO playbook, our direct order revenue tripled and we cut our Zomato dependency by 35%. The guest CRM they set up now runs birthday and re-engagement campaigns automatically — it\'s like having an extra marketing manager we never have to manage.',
      avatar: '/uploads/industries/restaurants/testimonial-arjun-mehta.webp',
    },
    {
      author: 'Priya Nair',
      position: 'Founder',
      company: 'Kafe Botanica — Boutique Café, Bangalore',
      text: 'I was spending ₹80,000 a month on Swiggy promotions with mediocre results. Growth Technos rebuilt our entire digital strategy — new website, QR menus, Google presence, and Instagram ads targeting office professionals near our location. In six months, our café is full on weekdays, our Google rating is 4.7, and I\'ve reduced aggregator ad spend by 60% while growing overall revenue by 28%.',
      avatar: '/uploads/industries/restaurants/testimonial-priya-nair.webp',
    },
    {
      author: 'Sameer Khan',
      position: 'Operations Director',
      company: 'CloudBite Kitchens — Cloud Kitchen Network, Mumbai & Delhi',
      text: 'Scaling a cloud kitchen network without the right digital infrastructure is nearly impossible. Growth Technos built our direct ordering platform, optimised all 12 brand listings on Zomato and Swiggy, and set up city-level local SEO for each kitchen. Our average order volume per brand is up 2.9× in four months. They actually understand the cloud kitchen model — that\'s rare in the agencies we\'ve spoken to.',
      avatar: '/uploads/industries/restaurants/testimonial-sameer-khan.webp',
    },
  ],

  // ─── Content (HTML) ───────────────────────────────────────────────────────────
  content: {
    format: 'html',
    html: `
<article class="industry-content restaurants-industry-content">

  <section class="ic-intro">
    <h2>Restaurant Digital Marketing That Drives Real Revenue</h2>
    <p>The Indian food and beverage industry is one of the most competitive digital battlegrounds in existence. Every restaurant, café, and cloud kitchen is competing for the same finite pool of hungry diners — on Google Maps, on Zomato, on Instagram, and increasingly on their own direct channels. The restaurants that win are not necessarily those with the best food; they are the ones with the best <strong>digital infrastructure</strong>: a system that captures discovery, converts intent, and retains guests automatically.</p>
    <p>Growth Technos is India's dedicated restaurant digital marketing agency. We build that infrastructure — from the local SEO foundation that makes your restaurant the first result when someone searches "biryani near me", to the direct-ordering website that recovers the 20–30% margin Zomato and Swiggy take on every delivery order, to the WhatsApp automation that fills your Tuesday lunch shift using your existing guest database. Every service we offer is designed around restaurant economics, not generic digital marketing theory.</p>
  </section>

  <section class="ic-local-seo">
    <h2>Restaurant Local SEO: Winning the "Near Me" Race</h2>
    <p>Local search is the single highest-intent traffic channel for restaurants. When a diner searches "best cafe in Koramangala" or "pizza delivery open now Andheri", they are ready to order within minutes. Ranking in the Google Maps Local Pack (the top 3 results) for your primary cuisine and location keywords is worth hundreds of covers per month — and it compounds over time, unlike paid advertising that stops the moment you pause your budget.</p>
    <p>Our local SEO approach for restaurants covers the full optimisation stack: <strong>Google Business Profile</strong> enhancement with keyword-rich descriptions, high-quality food and ambiance photography (minimum 50 photos), menu uploads in structured format, weekly Google Posts, and meticulous category selection. We build systematic <strong>review acquisition campaigns</strong> via WhatsApp and email that generate a steady stream of authentic 5-star reviews — the single most influential ranking factor in Google Maps. We also build and manage <strong>local citations</strong> across Justdial, IndiaMart, Sulekha, TripAdvisor, and 40+ directory platforms, ensuring perfect NAP consistency that Google rewards with higher local rankings.</p>
    <p>For multi-location restaurants and café chains, we build <strong>dedicated location landing pages</strong> on your website — each optimised for hyper-local keywords — giving your brand multiple ranking footprints across every locality you serve.</p>
  </section>

  <section class="ic-direct-ordering">
    <h2>Direct Online Ordering: Reclaiming Your Margin</h2>
    <p>Every order placed through Zomato or Swiggy costs your restaurant 18–30% in platform commission. For a restaurant doing ₹10 lakh in monthly delivery revenue, that is ₹1.8–₹3 lakh walking out the door every month — for customers you originally acquired through your own brand building. Building a direct-ordering channel is not about abandoning aggregators; it is about owning a parallel revenue stream where you keep 100% of every order and own the guest relationship completely.</p>
    <p>We build <strong>branded direct-ordering websites</strong> that are fast, mobile-first, and designed for F&B conversion. Features include: a beautifully presented digital menu with professional food photography, real-time availability and preparation time displays, POS integration with platforms like Petpooja, UrbanPiper, and Dotpe, secure payment gateway connectivity (Razorpay, PhonePe, Cashfree), and WhatsApp order confirmations that feel personal, not automated. We also implement <strong>loyalty programme mechanics</strong> directly into the ordering flow — points accumulation, referral rewards, and exclusive member pricing — that give your regular guests a tangible reason to order directly every single time.</p>
  </section>

  <section class="ic-reservations">
    <h2>Restaurant Reservation Systems: From Walk-In to Waitlist</h2>
    <p>A robust online reservation system is the difference between predictable revenue and chaotic walk-in dependency. Modern diners — particularly the 25–45 urban demographic that frequents premium casual and fine dining restaurants — expect to book a table online in under 30 seconds, receive an instant WhatsApp confirmation, and get a reminder two hours before their reservation. When this experience is absent, they simply book at the competitor who offers it.</p>
    <p>Our reservation system implementations integrate directly into your website and <strong>Google Reserve</strong> — allowing guests to book from your Google Business Profile without ever leaving Google. Features include real-time table availability management, configurable covers-per-slot limits, automated WhatsApp and SMS confirmation flows, pre-visit upsell prompts (special menus, birthday packages, wine pairings), and waitlist management for peak periods. We also implement <strong>no-show reduction</strong> tools — partial prepayment for high-demand slots and 2-hour pre-arrival SMS reminders — that consistently cut no-show rates by 50–70%.</p>
  </section>

  <section class="ic-qr-menus">
    <h2>QR Digital Menus: The Smart Dine-In Experience</h2>
    <p>QR digital menus are no longer a pandemic novelty — they are a revenue optimisation tool. When a diner scans a table QR code and sees a beautifully designed, photo-rich menu on their phone, restaurants gain multiple advantages: <strong>real-time menu updates</strong> without reprinting costs, <strong>strategic upsell placement</strong> that surfaces high-margin items and combos at the right moment, allergen and ingredient transparency that reduces staff query load, and optional integration with a <strong>table-side ordering system</strong> that routes orders directly to the kitchen display.</p>
    <p>Growth Technos builds QR menus that are brand-matched, blazing fast on mobile data, and engineered with conversion in mind — with high-appetite food photography, clear category navigation, and intelligent combo and add-on prompts that lift average check size by 15–25%. We also use QR menus as a <strong>guest data capture touchpoint</strong> — offering a loyalty enrolment prompt when guests open the menu, building your CRM database automatically with every dine-in cover.</p>
  </section>

  <section class="ic-guest-automation">
    <h2>Guest Loyalty & Automation: Turning One-Time Diners into Regulars</h2>
    <p>Acquiring a new restaurant guest costs 5–7× more than retaining an existing one. The most profitable growth strategy for any established restaurant is not to chase new diners — it is to maximise the lifetime value of the guests who have already walked through your door. Guest loyalty automation is how modern restaurants accomplish this at scale without a dedicated marketing team.</p>
    <p>We build fully automated guest communication systems using <strong>WhatsApp Business API</strong> and email — triggered by real guest behaviour data from your POS and reservation system. A guest who dined in on their birthday last year gets a personalised offer 10 days before this year's birthday. A guest who hasn't ordered in 45 days receives a "We miss you" win-back offer with a single-use discount code. A loyalty milestone — the guest's 10th visit — triggers a complimentary dessert offer and a heartfelt congratulation. These flows run 24/7 without manual effort, building brand loyalty that no aggregator can replicate or disrupt.</p>
    <p>Our <strong>reputation management</strong> automation also sits in this layer: post-visit satisfaction surveys sent via WhatsApp that catch dissatisfied guests before they post publicly, and automated review request flows that consistently generate authentic 5-star reviews on Google, Zomato, and TripAdvisor.</p>
  </section>

  <section class="ic-aggregator-strategy">
    <h2>Aggregator Growth Strategy: Zomato, Swiggy & Beyond</h2>
    <p>Aggregators are a necessary distribution channel for most Indian restaurants, but they need to be approached as a growth tool rather than a dependency. Our aggregator optimisation service covers the full listing strategy: keyword-rich dish names that rank in platform search, high-CTR hero images designed to maximise click-through on category pages, strategic pricing and discount structuring that protects margins while winning promotional placement, and review velocity campaigns to improve platform ranking.</p>
    <p>For <strong>cloud kitchens</strong>, aggregator visibility is the primary revenue lever, and even small improvements in platform ranking have outsized order volume impact. We manage cloud kitchen listings with the precision of an SEO campaign — analysing competitor positioning, testing dish name keywords, rotating photography, and running A/B tests on pricing strategy to identify the exact configuration that maximises order volume and profitability per brand.</p>
  </section>

  <section class="ic-social-paid">
    <h2>Restaurant Social Media & Paid Advertising</h2>
    <p>Instagram and Facebook are the discovery engines for food experiences. When a diner sees a beautifully shot reel of your signature dish, a behind-the-scenes peek at your kitchen, or a time-limited weekend offer — and the ad is geo-targeted to people within 5 km of your restaurant during the 6–8pm dinner decision window — the conversion from ad to reservation or order can be remarkably efficient.</p>
    <p>Our F&B social media management service produces monthly content calendars with brand storytelling, menu showcases, UGC curation, and promotional posts tied directly to business objectives — seasonal menus, new branch launches, off-peak fill campaigns. Our paid advertising team runs <strong>Google Local Ads</strong> targeting high-intent "near me" queries and <strong>Meta Ads</strong> with radius targeting and food-interest segments — with creative that has been tested across 40+ restaurant accounts for click-through and reservation conversion performance.</p>
  </section>

</article>
    `.trim(),
    plainText:
      'Restaurant digital marketing that fills tables, drives direct orders, and builds guest loyalty. Growth Technos builds the complete digital engine for restaurants, cafes, and cloud kitchens across India — from local SEO and direct-ordering platforms to reservation systems, QR menus, guest automation, and aggregator growth strategy on Zomato and Swiggy.',
  },

  // ─── Related slugs ───────────────────────────────────────────────────────────
  relatedServiceSlugs: [
    'web-development',
    'ecommerce-solutions',
    'digital-marketing',
    'digital-marketing--seo',
    'digital-marketing--social-media-marketing',
    'mobile-app-development',
    'restaurants-online-ordering',
    'restaurants-qr-menu',
    'restaurants-reservation-system',
    'restaurants-guest-automation',
  ],
  relatedPortfolioSlugs: ['private-chef', 'alveera-hospitality-travel-platform'],
  relatedBlogSlugs: ['local-seo-double-restaurant-reservations'],
};

// ─── Stub Services ────────────────────────────────────────────────────────────

export const restaurantsStubServices: IndustryStubService[] = [
  {
    slug: 'restaurants-online-ordering',
    title: 'Restaurant Online Ordering System',
    shortDescription:
      'Commission-free branded online ordering platform for restaurants — integrated with your POS, payment gateway, and loyalty programme to drive direct revenue and reduce aggregator dependency.',
    description:
      'We design and build mobile-first restaurant online ordering websites and PWAs that give diners a premium branded ordering experience — without Zomato or Swiggy taking a 20–30% cut. Features include a rich digital menu with food photography, real-time POS sync (Petpooja, UrbanPiper, Dotpe), secure payment processing (Razorpay, Cashfree), WhatsApp order confirmation, loyalty points integration, and an admin dashboard for menu management and order tracking. Every system is engineered to maximise average order value through smart combo suggestions and upsell prompts, while capturing guest data for future remarketing.',
    kind: 'specialty',
    categorySlug: 'ecommerce-solutions',
  },
  {
    slug: 'restaurants-qr-menu',
    title: 'Restaurant QR Digital Menu',
    shortDescription:
      'Branded QR digital menus for dine-in restaurants — mobile-optimised, real-time updatable, with built-in upsell prompts and guest loyalty enrolment to grow average check size.',
    description:
      'Our QR digital menu service replaces static printed menus with a blazing-fast, mobile-first menu experience guests access by scanning a table QR code. Each menu is brand-designed with professional food photography, intuitive category navigation, allergen information, and intelligent combo and add-on prompts that increase average check size by 15–25%. Menus update in real time — no reprinting, no version mismatch across tables. We integrate optional table-side ordering (orders routed to kitchen display), a guest loyalty enrolment prompt on menu open, and analytics on which items are viewed most — giving operators data to make smarter menu engineering decisions.',
    kind: 'specialty',
    categorySlug: 'ecommerce-solutions',
  },
  {
    slug: 'restaurants-reservation-system',
    title: 'Restaurant Reservation & Table Management System',
    shortDescription:
      'Online reservation system for restaurants with Google Reserve integration, real-time table management, automated WhatsApp confirmations, and no-show reduction tools.',
    description:
      'We implement and configure full restaurant reservation systems — from the guest-facing booking widget embedded on your website to the host-team table management dashboard. Our setup includes Google Reserve integration so guests can book directly from Google Maps, automated WhatsApp and SMS confirmation and reminder flows, configurable covers-per-slot limits, waitlist management for peak periods, and no-show reduction tools including optional prepayment for high-demand slots. The system also enables pre-visit upsell prompts (birthday packages, set menus, wine pairings) and post-visit feedback collection, feeding data back into your guest CRM for ongoing loyalty and retention campaigns.',
    kind: 'specialty',
    categorySlug: 'software-saas-development',
  },
  {
    slug: 'restaurants-guest-automation',
    title: 'Restaurant Guest Loyalty & Automation',
    shortDescription:
      'WhatsApp and email guest automation for restaurants — birthday campaigns, win-back sequences, loyalty milestones, and post-visit review requests that run 24/7 to maximise guest lifetime value.',
    description:
      'We build fully automated guest communication and loyalty systems for restaurants using WhatsApp Business API and email. Triggered by real guest behaviour data from your POS and reservation platform, our automation flows include: post-visit thank-you and review request messages, birthday and anniversary personalised offers, win-back campaigns for lapsed guests (30/60/90-day inactivity triggers), loyalty milestone rewards, and off-peak fill campaigns targeting your existing guest database with time-sensitive offers. We also implement post-visit satisfaction surveys that intercept dissatisfied guests before they post a negative review publicly. All flows are configured, tested, and monitored by our team — your staff interact with guests, we handle the digital follow-through.',
    kind: 'specialty',
    categorySlug: 'software-saas-development',
  },
];
