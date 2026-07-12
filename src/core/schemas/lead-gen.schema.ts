import { Schema, Types } from 'mongoose';
import {
  CtaActionType,
  DeviceType,
  PageType,
} from '@core/constants/leads';
import { IImageAsset, imageAssetSchema } from '@core/schemas/content.schema';

export interface IDisplayRules {
  industries: string[];
  services: string[];
  pagePaths: string[];
  pageTypes: PageType[];
  devices: DeviceType[];
  excludePaths: string[];
  priority: number;
  startAt?: Date | null;
  endAt?: Date | null;
}

export interface IUtmFields {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface ICtaAction {
  type: CtaActionType;
  label?: string;
  url?: string;
  formId?: Types.ObjectId | null;
  offerId?: Types.ObjectId | null;
  magnetId?: Types.ObjectId | null;
  popupId?: Types.ObjectId | null;
  phone?: string;
  whatsappNumber?: string;
}

export interface IFrequencyControl {
  cookieKey?: string;
  maxShows?: number;
  cooldownHours?: number;
  oncePerSession?: boolean;
}

export interface IMicrocopy {
  trustLine?: string;
  responseTimeLine?: string;
  consentLabel?: string;
  privacyNote?: string;
  submitLabel?: string;
}

export interface IRedirectRules {
  mode: 'thank_you_page' | 'path' | 'none';
  thankYouSlug?: string;
  path?: string;
  openInNewTab?: boolean;
}

export interface ILeadLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface IScoreBreakdown {
  industry?: number;
  service?: number;
  budget?: number;
  source?: number;
  engagement?: number;
  custom?: Record<string, number>;
}

export interface IResourceLink {
  title: string;
  url: string;
  description?: string;
}

export type { IImageAsset };

export const displayRulesSchema = {
  industries: [{ type: String, trim: true }],
  services: [{ type: String, trim: true }],
  pagePaths: [{ type: String, trim: true }],
  pageTypes: [
    {
      type: String,
      enum: Object.values(PageType),
    },
  ],
  devices: [
    {
      type: String,
      enum: Object.values(DeviceType),
      default: DeviceType.ALL,
    },
  ],
  excludePaths: [{ type: String, trim: true }],
  priority: { type: Number, default: 0, min: 0, max: 1000, index: true },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
};

export const defaultDisplayRules = (): IDisplayRules => ({
  industries: [],
  services: [],
  pagePaths: [],
  pageTypes: [],
  devices: [DeviceType.ALL],
  excludePaths: [],
  priority: 0,
  startAt: null,
  endAt: null,
});

export const utmFieldsSchema = {
  utmSource: { type: String, trim: true, maxlength: 200 },
  utmMedium: { type: String, trim: true, maxlength: 200 },
  utmCampaign: { type: String, trim: true, maxlength: 200, index: true },
  utmTerm: { type: String, trim: true, maxlength: 200 },
  utmContent: { type: String, trim: true, maxlength: 200 },
};

/** Nested Schema — use as `{ type: ctaActionSchema, default: ... }` (has a `type` field). */
export const ctaActionSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(CtaActionType),
      default: CtaActionType.LINK,
    },
    label: { type: String, trim: true, maxlength: 120 },
    url: { type: String, trim: true, maxlength: 2000 },
    formId: { type: Schema.Types.ObjectId, ref: 'LeadForm', default: null },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
    magnetId: { type: Schema.Types.ObjectId, ref: 'LeadMagnet', default: null },
    popupId: { type: Schema.Types.ObjectId, ref: 'PopupCampaign', default: null },
    phone: { type: String, trim: true, maxlength: 40 },
    whatsappNumber: { type: String, trim: true, maxlength: 40 },
  },
  { _id: false },
);

export const frequencyControlSchema = {
  cookieKey: { type: String, trim: true, maxlength: 120 },
  maxShows: { type: Number, min: 0, max: 100 },
  cooldownHours: { type: Number, min: 0, max: 8760 },
  oncePerSession: { type: Boolean, default: false },
};

export const microcopySchema = {
  trustLine: { type: String, trim: true, maxlength: 300 },
  responseTimeLine: { type: String, trim: true, maxlength: 300 },
  consentLabel: { type: String, trim: true, maxlength: 500 },
  privacyNote: { type: String, trim: true, maxlength: 500 },
  submitLabel: { type: String, trim: true, maxlength: 80 },
};

export const redirectRulesSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['thank_you_page', 'path', 'none'],
      default: 'none',
    },
    thankYouSlug: { type: String, trim: true, lowercase: true, maxlength: 220 },
    path: { type: String, trim: true, maxlength: 2000 },
    openInNewTab: { type: Boolean, default: false },
  },
  { _id: false },
);

export const leadLocationSchema = {
  city: { type: String, trim: true, maxlength: 120 },
  region: { type: String, trim: true, maxlength: 120 },
  country: { type: String, trim: true, maxlength: 120 },
  latitude: { type: Number },
  longitude: { type: Number },
};

export const scoreBreakdownSchema = {
  industry: { type: Number, default: 0 },
  service: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  source: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 },
  custom: { type: Schema.Types.Mixed, default: {} },
};

export const resourceLinkSchema = {
  title: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, required: true, trim: true, maxlength: 2000 },
  description: { type: String, trim: true, maxlength: 500 },
};

export { imageAssetSchema };
