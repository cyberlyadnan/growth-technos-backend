import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { CtaActionType, CtaPlacement, WidgetPosition } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { ICtaAction, IDisplayRules, IFrequencyControl } from '@core/schemas/lead-gen.schema';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { IStickyCtaCampaign, StickyCtaCampaign } from '../model/sticky-cta.model';
import { IFloatingCta, FloatingCta } from '../model/floating-cta.model';
import { IContactWidget, ContactWidget } from '../model/contact-widget.model';
import { IWhatsAppWidget, WhatsAppWidget } from '../model/whatsapp-widget.model';
import {
  DisplayContext,
  matchesDisplayRules,
  sortByPriorityDesc,
} from '../utils/display-rules';
import {
  CtaActionInput,
  buildCtaAction,
  defaultFrequency,
  mapCtaAction,
  matchesDeviceVisibility,
  mergeDisplayRules,
  patchCtaAction,
  toObjectId,
} from '../utils/cta-widget.helpers';

type ListQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

export type StickyCtaResponse = {
  id: string;
  name: string;
  placement: CtaPlacement;
  position: WidgetPosition;
  ctaAction: ICtaAction;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  displayRules: IDisplayRules;
  frequencyControl: IFrequencyControl;
  priority: number;
  campaignId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type FloatingCtaResponse = {
  id: string;
  name: string;
  position: WidgetPosition;
  ctaAction: ICtaAction;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  displayRules: IDisplayRules;
  frequencyControl: IFrequencyControl;
  priority: number;
  campaignId?: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContactWidgetResponse = {
  id: string;
  name: string;
  position: WidgetPosition;
  headline?: string;
  body?: string;
  phone?: string;
  hoursNote?: string;
  ctaAction: ICtaAction;
  displayRules: IDisplayRules;
  priority: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppWidgetResponse = {
  id: string;
  name: string;
  position: WidgetPosition;
  headline?: string;
  prefilledMessage?: string;
  whatsappNumber: string;
  hoursNote?: string;
  ctaAction: ICtaAction;
  displayRules: IDisplayRules;
  priority: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicWidgetsBundle = {
  sticky: StickyCtaResponse[];
  floating: FloatingCtaResponse[];
  contact: ContactWidgetResponse | null;
  whatsapp: WhatsAppWidgetResponse | null;
};

type StickyDto = {
  name: string;
  placement?: CtaPlacement;
  position?: WidgetPosition;
  ctaAction?: CtaActionInput;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  displayRules?: Partial<IDisplayRules>;
  frequencyControl?: IFrequencyControl;
  priority?: number;
  campaignId?: string | null;
  status?: EntityStatus;
};

type FloatingDto = {
  name: string;
  position?: WidgetPosition;
  ctaAction?: CtaActionInput;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  displayRules?: Partial<IDisplayRules>;
  frequencyControl?: IFrequencyControl;
  priority?: number;
  campaignId?: string | null;
  status?: EntityStatus;
};

type ContactDto = {
  name: string;
  position?: WidgetPosition;
  headline?: string;
  body?: string;
  phone?: string;
  hoursNote?: string;
  ctaAction?: CtaActionInput;
  displayRules?: Partial<IDisplayRules>;
  priority?: number;
  status?: EntityStatus;
};

type WhatsAppDto = {
  name: string;
  position?: WidgetPosition;
  headline?: string;
  prefilledMessage?: string;
  whatsappNumber: string;
  hoursNote?: string;
  ctaAction?: CtaActionInput;
  displayRules?: Partial<IDisplayRules>;
  priority?: number;
  status?: EntityStatus;
};

function mapSticky(doc: IStickyCtaCampaign): StickyCtaResponse {
  return {
    id: doc.id,
    name: doc.name,
    placement: doc.placement,
    position: doc.position,
    ctaAction: mapCtaAction(doc.ctaAction),
    showOnMobile: doc.showOnMobile,
    showOnDesktop: doc.showOnDesktop,
    displayRules: doc.displayRules,
    frequencyControl: doc.frequencyControl ?? {},
    priority: doc.priority,
    campaignId: doc.campaignId?.toString() ?? null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapFloating(doc: IFloatingCta): FloatingCtaResponse {
  return {
    id: doc.id,
    name: doc.name,
    position: doc.position,
    ctaAction: mapCtaAction(doc.ctaAction),
    showOnMobile: doc.showOnMobile,
    showOnDesktop: doc.showOnDesktop,
    displayRules: doc.displayRules,
    frequencyControl: doc.frequencyControl ?? {},
    priority: doc.priority,
    campaignId: doc.campaignId?.toString() ?? null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapContact(doc: IContactWidget): ContactWidgetResponse {
  return {
    id: doc.id,
    name: doc.name,
    position: doc.position,
    headline: doc.headline,
    body: doc.body,
    phone: doc.phone,
    hoursNote: doc.hoursNote,
    ctaAction: mapCtaAction(doc.ctaAction, CtaActionType.CALL),
    displayRules: doc.displayRules,
    priority: doc.priority,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function mapWhatsApp(doc: IWhatsAppWidget): WhatsAppWidgetResponse {
  return {
    id: doc.id,
    name: doc.name,
    position: doc.position,
    headline: doc.headline,
    prefilledMessage: doc.prefilledMessage,
    whatsappNumber: doc.whatsappNumber,
    hoursNote: doc.hoursNote,
    ctaAction: mapCtaAction(doc.ctaAction, CtaActionType.WHATSAPP),
    displayRules: doc.displayRules,
    priority: doc.priority,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function listEntity<T>(
  Model: Model<T>,
  query: ListQuery,
  searchFields: string[],
): Promise<{ docs: T[]; meta: PaginationMeta }> {
  const { page, limit, skip, sort } = parsePaginationQuery(query);
  const filter: Record<string, unknown> = {
    ...buildSearchFilter(query.search, searchFields),
  };
  if (query.trashOnly) filter.isDeleted = true;
  else if (!query.includeTrash) filter.isDeleted = { $ne: true };
  if (query.status) filter.status = query.status;

  const findQuery = Model.find(filter).sort(sort).skip(skip).limit(limit);
  const countQuery = Model.countDocuments(filter);
  if (query.trashOnly || query.includeTrash) {
    findQuery.setOptions({ includeDeleted: true });
    countQuery.setOptions({ includeDeleted: true });
  }
  const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);
  return { docs, meta: buildPaginationMeta(total, page, limit) };
}

export class StickyCtaService {
  async list(query: ListQuery) {
    const { docs, meta } = await listEntity(StickyCtaCampaign, query, ['name']);
    return { items: docs.map(mapSticky), meta };
  }

  async getById(id: string) {
    const doc = await StickyCtaCampaign.findById(id);
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    return mapSticky(doc);
  }

  async listPublishedForContext(context: DisplayContext, limit = 3) {
    const docs = await StickyCtaCampaign.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .sort({ priority: -1 })
      .limit(50)
      .exec();

    const matched = docs.filter(
      (doc) =>
        matchesDisplayRules(doc.displayRules, context) &&
        matchesDeviceVisibility(context, doc),
    );
    return sortByPriorityDesc(matched).slice(0, limit).map(mapSticky);
  }

  async create(dto: StickyDto, userId: string) {
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');
    const doc = await StickyCtaCampaign.create({
      name: dto.name,
      placement: dto.placement ?? CtaPlacement.STICKY_BAR,
      position: dto.position ?? WidgetPosition.BOTTOM_BAR,
      ctaAction: buildCtaAction(dto.ctaAction, CtaActionType.LINK),
      showOnMobile: dto.showOnMobile ?? true,
      showOnDesktop: dto.showOnDesktop ?? true,
      displayRules: dto.displayRules,
      frequencyControl: defaultFrequency(dto.frequencyControl),
      priority: dto.priority ?? dto.displayRules?.priority ?? 0,
      campaignId: toObjectId(dto.campaignId),
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return mapSticky(doc);
  }

  async update(id: string, dto: Partial<StickyDto>, userId: string) {
    const doc = await StickyCtaCampaign.findById(id);
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.placement !== undefined) doc.placement = dto.placement;
    if (dto.position !== undefined) doc.position = dto.position;
    if (dto.showOnMobile !== undefined) doc.showOnMobile = dto.showOnMobile;
    if (dto.showOnDesktop !== undefined) doc.showOnDesktop = dto.showOnDesktop;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.campaignId !== undefined) doc.campaignId = toObjectId(dto.campaignId) ?? null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.displayRules !== undefined) doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    if (dto.frequencyControl !== undefined) {
      doc.frequencyControl = { ...doc.frequencyControl, ...dto.frequencyControl };
    }
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = patchCtaAction(doc.ctaAction, dto.ctaAction, CtaActionType.LINK);
    }
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSticky(doc);
  }

  async softDelete(id: string, userId: string) {
    const doc = await StickyCtaCampaign.findById(id);
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string) {
    const doc = await StickyCtaCampaign.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSticky(doc);
  }

  async publish(id: string, userId: string) {
    const doc = await StickyCtaCampaign.findById(id);
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSticky(doc);
  }

  async unpublish(id: string, userId: string) {
    const doc = await StickyCtaCampaign.findById(id);
    if (!doc) throw new NotFoundError('Sticky CTA not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapSticky(doc);
  }
}

export class FloatingCtaService {
  async list(query: ListQuery) {
    const { docs, meta } = await listEntity(FloatingCta, query, ['name']);
    return { items: docs.map(mapFloating), meta };
  }

  async getById(id: string) {
    const doc = await FloatingCta.findById(id);
    if (!doc) throw new NotFoundError('Floating CTA not found');
    return mapFloating(doc);
  }

  async listPublishedForContext(context: DisplayContext, limit = 3) {
    const docs = await FloatingCta.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .sort({ priority: -1 })
      .limit(50)
      .exec();

    const matched = docs.filter(
      (doc) =>
        matchesDisplayRules(doc.displayRules, context) &&
        matchesDeviceVisibility(context, doc),
    );
    return sortByPriorityDesc(matched).slice(0, limit).map(mapFloating);
  }

  async create(dto: FloatingDto, userId: string) {
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');
    const doc = await FloatingCta.create({
      name: dto.name,
      position: dto.position ?? WidgetPosition.BOTTOM_RIGHT,
      ctaAction: buildCtaAction(dto.ctaAction, CtaActionType.LINK),
      showOnMobile: dto.showOnMobile ?? true,
      showOnDesktop: dto.showOnDesktop ?? true,
      displayRules: dto.displayRules,
      frequencyControl: defaultFrequency(dto.frequencyControl),
      priority: dto.priority ?? dto.displayRules?.priority ?? 0,
      campaignId: toObjectId(dto.campaignId),
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return mapFloating(doc);
  }

  async update(id: string, dto: Partial<FloatingDto>, userId: string) {
    const doc = await FloatingCta.findById(id);
    if (!doc) throw new NotFoundError('Floating CTA not found');
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.position !== undefined) doc.position = dto.position;
    if (dto.showOnMobile !== undefined) doc.showOnMobile = dto.showOnMobile;
    if (dto.showOnDesktop !== undefined) doc.showOnDesktop = dto.showOnDesktop;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.campaignId !== undefined) doc.campaignId = toObjectId(dto.campaignId) ?? null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.displayRules !== undefined) doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    if (dto.frequencyControl !== undefined) {
      doc.frequencyControl = { ...doc.frequencyControl, ...dto.frequencyControl };
    }
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = patchCtaAction(doc.ctaAction, dto.ctaAction, CtaActionType.LINK);
    }
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapFloating(doc);
  }

  async softDelete(id: string, userId: string) {
    const doc = await FloatingCta.findById(id);
    if (!doc) throw new NotFoundError('Floating CTA not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string) {
    const doc = await FloatingCta.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Floating CTA not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapFloating(doc);
  }

  async publish(id: string, userId: string) {
    const doc = await FloatingCta.findById(id);
    if (!doc) throw new NotFoundError('Floating CTA not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapFloating(doc);
  }

  async unpublish(id: string, userId: string) {
    const doc = await FloatingCta.findById(id);
    if (!doc) throw new NotFoundError('Floating CTA not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapFloating(doc);
  }
}

export class ContactWidgetService {
  async list(query: ListQuery) {
    const { docs, meta } = await listEntity(ContactWidget, query, ['name', 'headline', 'phone']);
    return { items: docs.map(mapContact), meta };
  }

  async getById(id: string) {
    const doc = await ContactWidget.findById(id);
    if (!doc) throw new NotFoundError('Contact widget not found');
    return mapContact(doc);
  }

  async getPublishedForContext(context: DisplayContext) {
    const docs = await ContactWidget.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .sort({ priority: -1 })
      .limit(20)
      .exec();

    const matched = docs.filter((doc) => matchesDisplayRules(doc.displayRules, context));
    const top = sortByPriorityDesc(matched)[0];
    return top ? mapContact(top) : null;
  }

  async create(dto: ContactDto, userId: string) {
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');
    const doc = await ContactWidget.create({
      name: dto.name,
      position: dto.position ?? WidgetPosition.BOTTOM_LEFT,
      headline: dto.headline,
      body: dto.body,
      phone: dto.phone,
      hoursNote: dto.hoursNote,
      ctaAction: buildCtaAction(dto.ctaAction, CtaActionType.CALL),
      displayRules: dto.displayRules,
      priority: dto.priority ?? dto.displayRules?.priority ?? 0,
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return mapContact(doc);
  }

  async update(id: string, dto: Partial<ContactDto>, userId: string) {
    const doc = await ContactWidget.findById(id);
    if (!doc) throw new NotFoundError('Contact widget not found');
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.position !== undefined) doc.position = dto.position;
    if (dto.headline !== undefined) doc.headline = dto.headline;
    if (dto.body !== undefined) doc.body = dto.body;
    if (dto.phone !== undefined) doc.phone = dto.phone;
    if (dto.hoursNote !== undefined) doc.hoursNote = dto.hoursNote;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.displayRules !== undefined) doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = patchCtaAction(doc.ctaAction, dto.ctaAction, CtaActionType.CALL);
    }
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapContact(doc);
  }

  async softDelete(id: string, userId: string) {
    const doc = await ContactWidget.findById(id);
    if (!doc) throw new NotFoundError('Contact widget not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string) {
    const doc = await ContactWidget.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('Contact widget not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapContact(doc);
  }

  async publish(id: string, userId: string) {
    const doc = await ContactWidget.findById(id);
    if (!doc) throw new NotFoundError('Contact widget not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapContact(doc);
  }

  async unpublish(id: string, userId: string) {
    const doc = await ContactWidget.findById(id);
    if (!doc) throw new NotFoundError('Contact widget not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapContact(doc);
  }
}

export class WhatsAppWidgetService {
  async list(query: ListQuery) {
    const { docs, meta } = await listEntity(WhatsAppWidget, query, [
      'name',
      'headline',
      'whatsappNumber',
    ]);
    return { items: docs.map(mapWhatsApp), meta };
  }

  async getById(id: string) {
    const doc = await WhatsAppWidget.findById(id);
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    return mapWhatsApp(doc);
  }

  async getPublishedForContext(context: DisplayContext) {
    const docs = await WhatsAppWidget.find({
      status: EntityStatus.PUBLISHED,
      isDeleted: { $ne: true },
    })
      .sort({ priority: -1 })
      .limit(20)
      .exec();

    const matched = docs.filter((doc) => matchesDisplayRules(doc.displayRules, context));
    const top = sortByPriorityDesc(matched)[0];
    return top ? mapWhatsApp(top) : null;
  }

  async create(dto: WhatsAppDto, userId: string) {
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');
    if (!dto.whatsappNumber?.trim()) throw new BadRequestError('WhatsApp number is required');
    const doc = await WhatsAppWidget.create({
      name: dto.name,
      position: dto.position ?? WidgetPosition.BOTTOM_RIGHT,
      headline: dto.headline,
      prefilledMessage: dto.prefilledMessage,
      whatsappNumber: dto.whatsappNumber,
      hoursNote: dto.hoursNote,
      ctaAction: buildCtaAction(
        {
          ...dto.ctaAction,
          whatsappNumber: dto.ctaAction?.whatsappNumber ?? dto.whatsappNumber,
        },
        CtaActionType.WHATSAPP,
      ),
      displayRules: dto.displayRules,
      priority: dto.priority ?? dto.displayRules?.priority ?? 0,
      status: dto.status ?? EntityStatus.DRAFT,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    return mapWhatsApp(doc);
  }

  async update(id: string, dto: Partial<WhatsAppDto>, userId: string) {
    const doc = await WhatsAppWidget.findById(id);
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.position !== undefined) doc.position = dto.position;
    if (dto.headline !== undefined) doc.headline = dto.headline;
    if (dto.prefilledMessage !== undefined) doc.prefilledMessage = dto.prefilledMessage;
    if (dto.whatsappNumber !== undefined) doc.whatsappNumber = dto.whatsappNumber;
    if (dto.hoursNote !== undefined) doc.hoursNote = dto.hoursNote;
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.displayRules !== undefined) doc.displayRules = mergeDisplayRules(doc.displayRules, dto.displayRules);
    if (dto.ctaAction !== undefined) {
      doc.ctaAction = patchCtaAction(doc.ctaAction, dto.ctaAction, CtaActionType.WHATSAPP);
    }
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapWhatsApp(doc);
  }

  async softDelete(id: string, userId: string) {
    const doc = await WhatsAppWidget.findById(id);
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = EntityStatus.DELETED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
  }

  async restore(id: string, userId: string) {
    const doc = await WhatsAppWidget.findById(id).setOptions({ includeDeleted: true });
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapWhatsApp(doc);
  }

  async publish(id: string, userId: string) {
    const doc = await WhatsAppWidget.findById(id);
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    doc.status = EntityStatus.PUBLISHED;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapWhatsApp(doc);
  }

  async unpublish(id: string, userId: string) {
    const doc = await WhatsAppWidget.findById(id);
    if (!doc) throw new NotFoundError('WhatsApp widget not found');
    doc.status = EntityStatus.DRAFT;
    doc.updatedBy = new Types.ObjectId(userId);
    await doc.save();
    return mapWhatsApp(doc);
  }
}

export class PublicWidgetsService {
  constructor(
    private readonly sticky = new StickyCtaService(),
    private readonly floating = new FloatingCtaService(),
    private readonly contact = new ContactWidgetService(),
    private readonly whatsapp = new WhatsAppWidgetService(),
  ) {}

  async getBundle(context: DisplayContext): Promise<PublicWidgetsBundle> {
    const [sticky, floating, contact, whatsapp] = await Promise.all([
      this.sticky.listPublishedForContext(context, 2),
      this.floating.listPublishedForContext(context, 3),
      this.contact.getPublishedForContext(context),
      this.whatsapp.getPublishedForContext(context),
    ]);
    return { sticky, floating, contact, whatsapp };
  }
}

export const stickyCtaService = new StickyCtaService();
export const floatingCtaService = new FloatingCtaService();
export const contactWidgetService = new ContactWidgetService();
export const whatsappWidgetService = new WhatsAppWidgetService();
export const publicWidgetsService = new PublicWidgetsService(
  stickyCtaService,
  floatingCtaService,
  contactWidgetService,
  whatsappWidgetService,
);
