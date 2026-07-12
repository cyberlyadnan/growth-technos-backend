import { FormFieldType, LeadSource } from '@core/constants/leads';
import {
  createLeadFormSchema,
  submitLeadSchema,
  updateLeadSchema,
} from '@modules/leads/validation/lead.validation';
import { createOfferSchema, publicOffersQuerySchema } from '@modules/leads/validation/offer.validation';
import { createPopupSchema } from '@modules/leads/validation/popup.validation';
import { createThankYouPageSchema } from '@modules/leads/validation/thank-you.validation';
import { OfferType, PopupTrigger, ThankYouPageType } from '@core/constants/leads';

describe('Lead form validation', () => {
  it('accepts a form with fields and microcopy', () => {
    const parsed = createLeadFormSchema.safeParse({
      name: 'Contact',
      slug: 'contact',
      fields: [
        {
          key: 'email',
          label: 'Email',
          type: FormFieldType.EMAIL,
          required: true,
          order: 0,
        },
      ],
      microcopy: {
        privacyNote: 'No spam.',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty form name', () => {
    const parsed = createLeadFormSchema.safeParse({ name: '' });
    expect(parsed.success).toBe(false);
  });
});

describe('Lead submit validation', () => {
  it('requires formSlug or formId', () => {
    const parsed = submitLeadSchema.safeParse({
      email: 'a@b.com',
      name: 'Ada',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid public submission payload', () => {
    const parsed = submitLeadSchema.safeParse({
      formSlug: 'contact',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+919999999999',
      message: 'Need a healthcare website audit',
      consent: true,
      source: LeadSource.WEBSITE,
      utm: { utmSource: 'google', utmCampaign: 'healthcare' },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('Lead update validation', () => {
  it('accepts status updates', () => {
    const parsed = updateLeadSchema.safeParse({ status: 'qualified', notes: 'Hot lead' });
    expect(parsed.success).toBe(true);
  });
});

describe('Offer / popup / thank-you validation', () => {
  it('accepts offer create payload', () => {
    const parsed = createOfferSchema.safeParse({
      title: 'Free Healthcare Audit',
      offerType: OfferType.FREE_AUDIT,
      valueLabel: 'Worth ₹10,000',
      ctaAction: { type: 'link', label: 'Get audit', url: '/contact' },
      applicableIndustries: ['healthcare'],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts public offer query context', () => {
    const parsed = publicOffersQuerySchema.safeParse({
      industry: 'healthcare',
      pageType: 'industry',
      device: 'desktop',
      limit: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts popup create payload', () => {
    const parsed = createPopupSchema.safeParse({
      name: 'Exit consult',
      trigger: PopupTrigger.EXIT_INTENT,
      content: { headline: 'Need help?', body: 'Book a free call.' },
      frequencyControl: { maxShows: 1, oncePerSession: true },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts thank you page create payload', () => {
    const parsed = createThankYouPageSchema.safeParse({
      slug: 'consultation-booked',
      type: ThankYouPageType.CONSULTATION,
      headline: 'Consultation requested',
      nextSteps: [{ title: 'We review', order: 0 }],
    });
    expect(parsed.success).toBe(true);
  });
});
