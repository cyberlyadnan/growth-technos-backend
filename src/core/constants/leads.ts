export enum LeadType {
  HEALTHCARE_AUDIT = 'healthcare_audit',
  RESTAURANT_AUDIT = 'restaurant_audit',
  SALON_AUDIT = 'salon_audit',
  GENERAL_INQUIRY = 'general_inquiry',
  NEWSLETTER = 'newsletter',
  CONTACT_FORM = 'contact_form',
  CAREER = 'career',
  FREE_AUDIT = 'free_audit',
  CONSULTATION = 'consultation',
  PROPOSAL = 'proposal',
  LEAD_MAGNET = 'lead_magnet',
  OFFER = 'offer',
  PROCESS_AUDIT = 'process_audit',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  MEETING_SCHEDULED = 'meeting_scheduled',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum LeadActivityType {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  NOTE_ADDED = 'note_added',
  PRIORITY_CHANGED = 'priority_changed',
  ASSIGNED = 'assigned',
  RESTORED = 'restored',
  ARCHIVED = 'archived',
  UPDATED = 'updated',
  CONVERTED_TO_CLIENT = 'converted_to_client',
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
  POPUP = 'popup',
  STICKY_CTA = 'sticky_cta',
  FLOATING_CTA = 'floating_cta',
  WHATSAPP = 'whatsapp',
  OTHER = 'other',
}

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  NUMBER = 'number',
  HIDDEN = 'hidden',
  CONSENT = 'consent',
}

export enum CtaActionType {
  LINK = 'link',
  FORM = 'form',
  WHATSAPP = 'whatsapp',
  CALL = 'call',
  POPUP = 'popup',
  MAGNET = 'magnet',
  OFFER = 'offer',
}

export enum CtaPlacement {
  HERO = 'hero',
  MID_PAGE = 'mid_page',
  BOTTOM = 'bottom',
  FOOTER = 'footer',
  INLINE = 'inline',
  SIDEBAR = 'sidebar',
  STICKY_BAR = 'sticky_bar',
  FLOATING = 'floating',
}

export enum PopupTrigger {
  EXIT_INTENT = 'exit_intent',
  SCROLL = 'scroll',
  TIME_DELAY = 'time_delay',
  BUTTON = 'button',
  MANUAL = 'manual',
  CAMPAIGN = 'campaign',
}

export enum OfferType {
  LIMITED_TIME = 'limited_time',
  FREE_CONSULTATION = 'free_consultation',
  DISCOUNT = 'discount',
  FREE_AUDIT = 'free_audit',
  STRATEGY_SESSION = 'strategy_session',
  COMPETITOR_REPORT = 'competitor_report',
  CUSTOM = 'custom',
}

export enum WidgetPosition {
  BOTTOM_RIGHT = 'bottom_right',
  BOTTOM_LEFT = 'bottom_left',
  BOTTOM_CENTER = 'bottom_center',
  TOP_BAR = 'top_bar',
  BOTTOM_BAR = 'bottom_bar',
}

export enum ThankYouPageType {
  HEALTHCARE_AUDIT = 'healthcare_audit',
  RESTAURANT_AUDIT = 'restaurant_audit',
  SALON_AUDIT = 'salon_audit',
  CONSULTATION = 'consultation',
  GENERIC = 'generic',
  PROPOSAL = 'proposal',
  LEAD_MAGNET = 'lead_magnet',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum LeadEventType {
  SHEETS = 'sheets',
  EMAIL = 'email',
  CONFIRMATION_EMAIL = 'confirmation_email',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  CRM = 'crm',
  ANALYTICS = 'analytics',
}

/** Budget ranges offered on the Free Process Audit form. */
export const LEAD_BUDGET_OPTIONS = ['Under ₹30k', '₹30k–75k', '₹75k–1.5L', '₹1.5L+'] as const;

/** Current tools options on the Free Process Audit form. */
export const LEAD_CURRENT_TOOLS = ['Excel', 'Tally', 'Zoho', 'Other software', 'Paper'] as const;

export enum PageType {
  HOME = 'home',
  SERVICE = 'service',
  INDUSTRY = 'industry',
  BLOG = 'blog',
  PORTFOLIO = 'portfolio',
  ABOUT = 'about',
  CONTACT = 'contact',
  LANDING = 'landing',
  CUSTOM = 'custom',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  ALL = 'all',
}
