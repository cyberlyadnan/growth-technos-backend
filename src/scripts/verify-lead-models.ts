/**
 * Sanity-check that all lead-gen models register with Mongoose.
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/verify-lead-models.ts
 */
import { Campaign } from '@modules/leads/model/campaign.model';
import { ContactWidget } from '@modules/leads/model/contact-widget.model';
import { FloatingCta } from '@modules/leads/model/floating-cta.model';
import { Lead } from '@modules/leads/model/lead.model';
import { LeadForm } from '@modules/leads/model/lead-form.model';
import { LeadMagnet } from '@modules/leads/model/lead-magnet.model';
import { Offer } from '@modules/leads/model/offer.model';
import { PopupCampaign } from '@modules/leads/model/popup-campaign.model';
import { StickyCtaCampaign } from '@modules/leads/model/sticky-cta.model';
import { SuccessMessage } from '@modules/leads/model/success-message.model';
import { ThankYouPage } from '@modules/leads/model/thank-you-page.model';
import { WhatsAppWidget } from '@modules/leads/model/whatsapp-widget.model';

const models = [
  Lead,
  LeadForm,
  Offer,
  LeadMagnet,
  Campaign,
  PopupCampaign,
  StickyCtaCampaign,
  FloatingCta,
  ContactWidget,
  WhatsAppWidget,
  ThankYouPage,
  SuccessMessage,
];

for (const m of models) {
  // eslint-disable-next-line no-console
  console.log(`✓ ${m.modelName} → ${m.collection.name}`);
}

// eslint-disable-next-line no-console
console.log(`Registered ${models.length} lead-gen models.`);
