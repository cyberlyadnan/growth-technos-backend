import { submitLeadSchema } from '@modules/leads/validation/lead.validation';

/** The exact payload the website's Free Process Audit form sends. */
const payload = {
  formSlug: 'process-audit',
  leadType: 'process_audit',
  source: 'website',
  name: 'Asha Verma',
  businessName: 'Verma Traders',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  email: 'asha@example.com',
  industry: 'Manufacturing',
  serviceInterested: 'Inventory & GST billing',
  projectBudget: '₹30k–75k',
  projectTimeline: 'Within 1 month',
  currentTools: ['Excel', 'Tally'],
  message: 'Orders on WhatsApp, stock in Excel.',
  consent: true,
  landingPage: 'http://localhost:3000/contact?utm_source=test&utm_campaign=setup',
  utm: { utmSource: 'test', utmCampaign: 'setup' },
  clientSubmittedAt: '2026-11-07T16:36:35.736Z',
  website: '',
  customFields: { placement: 'contact_form' },
};

describe('Free Process Audit payload', () => {
  it('passes server-side validation unchanged', () => {
    const result = submitLeadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentTools).toEqual(['Excel', 'Tally']);
      expect(result.data.projectBudget).toBe('₹30k–75k');
    }
  });
});
