/**
 * Seed default lead-gen content so Phase 6 chrome has something to render.
 * Usage: npm run seed:lead-gen
 */
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  CtaActionType,
  CtaPlacement,
  DeviceType,
  FormFieldType,
  OfferType,
  PageType,
  PopupTrigger,
  ThankYouPageType,
  WidgetPosition,
} from '@core/constants/leads';
import { LeadForm } from '@modules/leads/model/lead-form.model';
import { Offer } from '@modules/leads/model/offer.model';
import { PopupCampaign } from '@modules/leads/model/popup-campaign.model';
import { StickyCtaCampaign } from '@modules/leads/model/sticky-cta.model';
import { WhatsAppWidget } from '@modules/leads/model/whatsapp-widget.model';
import { FloatingCta } from '@modules/leads/model/floating-cta.model';
import { ThankYouPage } from '@modules/leads/model/thank-you-page.model';
import { SuccessMessage } from '@modules/leads/model/success-message.model';
import { logger } from '@core/logger';

async function upsertThankYouPages() {
  const pages = [
    {
      slug: 'consultation-booked',
      type: ThankYouPageType.CONSULTATION,
      headline: 'Consultation requested',
      body: 'Thanks for reaching out. A strategist will review your note and follow up with clear next steps.',
      timelineText: 'Expect a reply within 30 minutes during business hours (Mon–Sat).',
      nextSteps: [
        { title: 'We review your inquiry', description: 'Industry, goals, and current digital presence.', order: 0 },
        { title: 'We reply with next steps', description: 'A short call agenda or clarifying questions — no hard sell.', order: 1 },
        { title: 'Optional strategy session', description: 'If it’s a fit, we book a free consultation.', order: 2 },
      ],
      relatedResources: [
        { title: 'Industries we help grow', url: '/industries', description: 'Healthcare, restaurants, and salons' },
        { title: 'Our process', url: '/process', description: 'How engagements typically run' },
      ],
    },
    {
      slug: 'healthcare-audit-requested',
      type: ThankYouPageType.HEALTHCARE_AUDIT,
      headline: 'Healthcare audit requested',
      body: 'Your free healthcare growth audit is in the queue. We’ll assess patient acquisition, booking friction, and local visibility.',
      timelineText: 'Audit outline typically within 1 business day.',
      nextSteps: [
        { title: 'Audit scoped', description: 'Website, SEO, and appointment pathways.', order: 0 },
        { title: 'Findings shared', description: 'Prioritized opportunities with estimated impact.', order: 1 },
        { title: 'Optional walkthrough', description: 'Book a call if you want us to implement.', order: 2 },
      ],
      relatedResources: [
        { title: 'Healthcare solutions', url: '/industries/healthcare' },
        { title: 'Contact us', url: '/contact' },
      ],
    },
    {
      slug: 'restaurant-audit-requested',
      type: ThankYouPageType.RESTAURANT_AUDIT,
      headline: 'Restaurant audit requested',
      body: 'Your free restaurant digital audit is queued. We’ll review menu visibility, ordering paths, and local search.',
      timelineText: 'Audit outline typically within 1 business day.',
      nextSteps: [
        { title: 'Audit scoped', description: 'Site, listings, and conversion paths.', order: 0 },
        { title: 'Findings shared', description: 'Practical fixes ranked by impact.', order: 1 },
        { title: 'Optional walkthrough', description: 'Implement with our team if useful.', order: 2 },
      ],
      relatedResources: [{ title: 'Restaurant solutions', url: '/industries/restaurants' }],
    },
    {
      slug: 'salon-audit-requested',
      type: ThankYouPageType.SALON_AUDIT,
      headline: 'Salon audit requested',
      body: 'Your free salon marketing audit is queued. We’ll look at booking friction, local search, and retention opportunities.',
      timelineText: 'Audit outline typically within 1 business day.',
      nextSteps: [
        { title: 'Audit scoped', description: 'Booking flow, local SEO, and offers.', order: 0 },
        { title: 'Findings shared', description: 'Clear priorities for fill-rate and retention.', order: 1 },
        { title: 'Optional walkthrough', description: 'We can help execute the plan.', order: 2 },
      ],
      relatedResources: [{ title: 'Salon solutions', url: '/industries/salons' }],
    },
  ];

  const ids: Record<string, string> = {};

  for (const page of pages) {
    const existing = await ThankYouPage.findOne({ slug: page.slug }).setOptions({ includeDeleted: true });
    const data = {
      ...page,
      downloadLinks: [],
      calendarEmbedUrl: undefined,
      metaTitle: page.headline,
      metaDescription: page.body.slice(0, 160),
      indexable: false,
      status: EntityStatus.PUBLISHED,
      isDeleted: false,
      deletedAt: undefined,
    };
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      ids[page.slug] = existing.id;
    } else {
      const created = await ThankYouPage.create(data);
      ids[page.slug] = created.id;
    }
  }

  return ids;
}

