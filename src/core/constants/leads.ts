export enum LeadType {
  HEALTHCARE_AUDIT = 'healthcare_audit',
  RESTAURANT_AUDIT = 'restaurant_audit',
  SALON_AUDIT = 'salon_audit',
  GENERAL_INQUIRY = 'general_inquiry',
  NEWSLETTER = 'newsletter',
  CONTACT_FORM = 'contact_form',
  CAREER = 'career',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived',
}

export enum LeadSource {
  WEBSITE = 'website',
  LANDING_PAGE = 'landing_page',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  PAID_ADS = 'paid_ads',
  ORGANIC = 'organic',
  DIRECT = 'direct',
  OTHER = 'other',
}
