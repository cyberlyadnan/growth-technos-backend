import { CmsPublicationStatus } from '@core/constants/cms';

type IndustrySeed = {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  isFeatured: boolean;
  displayOrder: number;
  publicationStatus: CmsPublicationStatus;
  metaKeywords: string[];
  metaTitle?: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  faqSchema: boolean;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    trustStatement: string;
    primaryCta: { label: string; url: string };
    secondaryCta: { label: string; url: string };
    badges: string[];
    stats: Array<{ label: string; value: string; description?: string }>;
  };
  trustedBy: {
    stats: Array<{ label: string; value: string; description?: string }>;
    logoNote: string;
  };
  problems: Array<{ title: string; description: string; icon?: string }>;
  solutions: Array<{
    problemTitle: string;
    title: string;
    description: string;
    result: string;
    icon?: string;
  }>;
  benefits: Array<{ title: string; description: string; icon?: string }>;
  businessResults: Array<{ label: string; value: string; description?: string }>;
  process: Array<{ title: string; description: string; order: number }>;
  whyUs: Array<{ title: string; description: string; icon?: string }>;
  technology: Array<{ name: string; level?: number }>;
  pricing: {
    starting: string;
    timeline: string;
    included: string[];
    note: string;
  };
  faqs: Array<{ question: string; answer: string }>;
  resources: Array<{ title: string; description: string; href: string; type: string }>;
  auditCta: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonUrl: string;
  };
  finalCta: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonUrl: string;
  };
  testimonials: Array<{
    author: string;
    position: string;
    company: string;
    text: string;
  }>;
};

function buildIndustrySeed(
  base: Pick<
    IndustrySeed,
    | 'slug'
    | 'name'
    | 'description'
    | 'shortDescription'
    | 'fullDescription'
    | 'icon'
    | 'displayOrder'
    | 'metaKeywords'
    | 'hero'
    | 'problems'
    | 'solutions'
    | 'benefits'
    | 'businessResults'
    | 'faqs'
    | 'resources'
    | 'testimonials'
  > & {
    trustedByStats?: IndustrySeed['trustedBy']['stats'];
    technology?: IndustrySeed['technology'];
    metaTitle?: string;
    ogTitle?: string;
    ogDescription?: string;
  },
): IndustrySeed {
  const nameLower = base.name.toLowerCase();
  return {
    ...base,
    isFeatured: true,
    publicationStatus: CmsPublicationStatus.PUBLISHED,
    ogTitle: base.ogTitle ?? `${base.name} Digital Growth Solutions | Growth Technos`,
    ogDescription: base.ogDescription ?? base.shortDescription.slice(0, 300),
    twitterTitle: `${base.name} Solutions | Growth Technos`,
    twitterDescription: base.shortDescription.slice(0, 300),
    faqSchema: true,
    trustedBy: {
      stats: base.trustedByStats ?? [
        { label: 'Years Experience', value: '8+', description: 'Building industry platforms' },
        { label: 'Projects Delivered', value: '120+', description: 'Across growth markets' },
        { label: 'Client Success', value: '94%', description: 'Renewal and referral rate' },
        { label: 'Support', value: '24/7', description: 'Priority response for live sites' },
      ],
      logoNote: `Trusted by growing ${nameLower} brands across India.`,
    },
    process: [
      {
        title: 'Discovery',
        description: `Audit your current ${nameLower} funnel, tech stack, and growth bottlenecks.`,
        order: 1,
      },
      {
        title: 'Strategy',
        description: 'Define positioning, conversion paths, and a 90-day execution roadmap.',
        order: 2,
      },
      {
        title: 'Build',
        description: 'Launch high-converting website, booking, and marketing systems.',
        order: 3,
      },
      {
        title: 'Growth',
        description: 'Optimize campaigns, content, and retention loops with measurable KPIs.',
        order: 4,
      },
    ],
    whyUs: [
      {
        title: 'Industry-first strategy',
        description: `We design for how ${nameLower} customers actually buy — not generic agency playbooks.`,
        icon: 'Target',
      },
      {
        title: 'Full-funnel execution',
        description: 'Website, SEO, ads, CRM, and automation under one accountable team.',
        icon: 'Layers',
      },
      {
        title: 'Proof-driven delivery',
        description: 'Clear milestones, dashboards, and outcome metrics from week one.',
        icon: 'LineChart',
      },
    ],
    technology: base.technology ?? [
      { name: 'Next.js', level: 95 },
      { name: 'SEO & Analytics', level: 92 },
      { name: 'CRM & Automation', level: 88 },
      { name: 'Paid Media', level: 90 },
    ],
    pricing: {
      starting: 'Custom quote',
      timeline: '4–12 weeks depending on scope',
      included: [
        'Industry strategy workshop',
        'Conversion-focused website',
        'Lead / booking system',
        'SEO foundation',
        'Monthly growth roadmap',
      ],
      note: 'Pricing depends on location count, integrations, and campaign scope.',
    },
    auditCta: {
      title: `Free ${base.name} Growth Audit`,
      description: `Get a prioritized roadmap for traffic, bookings, and revenue opportunities in your ${nameLower} business.`,
      buttonLabel: 'Request Free Audit',
      buttonUrl: '/contact?intent=industry-audit',
    },
    finalCta: {
      title: 'Book a Strategy Call',
      description: `Talk with a Growth Technos strategist about your ${nameLower} growth goals.`,
      buttonLabel: 'Book Strategy Call',
      buttonUrl: '/contact?intent=strategy-call',
    },
  };
}