async function upsertSuccessMessage() {
  const existing = await SuccessMessage.findOne({ name: 'Contact success' });
  const data = {
    name: 'Contact success',
    headline: 'Thank you — we received your inquiry',
    body: "No spam. We'll only contact you regarding your inquiry. Usually responds within 30 minutes during business hours.",
    secondaryCta: { type: CtaActionType.LINK, label: 'Explore industries', url: '/industries' },
    status: EntityStatus.PUBLISHED,
  };
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return SuccessMessage.create(data);
}

async function upsertForm(thankYouIds: Record<string, string>, successMessageId: string) {
  const existing = await LeadForm.findOne({ slug: 'contact' }).setOptions({ includeDeleted: true });
  const fields = [
    { key: 'name', label: 'Name', type: FormFieldType.TEXT, required: true, options: [], order: 0, placeholder: 'Your name' },
    { key: 'email', label: 'Email', type: FormFieldType.EMAIL, required: true, options: [], order: 1, placeholder: 'you@company.com' },
    { key: 'businessName', label: 'Business name', type: FormFieldType.TEXT, required: false, options: [], order: 2 },
    { key: 'phone', label: 'Phone', type: FormFieldType.PHONE, required: false, options: [], order: 3 },
    { key: 'industry', label: 'Industry', type: FormFieldType.SELECT, required: false, options: ['Healthcare', 'Restaurants', 'Salons', 'Other'], order: 4 },
    { key: 'serviceInterested', label: 'Service interested in', type: FormFieldType.TEXT, required: false, options: [], order: 5 },
    { key: 'monthlyBudget', label: 'Monthly budget', type: FormFieldType.SELECT, required: false, options: ['₹5,000 - ₹10,000', '₹10,000 - ₹25,000', '₹25,000 - ₹50,000', '₹50,000+'], order: 6 },
    { key: 'message', label: 'Message', type: FormFieldType.TEXTAREA, required: true, options: [], order: 7 },
    { key: 'consent', label: 'I agree to be contacted regarding my inquiry.', type: FormFieldType.CONSENT, required: true, options: [], order: 8 },
  ];

  const payload = {
    name: 'Contact Form',
    slug: 'contact',
    title: 'Send us a message',
    description: 'Tell us about your goals. Free consultation. No obligation.',
    fields,
    microcopy: {
      trustLine: 'Trusted by growing healthcare, restaurant, and salon businesses.',
      responseTimeLine: 'Usually responds within 30 minutes during business hours.',
      privacyNote: "No spam. We'll only contact you regarding your inquiry.",
      submitLabel: 'Request consultation',
      consentLabel: 'I agree to be contacted regarding my inquiry.',
    },
    honeypotEnabled: true,
    successMessageId: successMessageId,
    thankYouPageId: thankYouIds['consultation-booked'],
    redirectRules: {
      mode: 'thank_you_page' as const,
      thankYouSlug: 'consultation-booked',
    },
    status: EntityStatus.PUBLISHED,
    isDeleted: false,
    deletedAt: undefined,
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }
  return LeadForm.create(payload);
}
async function upsertOffers() {
  const defs = [
    {
      title: 'Free Healthcare Growth Audit',
      valueLabel: 'Worth ₹10,000',
      bannerText: 'Free Healthcare Growth Audit',
      description: 'Get a clear view of your patient acquisition gaps — website, SEO, and booking flow.',
      offerType: OfferType.FREE_AUDIT,
      industries: ['healthcare'],
      pageTypes: [PageType.INDUSTRY, PageType.HOME],
    },
    {
      title: 'Free Restaurant Digital Audit',
      valueLabel: 'Worth ₹10,000',
      bannerText: 'Free Restaurant Digital Audit',
      description: 'Menu visibility, ordering paths, and local SEO reviewed for your restaurant.',
      offerType: OfferType.FREE_AUDIT,
      industries: ['restaurants'],
      pageTypes: [PageType.INDUSTRY, PageType.HOME],
    },
    {
      title: 'Free Salon Marketing Audit',
      valueLabel: 'Worth ₹10,000',
      bannerText: 'Free Salon Marketing Audit',
      description: 'Booking friction, local search, and retention opportunities for your salon.',
      offerType: OfferType.FREE_AUDIT,
      industries: ['salons'],
      pageTypes: [PageType.INDUSTRY, PageType.HOME],
    },
  ];

  for (const def of defs) {
    const existing = await Offer.findOne({ title: def.title });
    const data = {
      title: def.title,
      description: def.description,
      offerType: def.offerType,
      valueLabel: def.valueLabel,
      bannerText: def.bannerText,
      countdownEnabled: false,
      ctaAction: { type: CtaActionType.LINK, label: 'Get free audit', url: '/contact' },
      applicableIndustries: def.industries,
      applicableServices: [],
      displayRules: {
        industries: def.industries,
        services: [],
        pagePaths: [],
        pageTypes: def.pageTypes,
        devices: [DeviceType.ALL],
        excludePaths: [],
        priority: 10,
      },
      priority: 10,
      status: EntityStatus.PUBLISHED,
    };
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
    } else {
      await Offer.create(data);
    }
  }
}

