import { Types, type UpdateQuery } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { LeadActivityType, LeadStatus } from '@core/constants/leads';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { Lead } from '@modules/leads/model/lead.model';
import { User } from '@modules/users/model/user.model';
import {
  AgencyClient,
  AgencyClientStatus,
  AgencyClientType,
  IAgencyClient,
  IClientActivityEntry,
  IClientAttachment,
  IClientBillingPreferences,
  IClientContactPerson,
  IClientAddress,
} from '../model/client.model';
import { allocateAgencyDocumentCode } from './number-sequence.service';
import { activityService } from '@modules/agency/activity/service/activity.service';

type ClientFilter = Record<string, unknown>;

export type ClientAttachmentInput = {
  mediaId?: string | null;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateClientDto = {
  clientType?: AgencyClientType;
  name: string;
  legalName?: string;
  email?: string;
  emails?: string[];
  phone?: string;
  phones?: string[];
  contactPersons?: IClientContactPerson[];
  billingAddress?: IClientAddress;
  taxId?: string;
  status?: AgencyClientStatus;
  source?: string;
  assignedAccountManagerId?: string | null;
  tags?: string[];
  notes?: string;
  paymentTermsDays?: number;
  defaultCurrency?: CurrencyCode;
  billingPreferences?: IClientBillingPreferences;
  attachments?: ClientAttachmentInput[];
  sourceLeadId?: string | null;
};

export type UpdateClientDto = Partial<CreateClientDto>;

export type ListClientsQuery = PaginationQuery & {
  search?: string;
  status?: AgencyClientStatus;
  clientType?: AgencyClientType;
  source?: string;
  assignedAccountManagerId?: string;
  tag?: string;
  isActive?: boolean;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

export type ConvertLeadOptions = {
  clientType?: AgencyClientType;
  name?: string;
  legalName?: string;
  assignedAccountManagerId?: string | null;
  tags?: string[];
  notes?: string;
  paymentTermsDays?: number;
  defaultCurrency?: CurrencyCode;
};

export type ClientActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type AgencyClientResponse = {
  id: string;
  code: string;
  clientType: AgencyClientType;
  name: string;
  legalName?: string;
  email?: string;
  emails: string[];
  phone?: string;
  phones: string[];
  contactPersons: IClientContactPerson[];
  billingAddress?: IClientAddress;
  taxId?: string;
  status: AgencyClientStatus;
  isActive: boolean;
  source?: string;
  sourceLeadId?: string | null;
  assignedAccountManagerId?: string | null;
  assignedAccountManagerName?: string;
  tags: string[];
  notes?: string;
  paymentTermsDays: number;
  defaultCurrency: CurrencyCode;
  billingPreferences: IClientBillingPreferences;
  attachments: Array<{
    id?: string;
    mediaId?: string | null;
    url: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    uploadedAt: string;
    uploadedBy?: string | null;
  }>;
  activityLog: Array<{
    id?: string;
    type: string;
    message: string;
    meta?: Record<string, unknown>;
    createdBy?: string | null;
    createdByName?: string;
    createdAt: string;
  }>;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeEmail(value?: string | null): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}

function uniqueStrings(values: string[] | undefined, normalize?: (v: string) => string): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = normalize ? normalize(raw) : raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function statusToIsActive(status: AgencyClientStatus): boolean {
  return status === 'active';
}

export class ClientService {
  private toResponse(
    client: IAgencyClient,
    managerName?: string,
  ): AgencyClientResponse {
    return {
      id: client.id,
      code: client.code,
      clientType: client.clientType,
      name: client.name,
      legalName: client.legalName,
      email: client.email,
      emails: client.emails ?? [],
      phone: client.phone,
      phones: client.phones ?? [],
      contactPersons: client.contactPersons ?? [],
      billingAddress: client.billingAddress,
      taxId: client.taxId,
      status: client.status,
      isActive: client.isActive,
      source: client.source,
      sourceLeadId: client.sourceLeadId ? String(client.sourceLeadId) : null,
      assignedAccountManagerId: client.assignedAccountManagerId
        ? String(client.assignedAccountManagerId)
        : null,
      assignedAccountManagerName: managerName,
      tags: client.tags ?? [],
      notes: client.notes,
      paymentTermsDays: client.paymentTermsDays ?? 15,
      defaultCurrency: (client.defaultCurrency as CurrencyCode) ?? DEFAULT_AGENCY_CURRENCY,
      billingPreferences: client.billingPreferences ?? {},
      attachments: (client.attachments ?? []).map((item) => {
        const withId = item as IClientAttachment & { _id?: Types.ObjectId; id?: string };
        return {
          id: withId.id ? String(withId.id) : withId._id ? String(withId._id) : undefined,
          mediaId: item.mediaId ? String(item.mediaId) : null,
          url: item.url,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          uploadedAt: item.uploadedAt?.toISOString?.() ?? new Date(item.uploadedAt).toISOString(),
          uploadedBy: item.uploadedBy ? String(item.uploadedBy) : null,
        };
      }),
      activityLog: (client.activityLog ?? [])
        .slice()
        .reverse()
        .map((entry) => {
          const withId = entry as IClientActivityEntry & { _id?: Types.ObjectId; id?: string };
          return {
            id: withId.id ? String(withId.id) : withId._id ? String(withId._id) : undefined,
            type: entry.type,
            message: entry.message,
            meta: entry.meta,
            createdBy: entry.createdBy ? String(entry.createdBy) : null,
            createdByName: entry.createdByName,
            createdAt: entry.createdAt?.toISOString?.() ?? new Date(entry.createdAt).toISOString(),
          };
        }),
      isDeleted: client.isDeleted,
      deletedAt: client.deletedAt?.toISOString(),
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  private async resolveManagerName(managerId?: string | null): Promise<string | undefined> {
    if (!managerId) return undefined;
    const user = await User.findById(managerId).select('firstName lastName email').exec();
    if (!user) return undefined;
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  private buildActivity(
    type: string,
    message: string,
    actor: ClientActor,
    meta?: Record<string, unknown>,
  ): IClientActivityEntry {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyClient> {
    const query = AgencyClient.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const client = await query.exec();
    if (!client) throw new NotFoundError('Client');
    return client;
  }

  private assertScope(client: IAgencyClient, actor: ClientActor): void {
    const isPrivileged =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MANAGER;
    if (isPrivileged) return;

    if (
      client.assignedAccountManagerId &&
      String(client.assignedAccountManagerId) !== actor.id
    ) {
      throw new NotFoundError('Client');
    }
  }

  private applyActorScopeFilter(filter: ClientFilter, actor: ClientActor): ClientFilter {
    const isPrivileged =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MANAGER;
    if (isPrivileged) return filter;
    return {
      ...filter,
      $or: [
        { assignedAccountManagerId: actor.id },
        { assignedAccountManagerId: null },
        { assignedAccountManagerId: { $exists: false } },
      ],
    };
  }

  private async assertUniqueEmail(email: string | undefined, excludeId?: string): Promise<void> {
    if (!email) return;
    const filter: ClientFilter = {
      email,
      isDeleted: { $ne: true },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await AgencyClient.findOne(filter).exec();
    if (existing) {
      throw new ConflictError('A client with this email already exists');
    }
  }

  private async assertUniqueTaxId(taxId: string | undefined, excludeId?: string): Promise<void> {
    if (!taxId?.trim()) return;
    const normalized = taxId.trim().toUpperCase();
    const filter: ClientFilter = {
      taxId: normalized,
      isDeleted: { $ne: true },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await AgencyClient.findOne(filter).exec();
    if (existing) {
      throw new ConflictError('A client with this tax ID already exists');
    }
  }

  private async assertManagerExists(managerId?: string | null): Promise<void> {
    if (!managerId) return;
    const user = await User.findById(managerId).exec();
    if (!user || user.isDeleted) throw new BadRequestError('Assigned account manager not found');
  }

  private mapAttachments(
    attachments: ClientAttachmentInput[] | undefined,
    actorId: string,
  ): IClientAttachment[] {
    if (!attachments?.length) return [];
    return attachments.map((item) => ({
      mediaId: item.mediaId ? new Types.ObjectId(item.mediaId) : null,
      url: item.url,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(actorId),
    }));
  }

  private normalizeDto(dto: CreateClientDto | UpdateClientDto) {
    const email = normalizeEmail(dto.email);
    const emails = uniqueStrings(dto.emails, (v) => v.trim().toLowerCase());
    if (email && !emails.includes(email)) emails.unshift(email);

    const phone = dto.phone?.trim() || undefined;
    const phones = uniqueStrings(dto.phones);
    if (phone && !phones.includes(phone)) phones.unshift(phone);

    const contactPersons = (dto.contactPersons ?? []).map((person) => ({
      ...person,
      email: normalizeEmail(person.email) || undefined,
      phone: person.phone?.trim() || undefined,
      role: person.role?.trim() || undefined,
      name: person.name.trim(),
    }));

    return {
      email,
      emails,
      phone,
      phones,
      contactPersons,
      taxId: dto.taxId?.trim().toUpperCase() || undefined,
      tags: uniqueStrings(dto.tags),
      legalName: dto.legalName?.trim() || undefined,
      notes: dto.notes?.trim() || undefined,
      source: dto.source?.trim() || undefined,
      name: dto.name?.trim(),
    };
  }

  async list(
    query: ListClientsQuery,
    actor: ClientActor,
  ): Promise<{ items: AgencyClientResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'createdAt',
      order: query.order ?? 'desc',
    });

    let filter: ClientFilter = {
      ...buildSearchFilter(query.search, ['name', 'legalName', 'email', 'code', 'phone', 'notes']),
    };

    if (query.trashOnly) filter.isDeleted = true;
    else if (!query.includeTrash) filter.isDeleted = { $ne: true };

    if (query.status) filter.status = query.status;
    if (query.clientType) filter.clientType = query.clientType;
    if (query.source) filter.source = query.source;
    if (query.assignedAccountManagerId) {
      filter.assignedAccountManagerId = query.assignedAccountManagerId;
    }
    if (query.tag) filter.tags = query.tag;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    filter = this.applyActorScopeFilter(filter, actor);

    const findQuery = AgencyClient.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyClient.countDocuments(filter);
    if (query.trashOnly || query.includeTrash) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [items, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    const managerIds = [
      ...new Set(
        items
          .map((item) =>
            item.assignedAccountManagerId ? String(item.assignedAccountManagerId) : null,
          )
          .filter(Boolean),
      ),
    ] as string[];

    const managers = managerIds.length
      ? await User.find({ _id: { $in: managerIds } })
          .select('firstName lastName email')
          .exec()
      : [];
    const managerNameById = new Map(
      managers.map((user) => [
        user.id,
        `${user.firstName} ${user.lastName}`.trim() || user.email,
      ]),
    );

    return {
      items: items.map((item) =>
        this.toResponse(
          item,
          item.assignedAccountManagerId
            ? managerNameById.get(String(item.assignedAccountManagerId))
            : undefined,
        ),
      ),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string, actor: ClientActor): Promise<AgencyClientResponse> {
    const client = await this.getOrThrow(id);
    this.assertScope(client, actor);
    const managerName = await this.resolveManagerName(
      client.assignedAccountManagerId ? String(client.assignedAccountManagerId) : null,
    );
    return this.toResponse(client, managerName);
  }

  async create(dto: CreateClientDto, actor: ClientActor): Promise<AgencyClientResponse> {
    const normalized = this.normalizeDto(dto);
    if (!normalized.name) throw new BadRequestError('Client name is required');

    await this.assertUniqueEmail(normalized.email);
    await this.assertUniqueTaxId(normalized.taxId);
    await this.assertManagerExists(dto.assignedAccountManagerId);

    const status = dto.status ?? 'active';
    const code = await allocateAgencyDocumentCode('client');

    const client = await AgencyClient.create({
      code,
      clientType: dto.clientType ?? 'company',
      name: normalized.name,
      legalName: normalized.legalName,
      email: normalized.email,
      emails: normalized.emails,
      phone: normalized.phone,
      phones: normalized.phones,
      contactPersons: normalized.contactPersons,
      billingAddress: dto.billingAddress,
      taxId: normalized.taxId,
      status,
      isActive: statusToIsActive(status),
      source: normalized.source ?? (dto.sourceLeadId ? 'lead_conversion' : 'manual'),
      sourceLeadId: dto.sourceLeadId || null,
      assignedAccountManagerId: dto.assignedAccountManagerId || null,
      tags: normalized.tags,
      notes: normalized.notes,
      paymentTermsDays: dto.paymentTermsDays ?? 15,
      defaultCurrency: dto.defaultCurrency ?? DEFAULT_AGENCY_CURRENCY,
      billingPreferences: dto.billingPreferences ?? { preferEmailInvoice: true },
      attachments: this.mapAttachments(dto.attachments, actor.id),
      activityLog: [
        this.buildActivity('created', 'Client created', actor, {
          code,
          sourceLeadId: dto.sourceLeadId ?? null,
        }),
      ],
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    loggers.admin.info('Agency client created', { id: client.id, code, actorId: actor.id });
    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'client_created',
      entityType: 'client',
      entityId: client.id,
      entityCode: code,
      clientId: client.id,
      message: `Client created: ${client.name}`,
    });
    return this.toResponse(client);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    actor: ClientActor,
  ): Promise<AgencyClientResponse> {
    const existing = await this.getOrThrow(id);
    this.assertScope(existing, actor);
    if (existing.isDeleted) throw new BadRequestError('Cannot update a client in trash');

    const normalized = this.normalizeDto({ ...dto, name: dto.name ?? existing.name });
    if (dto.email !== undefined || dto.emails !== undefined) {
      await this.assertUniqueEmail(normalized.email, id);
    }
    if (dto.taxId !== undefined) {
      await this.assertUniqueTaxId(normalized.taxId, id);
    }
    if (dto.assignedAccountManagerId !== undefined) {
      await this.assertManagerExists(dto.assignedAccountManagerId);
    }

    const nextStatus = dto.status ?? existing.status;
    const changes: string[] = [];
    if (dto.status && dto.status !== existing.status) changes.push(`status→${dto.status}`);
    if (dto.name && dto.name !== existing.name) changes.push('name');
    if (dto.assignedAccountManagerId !== undefined) changes.push('account manager');

    const updateData: Record<string, unknown> = {
      updatedBy: actor.id,
    };

    if (dto.clientType !== undefined) updateData.clientType = dto.clientType;
    if (dto.name !== undefined) updateData.name = normalized.name;
    if (dto.legalName !== undefined) updateData.legalName = normalized.legalName;
    if (dto.email !== undefined || dto.emails !== undefined) {
      updateData.email = normalized.email;
      updateData.emails = normalized.emails;
    }
    if (dto.phone !== undefined || dto.phones !== undefined) {
      updateData.phone = normalized.phone;
      updateData.phones = normalized.phones;
    }
    if (dto.contactPersons !== undefined) updateData.contactPersons = normalized.contactPersons;
    if (dto.billingAddress !== undefined) updateData.billingAddress = dto.billingAddress;
    if (dto.taxId !== undefined) updateData.taxId = normalized.taxId;
    if (dto.status !== undefined) {
      updateData.status = nextStatus;
      updateData.isActive = statusToIsActive(nextStatus);
    }
    if (dto.source !== undefined) updateData.source = normalized.source;
    if (dto.assignedAccountManagerId !== undefined) {
      updateData.assignedAccountManagerId = dto.assignedAccountManagerId || null;
    }
    if (dto.tags !== undefined) updateData.tags = normalized.tags;
    if (dto.notes !== undefined) updateData.notes = normalized.notes;
    if (dto.paymentTermsDays !== undefined) updateData.paymentTermsDays = dto.paymentTermsDays;
    if (dto.defaultCurrency !== undefined) updateData.defaultCurrency = dto.defaultCurrency;
    if (dto.billingPreferences !== undefined) {
      updateData.billingPreferences = dto.billingPreferences;
    }
    if (dto.attachments !== undefined) {
      updateData.attachments = this.mapAttachments(dto.attachments, actor.id);
    }

    if (changes.length) {
      updateData.$push = {
        activityLog: this.buildActivity(
          dto.status && dto.status !== existing.status ? 'status_changed' : 'updated',
          changes.length ? `Client updated (${changes.join(', ')})` : 'Client updated',
          actor,
          { changes },
        ),
      };
    }

    const updated = await AgencyClient.findByIdAndUpdate(
      id,
      updateData as UpdateQuery<IAgencyClient>,
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundError('Client');

    loggers.admin.info('Agency client updated', { id, actorId: actor.id });
    if (changes.length) {
      await activityService.record({
        actor: { id: actor.id, fullName: actor.fullName },
        action: dto.status && dto.status !== existing.status ? 'client_status_changed' : 'client_updated',
        entityType: 'client',
        entityId: id,
        entityCode: updated.code,
        clientId: id,
        message: `Client updated (${changes.join(', ')})`,
        meta: { changes },
      });
    }
    const managerName = await this.resolveManagerName(
      updated.assignedAccountManagerId ? String(updated.assignedAccountManagerId) : null,
    );
    return this.toResponse(updated, managerName);
  }

  async archive(id: string, actor: ClientActor): Promise<AgencyClientResponse> {
    return this.update(id, { status: 'archived' }, actor);
  }

  async softDelete(id: string, actor: ClientActor): Promise<void> {
    const client = await this.getOrThrow(id);
    this.assertScope(client, actor);
    if (client.isDeleted) throw new BadRequestError('Client is already in trash');

    await AgencyClient.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: actor.id,
      $push: {
        activityLog: this.buildActivity('archived', 'Client moved to trash', actor),
      },
    }).exec();

    loggers.admin.info('Agency client moved to trash', { id, actorId: actor.id });
  }

  async restore(id: string, actor: ClientActor): Promise<AgencyClientResponse> {
    const client = await this.getOrThrow(id, true);
    this.assertScope(client, actor);
    if (!client.isDeleted) throw new BadRequestError('Client is not in trash');

    const restored = await AgencyClient.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        updatedBy: actor.id,
        $push: {
          activityLog: this.buildActivity('restored', 'Client restored from trash', actor),
        },
      },
      { new: true },
    )
      .setOptions({ includeDeleted: true })
      .exec();

    if (!restored) throw new NotFoundError('Client');
    loggers.admin.info('Agency client restored', { id, actorId: actor.id });
    return this.toResponse(restored);
  }

  async addNote(id: string, note: string, actor: ClientActor): Promise<AgencyClientResponse> {
    const client = await this.getOrThrow(id);
    this.assertScope(client, actor);
    if (client.isDeleted) throw new BadRequestError('Cannot note a client in trash');

    const updated = await AgencyClient.findByIdAndUpdate(
      id,
      {
        updatedBy: actor.id,
        $push: {
          activityLog: this.buildActivity('note_added', note, actor),
        },
      },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundError('Client');
    return this.toResponse(updated);
  }

  async convertFromLead(
    leadId: string,
    options: ConvertLeadOptions,
    actor: ClientActor,
  ): Promise<AgencyClientResponse> {
    const lead = await Lead.findById(leadId).exec();
    if (!lead || lead.isDeleted) throw new NotFoundError('Lead');

    if (lead.convertedClientId) {
      const existing = await AgencyClient.findById(lead.convertedClientId).exec();
      if (existing && !existing.isDeleted) {
        throw new ConflictError(
          `This lead is already converted to client ${existing.code} (${existing.id})`,
        );
      }
    }

    const email = normalizeEmail(lead.email);
    if (email) {
      const duplicate = await AgencyClient.findOne({
        email,
        isDeleted: { $ne: true },
      }).exec();
      if (duplicate) {
        throw new ConflictError(
          `A client with this lead email already exists (${duplicate.code})`,
        );
      }
    }

    const clientType: AgencyClientType =
      options.clientType ?? (lead.businessName ? 'company' : 'individual');
    const name =
      options.name?.trim() ||
      lead.businessName?.trim() ||
      lead.name?.trim() ||
      email ||
      'Untitled client';

    const client = await this.create(
      {
        clientType,
        name,
        legalName: options.legalName ?? lead.businessName,
        email,
        phone: lead.phone || lead.whatsapp,
        notes:
          options.notes ??
          ([lead.message, lead.notes].filter(Boolean).join('\n\n') || undefined),
        source: 'lead_conversion',
        sourceLeadId: lead.id,
        assignedAccountManagerId:
          options.assignedAccountManagerId ??
          (lead.assignedTo ? String(lead.assignedTo) : null),
        tags: options.tags,
        paymentTermsDays: options.paymentTermsDays,
        defaultCurrency: options.defaultCurrency,
        status: 'active',
        contactPersons:
          lead.name || lead.email || lead.phone
            ? [
                {
                  name: lead.name || name,
                  email: lead.email,
                  phone: lead.phone || lead.whatsapp,
                  role: 'Primary contact',
                  isPrimary: true,
                },
              ]
            : [],
        billingAddress: lead.city
          ? {
              city: lead.city,
              country: 'India',
            }
          : undefined,
      },
      actor,
    );

    lead.convertedClientId = client.id as unknown as typeof lead.convertedClientId;
    if (lead.status !== LeadStatus.WON) {
      lead.status = LeadStatus.WON;
    }
    lead.activityLog.push({
      type: LeadActivityType.CONVERTED_TO_CLIENT,
      message: `Converted to client ${client.code}`,
      meta: { clientId: client.id, clientCode: client.code },
      createdBy: actor.id as unknown as never,
      createdByName: actor.fullName,
      createdAt: new Date(),
    });
    lead.updatedBy = actor.id as unknown as typeof lead.updatedBy;
    await lead.save();

    loggers.admin.info('Lead converted to agency client', {
      leadId,
      clientId: client.id,
      actorId: actor.id,
    });

    return client;
  }
}

export const clientService = new ClientService();