export const CMS_INDUSTRIES: IndustrySeed[] = [
  buildIndustrySeed({
    slug: 'healthcare',
    name: 'Healthcare',
    description:
      'Digital growth systems for clinics, hospitals, diagnostics centers, and wellness brands that need more patients and stronger trust online.',
    shortDescription:
      'Attract more patients, fill appointment calendars, and build trusted healthcare brands online.',
    fullDescription:
      'Growth Technos builds healthcare websites, patient acquisition funnels, and reputation systems that turn search and referrals into booked appointments. From multi-location clinics to specialty practices, we combine medical SEO, conversion UX, and CRM workflows that respect compliance and patient trust.',
    icon: 'HeartPulse',
    displayOrder: 1,
    metaTitle: 'Healthcare Digital Marketing & Patient Growth | Growth Technos',
    ogTitle: 'Healthcare Growth Systems | Growth Technos',
    ogDescription:
      'Patient acquisition websites, medical SEO, and appointment systems for clinics, hospitals, and wellness brands.',
    metaKeywords: [
      'healthcare digital marketing',
      'clinic website design',
      'patient acquisition',
      'medical SEO',
      'hospital branding',
      'healthcare website agency',
    ],
    hero: {
      eyebrow: 'Healthcare',
      title: 'Grow Patient Demand With a Trusted Digital Care Brand',
      subtitle:
        'Websites, SEO, and conversion systems built for clinics, hospitals, and wellness providers.',
      trustStatement: 'Trusted by healthcare operators who need measurable appointment growth.',
      primaryCta: { label: 'Get Free Healthcare Audit', url: '/contact?intent=industry-audit' },
      secondaryCta: { label: 'View Healthcare Work', url: '/work' },
      badges: ['HIPAA-aware workflows', 'Multi-location ready', 'Appointment-focused UX'],
      stats: [
        { label: 'Avg. inquiry lift', value: '2.4x', description: 'Within first 90 days' },
        { label: 'Appointment intent', value: '+61%', description: 'From organic + paid' },
        { label: 'Page speed', value: '95+', description: 'Core Web Vitals focus' },
      ],
    },
    problems: [
      {
        title: 'Low online visibility',
        description: 'Patients search for care nearby, but your clinic rarely appears in local results.',
        icon: 'Search',
      },
      {
        title: 'Weak appointment conversion',
        description: 'Traffic arrives, but booking forms, CTAs, and trust signals fail to convert.',
        icon: 'CalendarX',
      },
      {
        title: 'Fragmented patient journey',
        description: 'Website, ads, WhatsApp, and reception are disconnected — leads get lost.',
        icon: 'GitBranch',
      },
      {
        title: 'Thin differentiation',
        description: 'Your site looks like every other clinic, so specialists and services do not stand out.',
        icon: 'Copy',
      },
    ],
    solutions: [
      {
        problemTitle: 'Low online visibility',
        title: 'Medical SEO & local authority',
        description:
          'Build location + specialty pages, Google Business optimization, and content that ranks for patient intent.',
        result: 'More qualified searches turning into clinic visits.',
        icon: 'SearchCheck',
      },
      {
        problemTitle: 'Weak appointment conversion',
        title: 'Conversion-first clinic websites',
        description:
          'Design clear service pathways, doctor credibility blocks, and frictionless booking CTAs.',
        result: 'Higher inquiry-to-appointment rates.',
        icon: 'MousePointerClick',
      },
      {
        problemTitle: 'Fragmented patient journey',
        title: 'CRM & follow-up automation',
        description:
          'Connect ads, forms, and reception with reminders, routing, and response SLAs.',
        result: 'Fewer missed leads and faster patient response.',
        icon: 'Workflow',
      },
      {
        problemTitle: 'Thin differentiation',
        title: 'Specialty brand positioning',
        description:
          'Highlight outcomes, doctors, departments, and proof so patients choose you with confidence.',
        result: 'Stronger brand preference in competitive local markets.',
        icon: 'Award',
      },
    ],
    benefits: [
      {
        title: 'More patients',
        description: 'Capture high-intent search and referral traffic with specialty landing pages.',
        icon: 'Users',
      },
      {
        title: 'Filled calendars',
        description: 'Reduce no-shows and speed booking with clear CTAs and reminders.',
        icon: 'CalendarCheck',
      },
      {
        title: 'Stronger trust',
        description: 'Showcase doctors, reviews, accreditations, and treatment journeys.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Measurable ROI',
        description: 'Track cost per inquiry, booked appointments, and channel performance.',
        icon: 'BarChart3',
      },
    ],
    businessResults: [
      { label: 'Qualified inquiries', value: '+140%', description: 'Typical 6-month improvement' },
      { label: 'Booking conversion', value: '+35%', description: 'After UX + CTA redesign' },
      { label: 'Organic visibility', value: '3x', description: 'Core specialty keywords' },
      { label: 'Lead response time', value: '<5 min', description: 'With automation routing' },
    ],
    faqs: [
      {
        question: 'Do you work with multi-location clinics and hospitals?',
        answer:
          'Yes. We structure location and department pages, shared brand systems, and local SEO for each branch.',
      },
      {
        question: 'Can you integrate appointment booking or EMR portals?',
        answer:
          'We integrate common booking tools, WhatsApp flows, and CRM systems. EMR deep links can be planned based on your stack.',
      },
      {
        question: 'How do you handle healthcare compliance and trust?',
        answer:
          'We avoid unverified medical claims, prioritize transparency, and design patient journeys that support informed decisions.',
      },
      {
        question: 'How fast can a healthcare growth system launch?',
        answer:
          'Most clinic websites and acquisition foundations launch in 4–8 weeks, depending on content readiness and integrations.',
      },
    ],
    resources: [
      {
        title: 'Clinic Website Conversion Checklist',
        description: 'A practical checklist to improve appointment bookings from your website.',
        href: '/contact?resource=clinic-conversion-checklist',
        type: 'guide',
      },
      {
        title: 'Healthcare SEO Starter Map',
        description: 'Keyword and page structure recommendations for specialty practices.',
        href: '/contact?resource=healthcare-seo-map',
        type: 'guide',
      },
    ],
    testimonials: [
      {
        author: 'Dr. Mehta',
        position: 'Clinic Director',
        company: 'Family Care Clinic',
        text: 'Our specialty pages finally rank, and the front desk receives clearer, higher-intent inquiries every week.',
      },
    ],
    technology: [
      { name: 'Next.js', level: 95 },
      { name: 'Local SEO', level: 94 },
      { name: 'Google Ads', level: 90 },
      { name: 'CRM Automation', level: 88 },
    ],
  }),
  buildIndustrySeed({
    slug: 'restaurants',
    name: 'Restaurants',
    description:
      'Digital systems for restaurants, cafes, cloud kitchens, and food brands that need more orders, bookings, and repeat guests.',
    shortDescription:
      'Fill tables, grow delivery orders, and turn first-time diners into loyal regulars.',
    fullDescription:
      'From signature restaurants to multi-outlet kitchens, Growth Technos builds menu-led websites, local discovery systems, and retention campaigns that increase reservations, delivery volume, and brand loyalty. We help F&B operators own their demand — not rent it from marketplaces.',
    icon: 'UtensilsCrossed',
    displayOrder: 2,
    metaTitle: 'Restaurant Digital Marketing & Website Growth | Growth Technos',
    ogTitle: 'Restaurant Growth Systems | Growth Technos',
    ogDescription:
      'Menu experiences, local discovery, and loyalty engines built for restaurants and food brands.',
    metaKeywords: [
      'restaurant digital marketing',
      'restaurant website design',
      'food branding',
      'reservation growth',
      'cloud kitchen marketing',
      'restaurant SEO',
      'direct ordering website',
    ],
    hero: {
      eyebrow: 'Restaurants & Food Brands',
      title: 'Turn Hungry Searchers Into Booked Tables and Repeat Orders',
      subtitle:
        'Menu experiences, local SEO, and retention systems for restaurants, cafes, and cloud kitchens.',
      trustStatement: 'Built for operators who care about covers, AOV, and guest loyalty.',
      primaryCta: { label: 'Get Free Restaurant Audit', url: '/contact?intent=industry-audit' },
      secondaryCta: { label: 'See Food Brand Work', url: '/work' },
      badges: ['Reservation-ready', 'Delivery optimized', 'Multi-outlet capable', 'Loyalty-ready'],
      stats: [
        { label: 'Reservation lift', value: '+48%', description: 'After conversion redesign' },
        { label: 'Direct orders', value: '+32%', description: 'Away from marketplace fees' },
        { label: 'Repeat guests', value: '+27%', description: 'With retention campaigns' },
      ],
    },
    problems: [
      {
        title: 'Marketplace dependency',
        description: 'Most orders come from aggregators, eroding margins and brand control.',
        icon: 'Percent',
      },
      {
        title: 'Invisible locally',
        description: 'Diners nearby never discover your restaurant in Google or Maps.',
        icon: 'MapPinOff',
      },
      {
        title: 'Weak online menu experience',
        description: 'Photos, pricing, and CTAs do not inspire bookings or direct orders.',
        icon: 'ImageOff',
      },
      {
        title: 'No retention engine',
        description: 'Guests visit once and disappear without offers, reminders, or loyalty loops.',
        icon: 'UserMinus',
      },
    ],
    solutions: [
      {
        problemTitle: 'Marketplace dependency',
        title: 'Direct ordering & brand channels',
        description:
          'Launch a conversion-focused site with menu CTAs, WhatsApp ordering, and owned-channel campaigns.',
        result: 'Higher-margin direct demand.',
        icon: 'Store',
      },
      {
        problemTitle: 'Invisible locally',
        title: 'Local discovery system',
        description:
          'Optimize Maps, reviews, location pages, and geo campaigns for nearby diners.',
        result: 'More footfall from surrounding neighborhoods.',
        icon: 'MapPinned',
      },
      {
        problemTitle: 'Weak online menu experience',
        title: 'Appetite-led digital experience',
        description:
          'Design menus, stories, and booking flows that sell signature dishes and occasions.',
        result: 'Higher reservation and order conversion.',
        icon: 'Utensils',
      },
      {
        problemTitle: 'No retention engine',
        title: 'CRM & loyalty campaigns',
        description:
          'Build remarketing, offer calendars, and guest lifecycle messaging.',
        result: 'More repeat visits and higher lifetime value.',
        icon: 'HeartHandshake',
      },
    ],
    benefits: [
      {
        title: 'More covers',
        description: 'Drive reservations from search, social, and local discovery.',
        icon: 'UsersRound',
      },
      {
        title: 'Better margins',
        description: 'Shift volume to direct channels and owned customer relationships.',
        icon: 'Wallet',
      },
      {
        title: 'Brand appetite',
        description: 'Make your cuisine and atmosphere unmistakable online.',
        icon: 'Sparkles',
      },
      {
        title: 'Repeat revenue',
        description: 'Keep guests coming back with timed offers and loyalty journeys.',
        icon: 'RefreshCw',
      },
    ],
    businessResults: [
      { label: 'Direct orders', value: '+45%', description: 'Within first quarter' },
      { label: 'Table bookings', value: '+38%', description: 'From website + Maps' },
      { label: 'Review velocity', value: '2x', description: 'With reputation workflows' },
      { label: 'Campaign ROAS', value: '3.1x', description: 'On retained guest offers' },
    ],
    faqs: [
      {
        question: 'Do you support cloud kitchens and multi-outlet brands?',
        answer:
          'Yes. We create outlet-level pages, geo targeting, and shared brand systems for kitchens and restaurant groups.',
      },
      {
        question: 'Can you integrate reservations and delivery partners?',
        answer:
          'We can connect popular reservation tools, WhatsApp ordering, and selected delivery or POS workflows.',
      },
      {
        question: 'Will this reduce aggregator fees?',
        answer:
          'The goal is to grow owned demand. Many clients reduce dependency over time while keeping marketplaces as a supporting channel.',
      },
      {
        question: 'How quickly can we launch a restaurant growth system?',
        answer:
          'A restaurant growth foundation typically launches in 3–6 weeks depending on menu assets and outlet count.',
      },
      {
        question: 'Do you help with Google reviews and Maps ranking?',
        answer:
          'Yes. Local SEO, review velocity workflows, and Maps optimization are core to restaurant discovery systems.',
      },
    ],
    resources: [
      {
        title: 'Restaurant Conversion Playbook',
        description: 'How to turn menu views into reservations and direct orders.',
        href: '/contact?resource=restaurant-conversion-playbook',
        type: 'guide',
      },
      {
        title: 'Local Food SEO Checklist',
        description: 'Maps, reviews, and location page essentials for restaurants.',
        href: '/contact?resource=restaurant-local-seo',
        type: 'checklist',
      },
      {
        title: 'Direct Ordering Margin Brief',
        description: 'A practical look at shifting volume away from marketplace fees.',
        href: '/contact?resource=restaurant-direct-ordering',
        type: 'brief',
      },
    ],
    testimonials: [
      {
        author: 'Ananya Rao',
        position: 'Owner',
        company: 'Urban Spice Kitchen',
        text: 'Direct reservations finally outpaced aggregator noise, and our weekend covers became predictable.',
      },
      {
        author: 'Rohan Mehta',
        position: 'Founder',
        company: 'Ember & Oak',
        text: 'The menu site finally feels like our dining room — guests book faster and come back for weekday offers.',
      },
    ],
    technology: [
      { name: 'Next.js', level: 93 },
      { name: 'Local SEO', level: 92 },
      { name: 'Meta Ads', level: 90 },
      { name: 'WhatsApp Automation', level: 87 },
      { name: 'Reservation Integrations', level: 86 },
    ],
  }),
  buildIndustrySeed({
    slug: 'salons',
    name: 'Salons',
    description:
      'Growth systems for salons, spas, beauty studios, and personal care brands that need booked chairs and stronger brand loyalty.',
    shortDescription:
      'Fill appointment books, elevate your beauty brand, and turn walk-ins into loyal clients.',
    fullDescription:
      'From boutique salons to multi-stylist spas, Growth Technos builds booking-first websites, local discovery systems, and retention journeys that fill chairs, lift average ticket, and turn first visits into memberships. We help beauty brands look as premium online as they feel in the chair — and convert that trust into confirmed appointments.',
    icon: 'Scissors',
    displayOrder: 3,
    metaTitle: 'Salon Digital Marketing & Booking Growth | Growth Technos',
    ogTitle: 'Salon Growth Systems | Growth Technos',
    ogDescription:
      'Booking journeys, brand presentation, and membership engines built for salons, spas, and studios.',
    metaKeywords: [
      'salon digital marketing',
      'salon website design',
      'beauty brand growth',
      'spa booking system',
      'salon SEO',
      'stylist booking website',
      'salon membership marketing',
    ],
    hero: {
      eyebrow: 'Salons, Spas & Beauty Studios',
      title: 'Keep Every Chair Booked With a Premium Beauty Brand Online',
      subtitle:
        'Booking journeys, local SEO, and brand systems for salons, spas, and studios.',
      trustStatement: 'Designed for beauty businesses that sell experience, not just appointments.',
      primaryCta: { label: 'Get Free Salon Audit', url: '/contact?intent=industry-audit' },
      secondaryCta: { label: 'Explore Beauty Projects', url: '/work' },
      badges: ['Online booking ready', 'Stylist showcase', 'Membership friendly', 'Multi-location ready'],
      stats: [
        { label: 'Booked appointments', value: '+52%', description: 'After funnel rebuild' },
        { label: 'No-show reduction', value: '-29%', description: 'With reminders' },
        { label: 'Membership uptake', value: '+24%', description: 'Via retention offers' },
      ],
    },
    problems: [
      {
        title: 'Empty peak slots',
        description: 'Walk-ins are unpredictable and high-value chairs sit idle midweek.',
        icon: 'Clock',
      },
      {
        title: 'Weak brand perception',
        description: 'Your Instagram looks strong, but the website fails to convert premium clients.',
        icon: 'Sparkle',
      },
      {
        title: 'Booking friction',
        description: 'Clients struggle to choose services, stylists, and times without calling.',
        icon: 'PhoneOff',
      },
      {
        title: 'One-time clients',
        description: 'Guests come once for a treatment and never rebook or join a membership.',
        icon: 'UserX',
      },
    ],
    solutions: [
      {
        problemTitle: 'Empty peak slots',
        title: 'Demand filling campaigns',
        description:
          'Use local ads, offer calendars, and service packages to fill slow periods.',
        result: 'Higher chair utilization across the week.',
        icon: 'CalendarPlus',
      },
      {
        problemTitle: 'Weak brand perception',
        title: 'Premium beauty brand experience',
        description:
          'Present transformations, stylists, ambience, and packages with polished storytelling.',
        result: 'Attract higher-ticket clients who trust your craft.',
        icon: 'Gem',
      },
      {
        problemTitle: 'Booking friction',
        title: 'Frictionless booking system',
        description:
          'Guide clients from service discovery to stylist selection and confirmed appointment.',
        result: 'More self-serve bookings and fewer missed calls.',
        icon: 'CalendarClock',
      },
      {
        problemTitle: 'One-time clients',
        title: 'Retention & membership engine',
        description:
          'Automate rebooking reminders, packages, and loyalty offers after every visit.',
        result: 'Higher lifetime value and referral velocity.',
        icon: 'Repeat',
      },
    ],
    benefits: [
      {
        title: 'Booked chairs',
        description: 'Convert local demand into confirmed appointments every week.',
        icon: 'Armchair',
      },
      {
        title: 'Premium positioning',
        description: 'Look as elevated online as your salon feels in person.',
        icon: 'Crown',
      },
      {
        title: 'Loyal clients',
        description: 'Build rebooking and membership habits that stabilize revenue.',
        icon: 'Heart',
      },
      {
        title: 'Team visibility',
        description: 'Showcase stylists and specialists so clients book the right expert.',
        icon: 'UserStar',
      },
    ],
    businessResults: [
      { label: 'Online bookings', value: '+67%', description: 'After booking UX launch' },
      { label: 'Average ticket', value: '+18%', description: 'Via package merchandising' },
      { label: 'Rebooking rate', value: '+41%', description: 'With reminder journeys' },
      { label: 'Local calls saved', value: '30%', description: 'Self-serve scheduling' },
    ],
    faqs: [
      {
        question: 'Can you integrate our existing booking software?',
        answer:
          'Yes. We commonly connect salon booking tools, WhatsApp confirmation flows, and calendar sync options.',
      },
      {
        question: 'Do you help with Instagram and Google together?',
        answer:
          'We align social creative, local SEO, and website conversion so every channel feeds the booking funnel.',
      },
      {
        question: 'Is this useful for spas and multi-stylist studios?',
        answer:
          'Absolutely. Service menus, therapist/stylist pages, and package systems scale across beauty verticals.',
      },
      {
        question: 'How quickly can we launch a salon growth system?',
        answer:
          'A salon growth foundation typically launches in 3–5 weeks depending on service menu complexity and booking integrations.',
      },
      {
        question: 'What does an audit include?',
        answer:
          'A free salon audit reviews booking friction, local visibility, brand presentation, and retention gaps with prioritized next steps.',
      },
    ],
    resources: [
      {
        title: 'Salon Booking Funnel Checklist',
        description: 'Fix the leaks between discovery, service selection, and confirmed bookings.',
        href: '/contact?resource=salon-booking-checklist',
        type: 'checklist',
      },
      {
        title: 'Beauty Brand Story Framework',
        description: 'Position your salon for premium clients without sounding generic.',
        href: '/contact?resource=salon-brand-framework',
        type: 'guide',
      },
      {
        title: 'Membership Revenue Brief',
        description: 'How packages and rebooking journeys stabilize monthly salon revenue.',
        href: '/contact?resource=salon-membership-brief',
        type: 'brief',
      },
    ],
    testimonials: [
      {
        author: 'Priya Kapoor',
        position: 'Founder',
        company: 'Luxe Strand Studio',
        text: 'Our stylists stay booked, and clients finally rebook online instead of waiting for us to chase them.',
      },
      {
        author: 'Meera Shah',
        position: 'Owner',
        company: 'Atelier Bloom Spa',
        text: 'The brand site finally matches our in-salon experience — memberships climbed and midweek slots filled.',
      },
    ],
    technology: [
      { name: 'Next.js', level: 94 },
      { name: 'Booking Integrations', level: 91 },
      { name: 'Local SEO', level: 90 },
      { name: 'Retention Automation', level: 89 },
      { name: 'Meta Ads', level: 86 },
    ],
  }),
];

