import { Schema, model, Document } from 'mongoose';
import { IUtmFields, utmFieldsSchema } from '@core/schemas/lead-gen.schema';

export interface IPageview extends Document {
  eventId?: string;
  eventName: string;
  path: string;
  landingPath?: string;
  referrer: string;
  sessionId: string;
  device?: string;
  placement?: string;
  scrollDepth?: number;
  utm?: IUtmFields;
  createdAt: Date;
  expiresAt?: Date;
}
const schema = new Schema<IPageview>({
  eventId: { type: String },
  eventName: { type: String, default: 'page_view', index: true },
  path: { type: String, required: true, maxlength: 500 },
  landingPath: { type: String, maxlength: 500 },
  referrer: { type: String, default: '', maxlength: 2000 },
  sessionId: { type: String, required: true, maxlength: 100 },
  device: String,
  placement: { type: String, maxlength: 120 },
  scrollDepth: Number,
  utm: { type: utmFieldsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 86400000) },
});
schema.index({ eventId: 1 }, { unique: true, sparse: true });
schema.index({ createdAt: -1, eventName: 1, path: 1 });
schema.index({ sessionId: 1, createdAt: -1 });
// Only new telemetry gets a retention deadline; legacy records remain unchanged.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Pageview = model<IPageview>('Pageview', schema);
