import { CmsPublicationStatus } from '@core/constants/cms';
import {
  createIndustrySchema,
  updateIndustrySchema,
} from '@modules/industries/validation/industry.validation';

describe('Industry validation schemas', () => {
  it('accepts a full sales-page create payload', () => {
    const parsed = createIndustrySchema.safeParse({
      name: 'Restaurants',
      slug: 'restaurants',
      shortDescription: 'Fill tables and grow direct orders.',
      publicationStatus: CmsPublicationStatus.PUBLISHED,
      isFeatured: true,
      displayOrder: 2,
      faqSchema: true,
      ogTitle: 'Restaurant Growth Systems',
      ogDescription: 'Menu-led growth for F&B brands.',
      hero: {
        title: 'Turn Search Into Booked Tables',
        primaryCta: { label: 'Get Audit', url: '/contact' },
        badges: ['Reservation-ready'],
        stats: [{ label: 'Bookings', value: '+40%' }],
      },
      problems: [{ title: 'Marketplace dependency', description: 'Fees erode margin.' }],
      solutions: [
        {
          problemTitle: 'Marketplace dependency',
          title: 'Direct channels',
          description: 'Own ordering and loyalty journeys.',
          result: 'Higher margins',
        },
      ],
      faqs: [
        {
          question: 'Do you support cloud kitchens?',
          answer: 'Yes, with outlet-level pages and geo targeting.',
        },
      ],
      auditCta: {
        title: 'Free Restaurant Audit',
        buttonLabel: 'Request Audit',
        buttonUrl: '/contact?intent=industry-audit',
      },
      relatedServices: ['507f1f77bcf86cd799439011'],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty industry names', () => {
    const parsed = createIndustrySchema.safeParse({
      name: '',
      slug: 'blank',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid publication status values', () => {
    const parsed = createIndustrySchema.safeParse({
      name: 'Salons',
      publicationStatus: 'live',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts partial SEO and relation updates', () => {
    const parsed = updateIndustrySchema.safeParse({
      metaTitle: 'Salon Digital Marketing',
      faqSchema: true,
      relatedServices: ['507f1f77bcf86cd799439011'],
      relatedPortfolio: [],
      relatedBlogs: [],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects malformed related service ids', () => {
    const parsed = updateIndustrySchema.safeParse({
      relatedServices: ['not-an-object-id'],
    });

    expect(parsed.success).toBe(false);
  });
});
