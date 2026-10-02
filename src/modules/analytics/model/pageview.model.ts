import { Schema, model, Document } from 'mongoose';

export interface IPageview extends Document {
  path: string;
  referrer: string;
  userAgent: string;
  ip: string;
  sessionId: string;
  createdAt: Date;
}

const PageviewSchema = new Schema<IPageview>({
  path: { type: String, required: true },
  referrer: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Pageview = model<IPageview>('Pageview', PageviewSchema);