async function upsertChrome() {
  const sticky = await StickyCtaCampaign.findOne({ name: 'Book consultation bar' });
  const stickyData = {
    name: 'Book consultation bar',
    placement: CtaPlacement.STICKY_BAR,
    position: WidgetPosition.BOTTOM_BAR,
    ctaAction: { type: CtaActionType.LINK, label: 'Book strategy call', url: '/contact' },
    showOnMobile: true,
    showOnDesktop: true,
    displayRules: {
      industries: [],
      services: [],
      pagePaths: [],
      pageTypes: [],
      devices: [DeviceType.ALL],
      excludePaths: ['/contact'],
      priority: 5,
    },
    priority: 5,
    status: EntityStatus.PUBLISHED,
  };
  if (sticky) {
    Object.assign(sticky, stickyData);
    await sticky.save();
  } else {
    await StickyCtaCampaign.create(stickyData);
  }

  const floating = await FloatingCta.findOne({ name: 'Request proposal float' });
  const floatingData = {
    name: 'Request proposal float',
    position: WidgetPosition.BOTTOM_RIGHT,
    ctaAction: { type: CtaActionType.LINK, label: 'Request proposal', url: '/contact' },
    showOnMobile: false,
    showOnDesktop: true,
    displayRules: {
      industries: [],
      services: [],
      pagePaths: [],
      pageTypes: [PageType.SERVICE, PageType.PORTFOLIO],
      devices: [DeviceType.DESKTOP, DeviceType.ALL],
      excludePaths: [],
      priority: 8,
    },
    priority: 8,
    status: EntityStatus.PUBLISHED,
  };
  if (floating) {
    Object.assign(floating, floatingData);
    await floating.save();
  } else {
    await FloatingCta.create(floatingData);
  }

  const wa = await WhatsAppWidget.findOne({ name: 'Site WhatsApp' });
  const waData = {
    name: 'Site WhatsApp',
    position: WidgetPosition.BOTTOM_RIGHT,
    headline: 'Chat with Growth Technos',
    prefilledMessage: "Hi Growth Technos, I'd like to discuss a project.",
    whatsappNumber: '919756896250',
    hoursNote: 'Usually replies within an hour',
    ctaAction: { type: CtaActionType.WHATSAPP, whatsappNumber: '919756896250' },
    displayRules: {
      industries: [],
      services: [],
      pagePaths: [],
      pageTypes: [],
      devices: [DeviceType.ALL],
      excludePaths: [],
      priority: 20,
    },
    priority: 20,
    status: EntityStatus.PUBLISHED,
  };
  if (wa) {
    Object.assign(wa, waData);
    await wa.save();
  } else {
    await WhatsAppWidget.create(waData);
  }

  const popup = await PopupCampaign.findOne({ name: 'General growth consult' });
  const popupData = {
    name: 'General growth consult',
    trigger: PopupTrigger.TIME_DELAY,
    triggerConfig: { delayMs: 25000 },
    content: {
      headline: 'Want a free growth consultation?',
      body: 'No spam. No obligation. Tell us about your business and we’ll share practical next steps.',
    },
    frequencyControl: {
      cookieKey: 'gt_consult_popup',
      maxShows: 1,
      cooldownHours: 168,
      oncePerSession: true,
    },
    displayRules: {
      industries: [],
      services: [],
      pagePaths: [],
      pageTypes: [PageType.HOME, PageType.INDUSTRY, PageType.SERVICE],
      devices: [DeviceType.ALL],
      excludePaths: ['/contact'],
      priority: 5,
    },
    status: EntityStatus.PUBLISHED,
  };
  if (popup) {
    Object.assign(popup, popupData);
    await popup.save();
  } else {
    await PopupCampaign.create(popupData);
  }
}

async function main() {
  await connectDatabase();
  const thankYouIds = await upsertThankYouPages();
  const success = await upsertSuccessMessage();
  await upsertForm(thankYouIds, success.id);
  await upsertOffers();
  await upsertChrome();
  logger.info(
    'Lead-gen seed complete: thank-you pages, success message, contact form, audits, chrome.',
  );
  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error(err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
