import { Types } from 'mongoose';
import {
  LeadActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
  LeadType,
} from '@core/constants/leads';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { EntityStatus } from '@core/schemas/base.schema';
import { ILead, ILeadActivityEntry, Lead } from '../model/lead.model';
import { SuccessMessage } from '../model/success-message.model';
import { ThankYouPage } from '../model/thank-you-page.model';
import { dispatchLeadSubmittedEvents } from '../events';
import { leadFormService } from './lead-form.service';
import {
  AddLeadNoteDto,
  ClientMeta,
  LeadActivityResponse,
  LeadResponse,
  ListLeadsQuery,
  SubmitLeadDto,
  SubmitLeadResult,
  UpdateLeadDto,
} from '../types/lead.types';

function toObjectId(value: string | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Types.ObjectId(value);
}

function mapCustomFields(fields: Map<string, unknown> | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!fields) return {};
  if (fields instanceof Map) {
    return Object.fromEntries(fields.entries());
  }
  return { ...fields };
}

function mapActivity(entry: ILeadActivityEntry & { _id?: Types.ObjectId }): LeadActivityResponse {
  return {
    id: entry._id?.toString?.() ?? new Types.ObjectId().toString(),
    type: entry.type,
    message: entry.message,
    meta: entry.meta,
    createdBy: entry.createdBy?.toString() ?? null,
    createdByName: entry.createdByName,
    createdAt: (entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt)).toISOString(),
  };
}

function pushActivity(
  doc: ILead,
  entry: {
    type: LeadActivityType;
    message: string;
    meta?: Record<string, unknown>;
    userId?: string;
    userName?: string;
  },
) {
  doc.activityLog = doc.activityLog ?? [];
  doc.activityLog.push({
    type: entry.type,
    message: entry.message,
    meta: entry.meta,
    createdBy: entry.userId ? new Types.ObjectId(entry.userId) : null,
    createdByName: entry.userName,
    createdAt: new Date(),
  });
}

