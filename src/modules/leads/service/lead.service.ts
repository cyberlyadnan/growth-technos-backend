import { Types } from 'mongoose';
import { LeadSource, LeadStatus, LeadType } from '@core/constants/leads';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { EntityStatus } from '@core/schemas/base.schema';
import { ILead, Lead } from '../model/lead.model';
import { SuccessMessage } from '../model/success-message.model';
import { ThankYouPage } from '../model/thank-you-page.model';
import { dispatchLeadSubmittedEvents } from '../events';
import { leadFormService } from './lead-form.service';
import {
  ClientMeta,
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
    if (query.industry) filter.industry = query.industry;
    if (query.formId) filter.formId = new Types.ObjectId(query.formId);
    if (query.campaignId) filter.campaignId = new Types.ObjectId(query.campaignId);

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
    const doc = await Lead.findById(id);
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

  async update(id: string, dto: UpdateLeadDto, userId: string): Promise<LeadResponse> {
    const doc = await Lead.findById(id);
    if (!doc) throw new NotFoundError('Lead not found');

    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.notes !== undefined) doc.notes = dto.notes;
    if (dto.assignedTo !== undefined) doc.assignedTo = toObjectId(dto.assignedTo) ?? null;
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

  async softDelete(id: string, userId: string): Promise<void> {
    const doc = await Lead.findById(id);
    if (!doc) throw new NotFoundError('Lead not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = LeadStatus.ARCHIVED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }
}

export const leadService = new LeadService();
