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
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  CRM = 'crm',
  ANALYTICS = 'analytics',
}

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