function mapLead(doc: ILead): LeadResponse {
  return {
    id: doc.id,
    name: doc.name,
    businessName: doc.businessName,
    email: doc.email,
    phone: doc.phone,
    whatsapp: doc.whatsapp,
    industry: doc.industry,
    businessType: doc.businessType,
    serviceInterested: doc.serviceInterested,
    monthlyBudget: doc.monthlyBudget,
    city: doc.city,
    message: doc.message,
    consent: doc.consent,
    customFields: mapCustomFields(doc.customFields),
    leadType: doc.leadType,
    source: doc.source,
    status: doc.status,
    priority: doc.priority ?? LeadPriority.MEDIUM,
    campaignId: doc.campaignId?.toString() ?? null,
    formId: doc.formId?.toString() ?? null,
    offerId: doc.offerId?.toString() ?? null,
    magnetId: doc.magnetId?.toString() ?? null,
    popupId: doc.popupId?.toString() ?? null,
    landingPage: doc.landingPage,
    referrer: doc.referrer,
    utm: doc.utm ?? {},
    ip: doc.ip,
    userAgent: doc.userAgent,
    browser: doc.browser,
    device: doc.device,
    location: doc.location ?? null,
    assignedTo: doc.assignedTo?.toString() ?? null,
    score: doc.score ?? null,
    scoreBreakdown: doc.scoreBreakdown ?? null,
    eventsTriggered: doc.eventsTriggered ?? [],
    notes: doc.notes,
    activityLog: [...(doc.activityLog ?? [])]
      .map((entry) => mapActivity(entry as ILeadActivityEntry & { _id?: Types.ObjectId }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    isDeleted: Boolean(doc.isDeleted),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function validateAgainstFormFields(
  formFields: Array<{ key: string; required: boolean; type: string }>,
  payload: SubmitLeadDto,
): void {
  const knownKeys = new Set([
    'name',
    'businessName',
    'email',
    'phone',
    'whatsapp',
    'industry',
    'businessType',
    'serviceInterested',
    'monthlyBudget',
    'city',
    'message',
    'consent',
  ]);

  const payloadRecord = payload as Record<string, unknown>;

  for (const field of formFields) {
    if (!field.required) continue;

    if (field.key === 'consent') {
      if (!payload.consent) {
        throw new BadRequestError('Consent is required');
      }
      continue;
    }

    if (knownKeys.has(field.key)) {
      const value = payloadRecord[field.key];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestError(`${field.key} is required`);
      }
      continue;
    }

    const customValue = payload.customFields?.[field.key];
    if (customValue === undefined || customValue === null || customValue === '') {
      throw new BadRequestError(`${field.key} is required`);
    }
  }

  if (!payload.email && !payload.phone && !payload.whatsapp) {
    throw new BadRequestError('At least one of email, phone, or whatsapp is required');
  }
}

export class LeadService {
  async list(query: ListLeadsQuery): Promise<{ leads: LeadResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery(query);
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(query.search, [
        'name',
        'email',
        'phone',
        'businessName',
        'industry',
        'city',
        'message',
      ]),
    };

    if (query.trashOnly) {
      filter.isDeleted = true;
    } else if (!query.includeTrash) {
      filter.isDeleted = { $ne: true };
    }

    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.priority) filter.priority = query.priority;
    if (query.industry) filter.industry = query.industry;
    if (query.serviceInterested) filter.serviceInterested = query.serviceInterested;
    if (query.formId) filter.formId = new Types.ObjectId(query.formId);
    if (query.campaignId) filter.campaignId = new Types.ObjectId(query.campaignId);
    if (query.offerId) filter.offerId = new Types.ObjectId(query.offerId);

    const findQuery = Lead.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = Lead.countDocuments(filter);

    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    return {
      leads: docs.map(mapLead),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<LeadResponse> {
    const doc = await Lead.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Lead not found');
    return mapLead(doc);
  }

  async submit(dto: SubmitLeadDto, client: ClientMeta): Promise<SubmitLeadResult> {
    if (dto.website && dto.website.trim().length > 0) {
      // Honeypot tripped — pretend success without storing
      return {
        leadId: new Types.ObjectId().toString(),
        successMessage: {
          headline: 'Thank you',
          body: 'We received your inquiry and will be in touch shortly.',
        },
        redirect: null,
      };
    }

    const form = await leadFormService.getEntityBySlugOrId({
      formSlug: dto.formSlug,
      formId: dto.formId,
    });

    if (form.honeypotEnabled === false && dto.website) {
      // still ignore if somehow sent
    }

    validateAgainstFormFields(form.fields ?? [], dto);

    const lead = await Lead.create({
      name: dto.name,
      businessName: dto.businessName,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      industry: dto.industry,
      businessType: dto.businessType,
      serviceInterested: dto.serviceInterested,
      monthlyBudget: dto.monthlyBudget,
      city: dto.city,
      message: dto.message,
      consent: dto.consent ?? false,
      customFields: dto.customFields ?? {},
      leadType: dto.leadType ?? LeadType.CONTACT_FORM,
      source: dto.source ?? LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      campaignId: toObjectId(dto.campaignId) ?? null,
      formId: form._id,
      offerId: toObjectId(dto.offerId) ?? null,
      magnetId: toObjectId(dto.magnetId) ?? null,
      popupId: toObjectId(dto.popupId) ?? null,
      landingPage: dto.landingPage,
      referrer: dto.referrer,
      utm: dto.utm ?? {},
      ip: client.ip,
      userAgent: client.userAgent,
      browser: client.browser,
      device: client.device,
      location: client.location ?? null,
      eventsTriggered: [],
      score: null,
      scoreBreakdown: null,
      priority: LeadPriority.MEDIUM,
      activityLog: [
        {
          type: LeadActivityType.CREATED,
          message: 'Lead created from website submission',
          createdAt: new Date(),
        },
      ],
    });

    const eventResult = await dispatchLeadSubmittedEvents({
      leadId: lead.id,
      formId: form.id,
      formSlug: form.slug,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      businessName: lead.businessName,
      industry: lead.industry,
      serviceInterested: lead.serviceInterested,
      monthlyBudget: lead.monthlyBudget,
      city: lead.city,
      message: lead.message,
      leadType: lead.leadType,
      source: lead.source,
      landingPage: lead.landingPage,
      referrer: lead.referrer,
      utm: lead.utm,
      campaignId: lead.campaignId?.toString(),
      offerId: lead.offerId?.toString(),
      magnetId: lead.magnetId?.toString(),
      popupId: lead.popupId?.toString(),
      occurredAt: new Date().toISOString(),
    });

    if (eventResult.triggered.length) {
      lead.eventsTriggered = eventResult.triggered;
      await lead.save();
    }

    let successMessage: SubmitLeadResult['successMessage'] = null;
    if (form.successMessageId) {
      const msg = await SuccessMessage.findOne({
        _id: form.successMessageId,
        status: EntityStatus.PUBLISHED,
        isDeleted: { $ne: true },
      });
      if (msg) {
        successMessage = { headline: msg.headline, body: msg.body };
      }
    }

    if (!successMessage) {
      successMessage = {
        headline: 'Thank you — we received your inquiry',
        body: "No spam. We'll only contact you regarding your inquiry. Usually responds within 30 minutes during business hours.",
      };
    }

    let redirect: SubmitLeadResult['redirect'] = null;
    const rules = form.redirectRules;
    if (rules?.mode === 'path' && rules.path) {
      redirect = { mode: 'path', path: rules.path };
    } else if (rules?.mode === 'thank_you_page') {
      let slug = rules.thankYouSlug;
      if (!slug && form.thankYouPageId) {
        const page = await ThankYouPage.findById(form.thankYouPageId);
        slug = page?.slug;
      }
      if (slug) {
        redirect = { mode: 'thank_you_page', thankYouSlug: slug, path: `/thank-you/${slug}` };
      }
    }

    return {
      leadId: lead.id,
      successMessage,
      redirect,
      eventsTriggered: lead.eventsTriggered ?? [],
      analytics: {
        event: 'lead_submit',
        leadId: lead.id,
        formSlug: form.slug,
        industry: lead.industry,
        serviceInterested: lead.serviceInterested,
        source: lead.source,
      },
    };
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    userId: string,
    userName?: string,
  ): Promise<LeadResponse> {
    const doc = await Lead.findById(id);
    if (!doc) throw new NotFoundError('Lead not found');

    if (dto.status !== undefined && dto.status !== doc.status) {
      const previous = doc.status;
      doc.status = dto.status;
      pushActivity(doc, {
        type: LeadActivityType.STATUS_CHANGED,
        message: `Status changed from ${previous} to ${dto.status}`,
        meta: { from: previous, to: dto.status },
        userId,
        userName,
      });
    }

    if (dto.priority !== undefined && dto.priority !== doc.priority) {
      const previous = doc.priority;
      doc.priority = dto.priority;
      pushActivity(doc, {
        type: LeadActivityType.PRIORITY_CHANGED,
        message: `Priority changed from ${previous ?? 'medium'} to ${dto.priority}`,
        meta: { from: previous, to: dto.priority },
        userId,
        userName,
      });
    }

    if (dto.notes !== undefined) {
      doc.notes = dto.notes;
      pushActivity(doc, {
        type: LeadActivityType.NOTE_ADDED,
        message: dto.notes.slice(0, 200),
        userId,
        userName,
      });
    }

    if (dto.assignedTo !== undefined) {
      doc.assignedTo = toObjectId(dto.assignedTo) ?? null;
      pushActivity(doc, {
        type: LeadActivityType.ASSIGNED,
        message: dto.assignedTo ? 'Lead assigned' : 'Lead unassigned',
        meta: { assignedTo: dto.assignedTo },
        userId,
        userName,
      });
    }

    if (dto.score !== undefined) doc.score = dto.score;
    if (dto.scoreBreakdown !== undefined) doc.scoreBreakdown = dto.scoreBreakdown;
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.email !== undefined) doc.email = dto.email;
    if (dto.phone !== undefined) doc.phone = dto.phone;
    if (dto.businessName !== undefined) doc.businessName = dto.businessName;
    if (dto.industry !== undefined) doc.industry = dto.industry;
    if (dto.serviceInterested !== undefined) doc.serviceInterested = dto.serviceInterested;
    if (dto.message !== undefined) doc.message = dto.message;

    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapLead(doc);
  }

  async addNote(
    id: string,
    dto: AddLeadNoteDto,
    userId: string,
    userName?: string,
  ): Promise<LeadResponse> {
    const doc = await Lead.findById(id);
    if (!doc) throw new NotFoundError('Lead not found');

    const existing = doc.notes?.trim() ? `${doc.notes.trim()}\n\n` : '';
    doc.notes = `${existing}${dto.note}`;
    pushActivity(doc, {
      type: LeadActivityType.NOTE_ADDED,
      message: dto.note,
      userId,
      userName,
    });
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapLead(doc);
  }

  async softDelete(id: string, userId: string, userName?: string): Promise<void> {
    const doc = await Lead.findById(id);
    if (!doc) throw new NotFoundError('Lead not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = LeadStatus.ARCHIVED;
    pushActivity(doc, {
      type: LeadActivityType.ARCHIVED,
      message: 'Lead archived',
      userId,
      userName,
    });
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string, userName?: string): Promise<LeadResponse> {
    const doc = await Lead.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Lead not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    if (doc.status === LeadStatus.ARCHIVED) {
      doc.status = LeadStatus.NEW;
    }
    pushActivity(doc, {
      type: LeadActivityType.RESTORED,
      message: 'Lead restored from archive',
      userId,
      userName,
    });
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapLead(doc);
  }
}

export const leadService = new LeadService();