/** Service category/specialty slugs to attach per industry during seed. */
export const INDUSTRY_SERVICE_LINKS: Record<string, string[]> = {
  healthcare: [
    'web-development',
    'digital-marketing',
    'digital-marketing--seo',
    'software-saas-development',
    'software-saas-development--custom-software-solutions',
    'software-saas-development--saas-platforms',
    'mobile-app-development',
    'healthcare-patient-booking',
    'healthcare-crm-automation',
    'healthcare-ai-chatbot',
  ],
  restaurants: [
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
  salons: [
    'web-development',
    'design-branding',
    'digital-marketing',
    'digital-marketing--seo',
    'digital-marketing--social-media-marketing',
    'ecommerce-solutions',
    'software-saas-development',
    'salons-appointment-system',
    'salons-instagram-marketing',
    'salons-crm',
    'salons-whatsapp-automation',
  ],
};

/** Portfolio showcase/case-study slugs to attach per industry during seed. */
export const INDUSTRY_PORTFOLIO_LINKS: Record<string, string[]> = {
  healthcare: ['family-doctor', 'physical-therapy', 'mindease-mental-wellness-platform'],
  restaurants: ['private-chef', 'alveera-hospitality-travel-platform'],
  salons: ['painting-services', 'interior-design'],
};

export const FEATURED_PROJECT_SLUGS = [
  'oldways-dairy-management-system',
  'keshav-singh-shourya-digital-growth-portfolio',
  'hrclicks-modern-hr-management-suite',
  'dreamline-wedding-destination-decor',
  'sellgolive-live-commerce-platform',
  'maulijee-dnyanyog-pratishthan-english-language',
] as const;

export const HOMEPAGE_SERVICE_CATEGORY_SLUGS = [
  'design-branding',
  'digital-marketing',
  'ecommerce-solutions',
  'it-support-consulting',
  'mobile-app-development',
  'software-saas-development',
] as const;

export const PORTFOLIO_SHOWCASE_ITEMS = [
  {
    slug: 'interior-design',
    title: 'Interior Design',
    shortDescription: 'A modern portfolio for an interior design firm.',
    image: '/portfolio%20projects/Interior%20Design.png',
    websiteUrl: 'https://interior-design-growthtechnos.pages.dev',
  },
  {
    slug: 'architecture-studio',
    title: 'Architecture Studio',
    shortDescription: 'Website for a professional architecture company.',
    image: '/portfolio%20projects/Architecture%20Studio.png',
    websiteUrl: 'https://architecture-growthtechnos.pages.dev',
  },
  {
    slug: 'welding-services',
    title: 'Welding Services',
    shortDescription: 'A business site for professional welding services.',
    image: '/portfolio%20projects/Welding%20Services.png',
    websiteUrl: 'https://welding-growthtechnos.pages.dev',
  },
  {
    slug: 'private-chef',
    title: 'Private Chef',
    shortDescription: 'A landing page for a personal chef service.',
    image: '/portfolio%20projects/Private%20Chef.png',
    websiteUrl: 'https://chef-growthtechnos.pages.dev',
  },
  {
    slug: 'construction-company',
    title: 'Construction Company',
    shortDescription: 'A showcase site for a construction business.',
    image: '/portfolio%20projects/Construction%20Company.png',
    websiteUrl: 'https://construction-growthtechnos.pages.dev',
  },
  {
    slug: 'family-doctor',
    title: 'Family Doctor',
    shortDescription: 'Professional profile site for a family doctor clinic.',
    image: '/portfolio%20projects/Family%20Doctor.png',
    websiteUrl: 'https://family-doctor-growthtechnos.pages.dev',
  },
  {
    slug: 'painting-services',
    title: 'Painting Services',
    shortDescription: 'Service website for a painting contractor.',
    image: '/portfolio%20projects/Painting%20Services.png',
    websiteUrl: 'https://painting-growthtechnos.pages.dev',
  },
  {
    slug: 'physical-therapy',
    title: 'Physical Therapy',
    shortDescription: 'A website for a physical therapy clinic.',
    image: '/portfolio%20projects/Physical%20Therapy.png',
    websiteUrl: 'https://physical-theripy-growthtechnos.pages.dev',
  },
] as const;
