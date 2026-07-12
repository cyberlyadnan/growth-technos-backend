import { CmsPublicationStatus } from '@core/constants/cms';
import { IndustryPageSeed, IndustryStubService } from './industry-pages.types';

export const healthcareIndustryPage: IndustryPageSeed = {
  slug: 'healthcare',
  name: 'Healthcare',
  icon: 'HeartPulse',
  displayOrder: 1,
  isFeatured: true,
  publicationStatus: CmsPublicationStatus.PUBLISHED,
  focusKeyword: 'healthcare digital marketing',

  // ─── SEO ───────────────────────────────────────────────────────────────────
  metaTitle: 'Healthcare Digital Marketing & Web Solutions | Growth Technos',
  metaDescription:
    'Growth Technos helps clinics, hospitals & health-tech startups grow through SEO, patient-acquisition funnels, custom healthcare software, and mobile apps.',
  metaKeywords: [
    'healthcare digital marketing',
    'medical SEO',
    'hospital website development',
    'patient acquisition',
    'healthcare software development',
    'clinic website design',
    'health tech startup marketing',
    'telemedicine app development',
    'healthcare CRM',
    'medical practice growth',
  ],
  ogTitle: 'Healthcare Digital Marketing & Technology Solutions | Growth Technos',
  ogDescription:
    'From patient-acquisition SEO to custom healthcare software, Growth Technos delivers measurable growth for clinics, multi-specialty hospitals, and health-tech platforms.',
  ogImage: '/uploads/industries/healthcare/og.webp',
  twitterTitle: 'Healthcare Growth Solutions | Growth Technos',
  twitterDescription:
    'SEO, funnels, custom software & mobile apps purpose-built for Indian healthcare providers. Book a free audit.',
  twitterImage: '/uploads/industries/healthcare/og.webp',
  faqSchema: true,

  // ─── HERO ──────────────────────────────────────────────────────────────────
  hero: {
    eyebrow: 'Healthcare Digital Marketing & Technology',
    title: 'Grow Your Healthcare Practice with Technology & Intelligent Marketing',
    subtitle:
      'We partner with clinics, hospitals, and health-tech startups to attract more patients, streamline operations, and build the digital infrastructure that scales care delivery without scaling overhead.',
    trustStatement:
      'Trusted by 30+ healthcare organisations across India — from single-specialty clinics to multi-city hospital groups.',
    primaryCta: { label: 'Free Healthcare Growth Audit', url: '/contact?intent=industry-audit' },
    secondaryCta: { label: 'View Healthcare Work', url: '/work' },
    image: { url: '/uploads/industries/healthcare/hero.webp', alt: 'Healthcare digital marketing and software solutions by Growth Technos' },
    badges: [
      'HIPAA-Aware Development',
      'Google-Certified Partners',
      'NMC-Compliant Ad Strategies',
      'ISO 27001-Aligned Security',
    ],
    stats: [
      { label: 'Patient Leads Generated', value: '1,20,000+', description: 'Qualified patient inquiries across all client accounts' },
      { label: 'Average Appointment Growth', value: '+68%', description: 'Within the first 6 months of engagement' },
      { label: 'Healthcare Clients Served', value: '30+', description: 'Clinics, hospitals, and health-tech brands' },
    ],
  },

  // ─── BANNER ────────────────────────────────────────────────────────────────
  bannerImage: {
    url: '/uploads/industries/healthcare/banner.webp',
    alt: 'Growth Technos healthcare digital solutions — clinics, hospitals, health-tech',
  },

  // ─── GALLERY ───────────────────────────────────────────────────────────────
  gallery: [
    { url: '/uploads/industries/healthcare/gallery-1.webp', alt: 'Family doctor clinic website and SEO results', caption: 'Family Doctor Clinic — 3× appointment growth in 4 months', order: 1 },
    { url: '/uploads/industries/healthcare/gallery-2.webp', alt: 'Physical therapy center patient booking platform', caption: 'PhysioFirst — Custom booking platform cutting no-shows by 42%', order: 2 },
    { url: '/uploads/industries/healthcare/gallery-3.webp', alt: 'MindEase mental wellness mobile app UI', caption: 'MindEase — Mental wellness SaaS platform with 10k+ active users', order: 3 },
  ],

  // ─── TRUSTED BY ────────────────────────────────────────────────────────────
  trustedBy: {
    logoNote: 'Partnered with clinics, multi-specialty hospitals, diagnostic chains, and health-tech startups across Delhi NCR, Mumbai, Bangalore, and beyond.',
    stats: [
      { label: 'Years in Healthcare Tech', value: '7+', description: 'Deep domain expertise across patient care, diagnostics, and health-tech' },
      { label: 'Healthcare Projects Delivered', value: '80+', description: 'Websites, apps, funnels, CRM integrations, and SEO campaigns' },
      { label: 'Healthcare Clients', value: '30+', description: 'From solo practitioners to 200-bed hospital groups' },
      { label: 'Client Support', value: '24/5', description: 'Dedicated account manager with SLA-backed response times' },
    ],
  },

  // ─── DESCRIPTIONS ─────────────────────────────────────────────────────────
  shortDescription:
    'Growth Technos helps healthcare providers and health-tech startups grow through patient-acquisition SEO, conversion-optimised websites, custom practice management software, and mobile health applications — all built with compliance and data security at the core.',

  description:
    'Healthcare is one of the most competitive and compliance-sensitive sectors in India. Patients search online before they ever call a clinic. Hospitals compete for the same high-intent keywords. Health-tech startups race to acquire users before their runway ends. Growth Technos bridges the gap between clinical excellence and digital growth. We design, build, and market digital ecosystems tailored to the healthcare vertical — patient-friendly websites, high-converting appointment funnels, medical SEO that ranks on Google and Bing, CRM systems that reduce front-desk load, mobile apps that keep patients engaged, and data dashboards that give practice owners clarity.\n\nOur work spans the full spectrum: single-specialty clinics looking to fill their calendar, multi-specialty hospitals seeking to dominate local search, diagnostic centres that need seamless online booking, telemedicine platforms that need user acquisition at scale, and health-tech SaaS companies that need enterprise clients. Every solution is HIPAA-aware, NMC-advertisement-guideline-compliant, and built to convert. We don\'t just build digital assets — we build patient pipelines.',

  fullDescription:
    'The Indian healthcare industry is undergoing a fundamental digital transformation. Patients are no longer passive — they research conditions, compare providers, read reviews, and book appointments online before they ever walk through a door. This shift creates an enormous opportunity for healthcare providers who invest in intelligent digital infrastructure, and a growing risk for those who don\'t.\n\nGrowth Technos was founded in Noida, Delhi NCR, with healthcare as one of its core verticals from day one. Over seven years, we have worked with family physicians, orthopaedic surgeons, dermatology chains, multi-specialty hospitals, IVF clinics, mental wellness startups, diagnostics brands, and telemedicine platforms. That breadth has taught us that healthcare digital growth is not a single problem — it is an interconnected system of patient discovery, trust-building, frictionless booking, retention, and referral. Our job is to design and operate that system for you.\n\nOn the marketing side, we build high-intent search visibility through medical SEO: local pack optimisation, condition-specific landing pages, schema markup (MedicalOrganization, Physician, FAQPage), and Google Business Profile management. We run compliant paid media campaigns on Google Search and Meta that stay within NMC advertising guidelines while still driving measurable appointment volume. Our conversion rate optimisation work ensures that every visitor who lands on your site is guided clearly toward booking — not distracted, not confused, and not bounced.\n\nOn the technology side, we design and develop HIPAA-aware websites and web applications, custom patient booking platforms, healthcare CRM systems, AI-powered appointment scheduling chatbots, electronic health record integrations, and mobile health applications for both iOS and Android. Our engineering team understands HL7, FHIR, and the nuances of healthcare data handling. Our UI/UX designers understand that a patient in pain or anxiety needs clarity and calm — not clever design. The result is software that patients use and staff rely on.\n\nOur process begins with a deep discovery phase where we audit your current digital footprint — SEO health, website conversion rates, ad account performance, patient journey mapping, and competitor benchmarking. From that foundation, we build a 90-day growth roadmap and execute it alongside your team. We operate on transparent monthly reporting, dedicated account management, and clear KPIs: appointments booked, cost per acquisition, organic traffic growth, and patient lifetime value.\n\nWhether you are a solo practitioner ready to build your first professional website, a 50-doctor hospital group looking to unify your online presence across five cities, or a health-tech startup preparing for Series A growth, Growth Technos has the domain expertise, the technical depth, and the marketing rigour to deliver results you can take to your board — or your front-desk team.',

  // ─── PROBLEMS ─────────────────────────────────────────────────────────────
  problems: [
    {
      title: 'Invisible on Google When Patients Search',
      description:
        'Most clinics and hospitals rank below page two for their core specialties and local area keywords. When a patient searches "orthopaedic surgeon in Noida" or "best gynaecologist near me," practices without a structured medical SEO strategy simply do not appear. This invisibility directly translates to lost appointments — patients who find a competitor first rarely come back to search again.',
      icon: 'SearchX',
    },
    {
      title: 'Websites That Look Professional but Convert Poorly',
      description:
        'Many healthcare websites are visually polished but lack the structural elements that turn visitors into booked appointments: clear calls-to-action, trust signals (credentials, affiliations, reviews), fast mobile load times, and frictionless booking flows. A website that receives 5,000 monthly visitors but converts at 0.5% is losing 95% of its potential patient pipeline every single month.',
      icon: 'MousePointerBan',
    },
    {
      title: 'No Streamlined Online Appointment Booking',
      description:
        'Patients in 2026 expect to book appointments the same way they book restaurants or flights — instantly, online, without calling a front desk. Clinics relying on phone-only bookings lose patients to competitors who offer real-time slot selection, automated reminders, and digital pre-consultation forms. High call volumes also consume staff time that should be spent on in-clinic care.',
      icon: 'CalendarOff',
    },
    {
      title: 'High Patient No-Show and Drop-Off Rates',
      description:
        'Industry data suggests healthcare no-show rates in India range from 20–40%. Each missed appointment represents direct revenue loss and wasted clinical capacity. Without automated SMS/WhatsApp reminders, pre-visit communication sequences, and easy rescheduling options, practices bleed revenue to no-shows that are entirely preventable with the right technology stack.',
      icon: 'UserX',
    },
    {
      title: 'Scattered, Unmanaged Online Reputation',
      description:
        'Patients read reviews before choosing a provider — Google, Practo, Justdial, and social media all contribute to first impressions. Healthcare providers without a systematic approach to collecting reviews, responding to feedback, and managing their ratings online are ceding trust to competitors. Even one unaddressed negative review can suppress patient inquiries for months.',
      icon: 'StarOff',
    },
    {
      title: 'Fragmented Patient Data Across Disconnected Systems',
      description:
        'Patient records in one system, billing in another, WhatsApp messages in a third, and appointment history in a spreadsheet — this fragmentation makes follow-up care, re-engagement campaigns, and data-driven decision-making nearly impossible. It also creates compliance risk. The operational cost of stitching these silos together manually is enormous and scales badly as the practice grows.',
      icon: 'DatabaseZap',
    },
    {
      title: 'Paid Advertising that Burns Budget Without Results',
      description:
        'Healthcare is one of the most expensive verticals on Google Ads. Many clinics run campaigns without the medical-intent keyword strategy, negative keyword lists, and landing page optimisation required to compete profitably. The result is high cost-per-click, low-quality leads, and a belief that "digital ads don\'t work for healthcare" — when the real problem is campaign architecture, not the channel.',
      icon: 'BadgeDollarSign',
    },
    {
      title: 'No Mobile App or Telemedicine Capability',
      description:
        'Post-pandemic, patients expect telehealth options and mobile access to their health records, reports, and doctor communication. Practices without a mobile presence lose patients to aggregator platforms like Practo and Apollo 247 who monetise that access. Building your own mobile touchpoint keeps the patient relationship direct, reduces platform dependency, and enables higher retention and lifetime value.',
      icon: 'Smartphone',
    },
    {
      title: 'Inability to Measure Marketing ROI Clearly',
      description:
        'Most healthcare practices cannot answer basic questions: Which channel brought in the most appointments last month? What is our cost per new patient acquisition? Which landing page converts best? Without proper analytics infrastructure — call tracking, form attribution, CRM integration, and monthly reporting dashboards — marketing spend is a faith-based exercise rather than a measurable investment.',
      icon: 'BarChart3',
    },
    {
      title: 'Compliance Complexity Blocking Digital Expansion',
      description:
        'Healthcare digital marketing operates under strict constraints: NMC advertising guidelines prohibit guaranteed cure claims, testimonial-based advertising has nuanced rules, and data handling must follow DPDP Act requirements. Many agencies not specialised in healthcare produce non-compliant content or campaigns that expose the practice to regulatory risk. The result is either paralysis or expensive re-work after the fact.',
      icon: 'ShieldAlert',
    },
  ],

  // ─── SOLUTIONS ────────────────────────────────────────────────────────────
  solutions: [
    {
      problemTitle: 'Invisible on Google When Patients Search',
      title: 'Medical SEO & Local Search Dominance',
      description:
        'We build a comprehensive medical SEO strategy: specialty-specific and location-based keyword research, technical site audits, on-page optimisation for condition and treatment pages, Google Business Profile management, and schema markup (MedicalOrganization, Physician, FAQPage). We also build citation consistency across Practo, Justdial, and local directories to strengthen your local pack ranking.',
      result: 'Clients typically see first-page rankings for primary specialty keywords within 90–120 days and a 50–150% increase in organic patient inquiries within six months.',
      icon: 'TrendingUp',
    },
    {
      problemTitle: 'Websites That Look Professional but Convert Poorly',
      title: 'Conversion-Optimised Healthcare Website Design',
      description:
        'We design and develop healthcare websites engineered for patient conversion — not just aesthetics. Every page includes clear next-step CTAs, credibility signals (degrees, affiliations, certifications, awards), mobile-first speed optimisation, WCAG-accessible design, and structured appointment pathways. We A/B test key elements and iterate based on heatmaps and session recording data.',
      result: 'Our healthcare website redesigns consistently achieve 2–4× improvement in appointment form conversion rates within the first 60 days of launch.',
      icon: 'LayoutDashboard',
    },
    {
      problemTitle: 'No Streamlined Online Appointment Booking',
      title: 'Custom Patient Booking & Scheduling Platform',
      description:
        'We build branded, custom appointment booking systems integrated with your existing workflows — real-time slot availability, doctor-specific scheduling, pre-consultation digital intake forms, WhatsApp/SMS confirmation and reminders, and admin dashboards for front-desk teams. Systems can integrate with popular HMS/EMR platforms or stand alone as a lightweight scheduling layer.',
      result: 'Healthcare clients using our booking platforms report a 35–50% reduction in front-desk call volume and a 40% decrease in no-show rates within three months.',
      icon: 'CalendarCheck',
    },
    {
      problemTitle: 'High Patient No-Show and Drop-Off Rates',
      title: 'Automated Patient Engagement & Reminder Workflows',
      description:
        'We implement multi-channel automated engagement sequences: appointment confirmation messages, 24-hour and 2-hour reminder flows, post-visit follow-up messages, prescription refill nudges, and annual health check-up re-engagement campaigns — delivered via WhatsApp Business API, SMS, and email. All flows are DPDP Act-compliant and easy for your team to manage.',
      result: 'Practices using our engagement automation see no-show rates drop to under 12% on average, recovering significant revenue that was previously lost.',
      icon: 'BellRing',
    },
    {
      problemTitle: 'Scattered, Unmanaged Online Reputation',
      title: 'Reputation Management & Review Generation System',
      description:
        'We build a systematic review generation workflow: post-visit satisfaction check-ins that guide happy patients to Google and Practo, a branded response framework for all reviews (positive and negative), and monthly reputation dashboards tracking your average rating trajectory. We also monitor social mentions and flag emerging issues before they escalate.',
      result: 'Clients typically improve their Google rating by 0.4–0.8 stars within four months and see a measurable uptick in patient inquiries correlated with improved ratings.',
      icon: 'Star',
    },
    {
      problemTitle: 'Fragmented Patient Data Across Disconnected Systems',
      title: 'Healthcare CRM Integration & Data Unification',
      description:
        'We design and implement healthcare-specific CRM systems that unify patient records, appointment history, billing data, communication logs, and marketing touchpoints into a single, DPDP-compliant platform. Custom dashboards give practice managers real-time visibility into patient lifetime value, churn risk, and re-engagement opportunities.',
      result: 'Practices with unified CRM data report a 25–40% improvement in patient retention through timely, relevant follow-up — and significantly reduced administrative overhead.',
      icon: 'Database',
    },
    {
      problemTitle: 'Paid Advertising that Burns Budget Without Results',
      title: 'Compliant Healthcare PPC & Performance Campaigns',
      description:
        'We build Google Search and Meta campaigns with medical-intent keyword strategies, competitor gap analysis, tightly themed ad groups, NMC-compliant ad copy, and dedicated post-click landing pages optimised for appointment conversions — not generic site traffic. All campaigns include call tracking, lead quality scoring, and monthly performance reviews with transparent ROI reporting.',
      result: 'Clients switching to our managed PPC programmes typically reduce their cost per appointment by 30–50% while maintaining or increasing total appointment volume.',
      icon: 'Target',
    },
    {
      problemTitle: 'No Mobile App or Telemedicine Capability',
      title: 'Healthcare Mobile App & Telemedicine Platform Development',
      description:
        'We design and develop cross-platform (iOS + Android) mobile applications for patient portals, telemedicine consultations, health record access, prescription management, and loyalty programmes. Our telemedicine implementations include secure video consultation, e-prescription generation, and payment gateway integration — built to scale from 50 to 50,000 monthly consultations.',
      result: 'Mobile-first healthcare clients see 30–60% of new patient acquisition happen through the app within 12 months of launch, reducing dependence on aggregator platforms.',
      icon: 'Smartphone',
    },
    {
      problemTitle: 'Inability to Measure Marketing ROI Clearly',
      title: 'Healthcare Analytics, Attribution & Reporting Infrastructure',
      description:
        'We implement end-to-end analytics infrastructure: GA4 with healthcare event tracking, call tracking with keyword attribution, CRM-to-ad-platform data loops, and custom monthly dashboards that answer the questions practice owners actually care about — cost per new patient, appointment volume by channel, and month-over-month growth across all digital touchpoints.',
      result: 'Clients with our analytics stack make faster, more confident budget decisions — and typically reallocate 20–30% of spend from underperforming channels to high-ROI ones within the first quarter.',
      icon: 'LineChart',
    },
    {
      problemTitle: 'Compliance Complexity Blocking Digital Expansion',
      title: 'NMC-Compliant Digital Strategy & Content Framework',
      description:
        'Our healthcare team is trained on NMC advertising guidelines, DPDP Act requirements, and platform-specific healthcare ad policies. We conduct compliance reviews of all ad copy, landing page content, and social media posts before publication, and maintain a compliance checklist that evolves with regulatory updates — giving you the confidence to expand your digital presence without legal exposure.',
      result: 'Zero compliance incidents across 30+ healthcare clients over seven years. Our compliance-first approach enables faster campaign launches and sustained platform access.',
      icon: 'ShieldCheck',
    },
  ],

  // ─── BENEFITS ─────────────────────────────────────────────────────────────
  benefits: [
    {
      title: 'More Qualified Patient Appointments',
      description: 'Our integrated SEO and paid media strategies attract patients who are actively searching for your specialties — not generic health browsers. Higher intent means higher conversion and better patient-practice fit.',
      icon: 'UserCheck',
    },
    {
      title: 'Lower Patient Acquisition Cost',
      description: 'By combining organic search authority with precision-targeted paid campaigns and conversion-optimised landing pages, we systematically reduce the cost to acquire each new patient — freeing budget for clinical investment.',
      icon: 'TrendingDown',
    },
    {
      title: 'Reduced Administrative Burden',
      description: 'Custom booking platforms, automated reminders, and CRM integrations eliminate repetitive front-desk tasks — reducing call volume, no-shows, and manual data entry so your staff can focus on in-clinic care.',
      icon: 'ClipboardCheck',
    },
    {
      title: 'Stronger Patient Retention & Lifetime Value',
      description: 'Automated follow-up sequences, recall campaigns, and mobile app touchpoints keep your practice top-of-mind between visits — increasing the frequency and duration of patient relationships.',
      icon: 'HeartHandshake',
    },
    {
      title: 'Dominant Local Search Presence',
      description: 'With medical SEO, local pack optimisation, and review management working in concert, your practice becomes the obvious choice in your geography — ahead of competitors and aggregator listings.',
      icon: 'MapPin',
    },
    {
      title: 'Full Regulatory Compliance & Risk Reduction',
      description: 'Every piece of content, every ad campaign, and every data workflow we build is reviewed against NMC guidelines and DPDP Act requirements — protecting your reputation and your licence.',
      icon: 'ShieldCheck',
    },
  ],

  // ─── BUSINESS RESULTS ─────────────────────────────────────────────────────
  businessResults: [
    { label: 'Average Appointment Growth', value: '+68%', description: 'Across healthcare clients in the first 6 months' },
    { label: 'Reduction in No-Show Rate', value: '-38%', description: 'Through automated reminder and engagement workflows' },
    { label: 'Organic Patient Inquiries', value: '+120%', description: 'Average increase after 90-day medical SEO implementation' },
    { label: 'Cost Per Appointment (PPC)', value: '-42%', description: 'Compared to self-managed or non-specialised agency campaigns' },
    { label: 'Patient Retention Rate', value: '+31%', description: 'Driven by CRM automation and mobile engagement' },
    { label: 'Front-Desk Call Volume', value: '-44%', description: 'After deployment of custom patient booking platforms' },
  ],

  // ─── PROCESS ──────────────────────────────────────────────────────────────
  process: [
    {
      order: 1,
      title: 'Discover',
      description:
        'We begin with a comprehensive digital health check: technical SEO audit, website conversion analysis, Google Ads account review (if applicable), competitive benchmarking, patient journey mapping, and stakeholder interviews. This phase surfaces the highest-impact opportunities and the critical blockers holding your practice back.',
    },
    {
      order: 2,
      title: 'Strategy',
      description:
        'From discovery findings, we build a tailored 90-day growth roadmap with clear priorities, channel mix, budget recommendations, KPI targets, and timelines. The strategy document becomes your shared source of truth — reviewed and approved by your team before we write a single line of code or ad copy.',
    },
    {
      order: 3,
      title: 'Design',
      description:
        'Our UI/UX team designs patient-facing interfaces that inspire trust and reduce friction — website wireframes, booking flow prototypes, mobile app screens, and landing page layouts. Healthcare design requires clinical empathy: patients may be anxious, in pain, or navigating unfamiliar territory. Every design decision reflects that reality.',
    },
    {
      order: 4,
      title: 'Development',
      description:
        'Our engineering team builds to HIPAA-aware standards: secure data handling, encrypted communications, role-based access control, and thorough API integration with HMS/EMR platforms, payment gateways, WhatsApp Business API, and third-party scheduling tools. We follow a sprint-based delivery model with weekly demos so you always know where you stand.',
    },
    {
      order: 5,
      title: 'Testing',
      description:
        'Before any patient-facing system goes live, we conduct rigorous quality assurance: cross-browser and cross-device testing, load testing, security penetration testing (on request), WCAG accessibility validation, booking flow end-to-end testing, and UAT with your clinical and administrative team to catch edge cases that only healthcare professionals would identify.',
    },
    {
      order: 6,
      title: 'Launch',
      description:
        'We manage the full go-live sequence: staged rollout, DNS migration, analytics verification, ad campaign activation, and a launch-day monitoring window. Staff training is included for all admin-facing systems. A launch checklist is shared with your team to ensure nothing falls through the cracks during the critical first 48 hours.',
    },
    {
      order: 7,
      title: 'Optimisation',
      description:
        'Growth is a continuous process, not a one-time event. In the months following launch, we analyse real patient behaviour — heatmaps, session recordings, conversion funnels, and keyword performance — and run structured A/B tests on landing pages, ad copy, and booking flows. Monthly performance reviews keep strategy aligned with results.',
    },
    {
      order: 8,
      title: 'Growth',
      description:
        'Once the foundation is performing, we expand: new specialty pages, additional service area campaigns, mobile app feature releases, referral programme builds, and enterprise partnership integrations. Our goal is to become a long-term growth partner — the digital team your practice never had to hire full-time.',
    },
  ],

  // ─── WHY US ───────────────────────────────────────────────────────────────
  whyUs: [
    {
      title: 'Deep Healthcare Domain Expertise',
      description: 'Seven years and 80+ healthcare projects have given us an operational understanding of how clinics, hospitals, and health-tech startups actually work — the clinical workflows, the front-desk realities, the regulatory constraints, and the patient psychology that generic agencies miss entirely.',
      icon: 'Stethoscope',
    },
    {
      title: 'NMC & DPDP Compliance Built In',
      description: 'Every campaign, piece of content, and software module we build is reviewed against NMC advertising guidelines and DPDP Act data requirements from the start — not retrofitted at the end. You get the confidence to market aggressively without the regulatory risk.',
      icon: 'ShieldCheck',
    },
    {
      title: 'Full-Stack Capability Under One Roof',
      description: 'Strategy, design, engineering, SEO, paid media, content, and analytics — all in one team. No hand-off friction between a marketing agency and a development firm. When your booking system needs a new feature and your SEO needs updating, one call to your account manager covers both.',
      icon: 'Layers',
    },
    {
      title: 'HIPAA-Aware Engineering Standards',
      description: 'Our development team builds healthcare software with data security as a first principle: encrypted data at rest and in transit, role-based access, audit trails, and penetration-tested infrastructure. You get enterprise-grade security without enterprise-grade procurement timelines.',
      icon: 'Lock',
    },
    {
      title: 'Transparent, KPI-Driven Reporting',
      description: 'You will never wonder what we did last month or whether it worked. Every client receives a monthly performance report with clearly defined KPIs — appointments generated, cost per acquisition, organic ranking movements, and revenue attribution — alongside a plain-language commentary from your account manager.',
      icon: 'BarChart2',
    },
    {
      title: 'Dedicated Healthcare Account Management',
      description: 'Your account manager understands healthcare — not just digital marketing. They can speak intelligently about clinical scheduling constraints, NMC guidelines, and patient journey nuances. They are your single point of contact, reachable within business hours with a 4-hour response SLA.',
      icon: 'Users',
    },
    {
      title: 'Proven Results Across the Healthcare Spectrum',
      description: 'Our work spans solo practitioners, multi-specialty groups, diagnostic chains, telemedicine platforms, mental wellness apps, and health-tech SaaS companies. The breadth of our healthcare portfolio means we bring transferable insights from adjacent segments to every new engagement.',
      icon: 'Trophy',
    },
    {
      title: 'Agile Delivery with Clinical-Calendar Awareness',
      description: 'We know that healthcare practices cannot afford weeks of downtime for a website migration or a campaign launch. Our delivery model is built around your clinical calendar — phased rollouts, off-peak deployment windows, and minimal disruption to your front-desk operations during transitions.',
      icon: 'Clock',
    },
  ],

  // ─── TECHNOLOGY ───────────────────────────────────────────────────────────
  technology: [
    { name: 'Next.js / React (Healthcare Web)', level: 5 },
    { name: 'Node.js & NestJS (Backend APIs)', level: 5 },
    { name: 'React Native (iOS & Android Apps)', level: 4 },
    { name: 'PostgreSQL & MongoDB (Clinical Data)', level: 5 },
    { name: 'WhatsApp Business API & Twilio', level: 4 },
    { name: 'Google Analytics 4 & Looker Studio', level: 5 },
  ],

  // ─── PRICING ──────────────────────────────────────────────────────────────
  pricing: {
    starting: 'Custom',
    timeline: '4–16 weeks depending on scope',
    included: [
      'Full digital audit & 90-day growth roadmap',
      'Conversion-optimised website design & development',
      'Medical SEO implementation (on-page, local, schema)',
      'Patient booking platform (if in scope)',
      'Healthcare CRM setup & automation workflows',
      'NMC-compliant paid media campaign setup',
      'Analytics, call tracking & monthly reporting dashboard',
      'Dedicated healthcare account manager',
      '3-month post-launch optimisation support',
    ],
    note: 'All engagements begin with a free Healthcare Growth Audit (worth ₹10,000). Pricing is tailored to your practice size, scope of services, and growth goals. Retainer programmes available for ongoing SEO, paid media, and content.',
  },

  // ─── FAQS ─────────────────────────────────────────────────────────────────
  faqs: [
    {
      question: 'What does healthcare digital marketing include?',
      answer:
        'Healthcare digital marketing encompasses all the strategies and channels used to attract, convert, and retain patients online. It includes medical SEO (ranking on Google for condition and specialty keywords), local search optimisation (Google Maps and local pack), pay-per-click advertising on Google and Meta, social media management, content marketing (health blogs, condition pages, FAQs), online reputation management (Google and Practo reviews), email and WhatsApp patient communication, and conversion rate optimisation of your website and booking flows. Growth Technos delivers all of these services under one roof with a team that understands both the marketing mechanics and the healthcare compliance landscape.',
    },
    {
      question: 'How long does it take to see results from healthcare SEO?',
      answer:
        'Healthcare SEO is a medium-to-long-term investment. Most clients begin seeing measurable keyword ranking improvements within 60–90 days of implementation. Meaningful organic traffic growth — enough to contribute to appointment volume — typically takes 3–6 months. Local pack rankings (Google Maps) can improve faster, often within 30–60 days with consistent optimisation. The timeline depends on your domain\'s existing authority, the competitiveness of your specialty and geography, and the depth of the SEO strategy we implement. Growth Technos provides monthly ranking and traffic reports so you can track progress transparently from week one.',
    },
    {
      question: 'Are healthcare digital ads compliant with NMC guidelines?',
      answer:
        'Yes — when run by an agency that understands the regulations. The National Medical Commission (NMC) guidelines prohibit healthcare advertisements that make guaranteed cure claims, use patient testimonials in certain formats, or make comparative claims against other practitioners. Our healthcare marketing team reviews all ad copy, landing page content, and social media posts against current NMC guidelines before publication. We also stay up to date with platform-specific healthcare ad policies (Google and Meta both have their own healthcare category restrictions). Over seven years and 30+ healthcare clients, we have maintained a zero-compliance-incident record.',
    },
    {
      question: 'Can you build a custom patient booking system integrated with our HMS?',
      answer:
        'Yes. We build custom patient booking platforms that can integrate with most major Hospital Management Systems (HMS) and Electronic Medical Record (EMR) platforms used in India, including Practo Ray, eVitalRx, Marg ERP, and custom in-house systems via REST API. Our booking systems support real-time slot availability, multi-doctor and multi-location scheduling, WhatsApp and SMS appointment confirmations and reminders, digital pre-consultation intake forms, and admin dashboards for your front-desk team. If your HMS does not have a public API, we can also build a lightweight middleware layer. Contact us to discuss your specific integration requirements.',
    },
    {
      question: 'What is the cost of healthcare digital marketing in India?',
      answer:
        'Healthcare digital marketing costs in India vary significantly based on the scope of services, practice size, geography, and competitive landscape. As a benchmark: a comprehensive monthly retainer covering SEO, paid media management, content, and reputation management for a mid-sized clinic typically ranges from ₹25,000 to ₹75,000 per month (plus ad spend). A full website design and development project for a multi-specialty clinic ranges from ₹80,000 to ₹4,00,000 depending on features. Custom booking platform or CRM development is priced separately based on specification. Growth Technos provides a detailed, itemised proposal after the free Healthcare Growth Audit — there is no generic pricing sheet because your practice\'s needs are unique.',
    },
    {
      question: 'Do you follow DPDP Act requirements for patient data?',
      answer:
        'Yes. India\'s Digital Personal Data Protection (DPDP) Act imposes significant obligations on organisations that collect and process personal data — including patient health information. Every system we build includes: explicit consent mechanisms for data collection, clearly defined data retention and deletion policies, role-based access controls, encrypted data storage and transmission, and audit trails for data access. We also ensure that any third-party tools integrated into your workflow (CRM, marketing platforms, analytics) are configured to comply with data minimisation and purpose limitation principles. We recommend all clients obtain formal legal counsel for their specific compliance obligations; we build the technical and operational infrastructure that supports compliance.',
    },
    {
      question: 'Can you help a single-doctor clinic or do you only work with large hospitals?',
      answer:
        'We work across the full spectrum of the healthcare ecosystem — from solo practitioners building their first professional website to 200-bed hospital groups managing multi-city digital presence. Our engagement model scales to match your budget and stage. A solo practitioner might start with a conversion-optimised website, Google Business Profile management, and a basic local SEO programme. A multi-specialty group might need a full technology stack with custom booking, CRM, mobile app, and multi-location paid media. Every engagement begins with the free Healthcare Growth Audit, which helps us recommend the right starting point for your specific situation.',
    },
    {
      question: 'What makes Growth Technos different from a general digital marketing agency?',
      answer:
        'The primary differentiators are domain depth and full-stack capability. A general agency may know how to run Google Ads, but will not understand NMC advertising restrictions, medical intent keywords, clinical scheduling constraints, or patient psychology. Our healthcare team has worked on 80+ healthcare projects over seven years and understands the sector from the inside. The second differentiator is capability breadth: most healthcare agencies are either marketing-only or technology-only. Growth Technos handles both — strategy, design, engineering, SEO, paid media, analytics, and ongoing optimisation — without the friction of coordinating between two separate vendors.',
    },
    {
      question: 'How do you measure the success of healthcare marketing campaigns?',
      answer:
        'We measure success against KPIs that matter to practice owners: total appointment volume (online and phone), cost per new patient acquisition (by channel), organic traffic growth (by specialty and location keyword), Google and Practo review rating trends, website conversion rate (visitors to booked appointments), no-show rate (if we manage reminder workflows), and patient retention metrics (for CRM clients). Every client receives a monthly report covering all agreed KPIs with plain-language commentary and a 30-minute review call with their account manager. We do not hide behind vanity metrics — if a channel is not delivering, we say so and propose adjustments.',
    },
    {
      question: 'Do you offer telemedicine app development?',
      answer:
        'Yes. We design and develop custom telemedicine applications for iOS and Android, including secure video consultation (WebRTC-based), e-prescription generation, appointment scheduling, payment gateway integration (Razorpay, PayU), patient health record access, and push notification for appointment alerts. Our telemedicine platforms are built to scale — from a 5-doctor clinic running 50 monthly consultations to a platform handling 10,000+ monthly sessions. We also build the web-based admin panel for your medical and administrative staff. Post-launch, we support the platform with bug fixes, feature releases, and performance monitoring under a monthly retainer.',
    },
    {
      question: 'Can you improve our Google and Practo ratings?',
      answer:
        'Yes, through a systematic reputation management programme. We implement a post-visit review generation workflow: patients receive an automated satisfaction check-in message via WhatsApp or SMS after their appointment, and satisfied patients are guided directly to your Google or Practo review page with a single tap. We also create a branded response framework so your team can professionally acknowledge all reviews — positive and negative — in a way that builds trust with prospective patients reading them. Most clients see a measurable improvement in their average rating within 8–12 weeks of programme activation.',
    },
    {
      question: 'What is a Healthcare Growth Audit and what does it cover?',
      answer:
        'A Healthcare Growth Audit is Growth Technos\' proprietary 30-point assessment of your practice\'s digital presence. It covers: Google Search Console and organic ranking analysis, website speed and technical SEO health, Google Business Profile completeness and review profile, paid advertising account audit (if applicable), competitor benchmarking for your primary specialties and location, website conversion rate analysis, patient booking flow evaluation, and a social media presence review. The audit produces a prioritised action plan with quick wins and strategic recommendations. It is valued at ₹10,000 and is provided free to qualified healthcare practices. Book yours at growthteachnos.com/contact?intent=industry-audit.',
    },
    {
      question: 'Do you provide content writing for healthcare websites?',
      answer:
        'Yes. Our healthcare content team writes SEO-optimised, medically accurate content reviewed for NMC compliance: condition and treatment pages, doctor profile pages, FAQ sections, health blog articles, and procedure-specific landing pages. All content is written by trained health writers and reviewed by our SEO team for keyword integration and by our compliance reviewer for regulatory alignment. We do not use AI-generated medical content without human review and fact-checking. Content is delivered in structured formats ready for your CMS, with meta titles, descriptions, and image alt text included.',
    },
    {
      question: 'Can you help us rank for competitive specialties like IVF, cosmetic surgery, or orthopaedics?',
      answer:
        'Yes — these are some of the most competitive and most searched healthcare categories in India, and we have successfully ranked clients in all three. High-competition specialties require a more aggressive and technically sophisticated SEO approach: deep content clusters covering all sub-topics within the specialty, authoritative backlink acquisition from health media and medical directories, schema markup for specific procedures, and local landing pages for every service area city or neighbourhood. Results take longer in these categories (typically 4–8 months to meaningful first-page visibility), but the ROI per ranked keyword is significantly higher because patient acquisition value is greater.',
    },
    {
      question: 'What is the onboarding process when we start working with Growth Technos?',
      answer:
        'Our onboarding process is designed to be smooth and minimally disruptive for a busy healthcare practice. It begins with the free Healthcare Growth Audit (Week 1). We then present the findings and recommended strategy in a 60-minute onboarding call (Week 2). Once the scope and commercial terms are agreed, we collect the access credentials and information we need (Google Search Console, Google Ads, website, GBP, HMS API details if applicable) via a secure onboarding form. A dedicated account manager is assigned, internal kickoff is completed, and execution begins in Week 3. For website or software projects, a detailed project brief and design kick-off follow. You will have your first progress update within 14 days of project start.',
    },
  ],

  // ─── RESOURCES ────────────────────────────────────────────────────────────
  resources: [
    {
      title: 'Free Healthcare Growth Audit (worth ₹10,000)',
      description:
        'A 30-point assessment of your practice\'s digital presence — SEO, website, Google Business Profile, paid ads, and competitor benchmarking — with a prioritised action plan delivered within 5 business days.',
      href: '/contact?resource=healthcare-growth-audit',
      type: 'audit',
    },
    {
      title: 'Healthcare Digital Marketing Compliance Checklist',
      description:
        'A practical, 25-point checklist covering NMC advertising guidelines, DPDP Act data obligations, platform-specific ad policies, and content compliance requirements for Indian healthcare providers.',
      href: '/contact?resource=healthcare-compliance-checklist',
      type: 'checklist',
    },
    {
      title: 'Patient Acquisition Funnel Guide for Clinics & Hospitals',
      description:
        'A step-by-step guide to building a complete patient acquisition funnel — from search intent to booked appointment — including channel strategy, landing page blueprints, and CRO frameworks.',
      href: '/contact?resource=patient-acquisition-funnel-guide',
      type: 'guide',
    },
    {
      title: 'Healthcare Website Conversion Teardown (Case Study)',
      description:
        'Download our annotated case study showing how we redesigned a multi-specialty clinic website and increased appointment conversions by 3.2× in 60 days — with before/after screenshots and implementation notes.',
      href: '/contact?resource=healthcare-website-conversion-teardown',
      type: 'download',
    },
    {
      title: 'Medical SEO Keyword Research Template',
      description:
        'A ready-to-use Google Sheets template for healthcare keyword research — pre-populated with category structure (specialty, condition, location, procedure) and intent classification columns.',
      href: '/contact?resource=medical-seo-keyword-template',
      type: 'template',
    },
  ],

  // ─── AUDIT CTA ────────────────────────────────────────────────────────────
  auditCta: {
    title: 'Get Your Free Healthcare Growth Audit — Worth ₹10,000',
    description:
      'We will analyse your practice\'s digital presence across 30 critical dimensions — organic search visibility, website conversion health, paid media performance, Google Business Profile strength, online reputation, and competitor positioning — and deliver a prioritised action plan within 5 business days. No cost, no commitment, and no generic recommendations. This is a hands-on audit by our healthcare digital team, personalised to your specialty, location, and growth goals.',
    buttonLabel: 'Claim Your Free Audit',
    buttonUrl: '/contact?intent=industry-audit',
  },

  // ─── FINAL CTA ────────────────────────────────────────────────────────────
  finalCta: {
    title: 'Ready to Grow Your Healthcare Practice?',
    description:
      'Book a free 45-minute strategy call with our healthcare digital team. We will review your current situation, discuss your growth goals, and outline a realistic plan to get there. No sales pressure — just strategic clarity.',
    buttonLabel: 'Book a Strategy Call',
    buttonUrl: '/contact?intent=strategy-call',
  },

  // ─── TESTIMONIALS ─────────────────────────────────────────────────────────
  testimonials: [
    {
      author: 'Dr. Priya Nambiar',
      position: 'Founder & Medical Director',
      company: 'NovaCare Clinics, Gurugram',
      text: 'We were struggling to compete with larger hospital chains online despite our clinical outcomes being genuinely superior. Growth Technos rebuilt our entire digital presence — website, SEO, Google Ads, and our patient booking system — within 12 weeks. Six months later we had tripled our new patient volume and our cost per acquisition had dropped by 40%. Their team understands healthcare in a way that generic agencies simply do not.',
      avatar: '/uploads/industries/healthcare/testimonials/priya-nambiar.webp',
    },
    {
      author: 'Mr. Karthik Subramaniam',
      position: 'CEO',
      company: 'MindEase Health Technologies, Bangalore',
      text: 'Growth Technos built our mental wellness app and then ran our user acquisition marketing. They understood that mental health requires a completely different content and advertising approach — sensitive, credible, and non-stigmatising. The app surpassed 10,000 active users within eight months of launch. Their end-to-end capability — product, marketing, and analytics — meant we had one strategic partner instead of three vendors pointing fingers at each other.',
      avatar: '/uploads/industries/healthcare/testimonials/karthik-subramaniam.webp',
    },
    {
      author: 'Dr. Sunita Agarwal',
      position: 'Director',
      company: 'PhysioFirst Rehabilitation Centre, Noida',
      text: 'Our no-show rate was over 35% and our front desk was overwhelmed with reminder calls. Growth Technos implemented an automated booking and reminder system integrated with our existing HMS, and deployed a WhatsApp-based patient engagement workflow. Within three months, no-shows were down to 11% and our front-desk team had reclaimed nearly two hours per day. The ROI was clear within the first billing cycle.',
      avatar: '/uploads/industries/healthcare/testimonials/sunita-agarwal.webp',
    },
  ],

  // ─── CONTENT (AI / FAQ-flavored HTML) ─────────────────────────────────────
  content: {
    format: 'html',
    html: `<section class="industry-content">
  <h2>How does digital marketing help healthcare providers grow in India?</h2>
  <p>
    Clinics and hospitals in India increasingly rely on digital channels to connect with patients who begin their healthcare journey with an online search. Medical SEO — the practice of optimising a healthcare provider's website and Google Business Profile for condition-specific and location-based queries — is the foundation of sustainable patient acquisition. When a patient searches for a "cardiologist in Noida" or "best IVF clinic in Delhi," a well-optimised practice appears prominently in both the organic results and the local map pack, capturing high-intent traffic that converts at significantly higher rates than general display advertising. Growth Technos specialises in medical SEO and patient acquisition funnels that translate search visibility into booked appointments for clinics, hospitals, diagnostic centres, and health-tech platforms across India.
  </p>
  <h2>What digital tools do modern healthcare practices need?</h2>
  <p>
    Beyond search visibility, a modern healthcare practice requires an integrated digital infrastructure: a conversion-optimised, mobile-first website that instils trust and reduces booking friction; a custom patient booking platform with real-time slot availability and automated reminders to minimise no-shows; a healthcare CRM that unifies patient communication, appointment history, and follow-up workflows; and, increasingly, a mobile application or telemedicine capability that keeps patients engaged between visits. Growth Technos designs, builds, and integrates all of these components — often within a single engagement — with HIPAA-aware security standards, DPDP Act compliance, and NMC advertising guideline adherence built in from day one.
  </p>
  <h2>Which healthcare providers benefit most from working with a specialised digital agency?</h2>
  <p>
    Any healthcare organisation that acquires patients through word-of-mouth alone is leaving significant growth on the table. Single-specialty clinics benefit from local SEO and Google Business Profile dominance. Multi-specialty hospitals benefit from specialty-level content clusters, enterprise booking systems, and multi-location paid media. Health-tech startups and telemedicine platforms benefit from performance marketing, mobile app development, and product analytics. Diagnostic chains benefit from high-intent keyword coverage, online booking integrations, and reputation management across multiple locations. Growth Technos has delivered measurable results for all of these provider types and brings transferable insights from each segment to every new engagement.
  </p>
</section>`,
    plainText:
      'Clinics and hospitals in India increasingly rely on digital channels to connect with patients who begin their healthcare journey with an online search. Medical SEO is the foundation of sustainable patient acquisition. Beyond search visibility, a modern healthcare practice requires an integrated digital infrastructure: a conversion-optimised website, a custom patient booking platform, a healthcare CRM, and increasingly a mobile application. Growth Technos designs, builds, and integrates all of these components with HIPAA-aware security, DPDP Act compliance, and NMC advertising guideline adherence built in from day one. Any healthcare organisation that acquires patients through word-of-mouth alone is leaving significant growth on the table — single-specialty clinics, multi-specialty hospitals, health-tech startups, and diagnostic chains all benefit from a specialised digital partner.',
  },

  // ─── RELATED SLUGS ────────────────────────────────────────────────────────
  relatedServiceSlugs: [
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
  relatedPortfolioSlugs: [
    'family-doctor',
    'physical-therapy',
    'mindease-mental-wellness-platform',
  ],
  relatedBlogSlugs: [
    'healthcare-website-development-guide-2026',
  ],
};

// ─── STUB SERVICES ─────────────────────────────────────────────────────────────
export const healthcareStubServices: IndustryStubService[] = [
  {
    slug: 'healthcare-patient-booking',
    title: 'Healthcare Patient Booking Platform',
    shortDescription:
      'Custom appointment booking systems for clinics and hospitals — real-time scheduling, automated reminders, and HMS integration.',
    description:
      'A branded, HIPAA-aware patient booking platform designed for the operational realities of Indian healthcare. Features include real-time doctor and slot availability, multi-location scheduling, digital pre-consultation intake forms, WhatsApp and SMS appointment confirmations and reminders, easy rescheduling and cancellation, and an admin dashboard for front-desk teams. Integrates with major HMS/EMR platforms via API or as a standalone scheduling layer. Reduces no-show rates by 35–50% and front-desk call volume by up to 44%.',
    kind: 'specialty',
    categorySlug: 'software-saas-development',
  },
  {
    slug: 'healthcare-crm-automation',
    title: 'Healthcare CRM & Patient Automation',
    shortDescription:
      'Unified patient CRM with automated follow-up, re-engagement, and lifecycle workflows for clinics and hospital groups.',
    description:
      'A healthcare-specific CRM solution that consolidates patient records, appointment history, communication logs, billing touchpoints, and marketing interactions into a single, DPDP-compliant platform. Includes automated patient lifecycle workflows: post-visit follow-up messages, prescription refill reminders, annual recall campaigns, and re-engagement sequences for lapsed patients — delivered via WhatsApp Business API, SMS, and email. Custom dashboards give practice managers real-time visibility into patient retention, lifetime value, and churn risk. Reduces manual administrative overhead and increases patient retention by 25–40%.',
    kind: 'specialty',
    categorySlug: 'software-saas-development',
  },
  {
    slug: 'healthcare-ai-chatbot',
    title: 'Healthcare AI Appointment & Triage Chatbot',
    shortDescription:
      'AI-powered chatbot for healthcare websites and WhatsApp — handles appointment booking, symptom triage, and patient FAQs 24/7.',
    description:
      'An intelligent conversational AI assistant deployed on your website and WhatsApp Business number to handle patient interactions around the clock. Capabilities include guided appointment booking (specialty selection, doctor preference, slot availability), symptom-based triage and department routing, answers to common patient FAQs (services, fees, timings, location, insurance), and seamless handoff to a human agent when clinical judgement is required. Built on proven LLM infrastructure with healthcare-specific prompt engineering, NMC-compliant response guardrails, and DPDP Act-aligned data handling. Reduces front-desk load by handling 60–70% of routine patient enquiries without human intervention.',
    kind: 'specialty',
    categorySlug: 'software-saas-development',
  },
];
