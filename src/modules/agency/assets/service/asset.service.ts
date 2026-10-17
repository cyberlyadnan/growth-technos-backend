import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { buildPaginationMeta, buildSearchFilter, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { UserRole } from '@core/constants';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { activityService } from '@modules/agency/activity/service/activity.service';
import {
  AgencyAsset,
  AssetOwnership,
  AssetStatus,
  AssetType,
  IAgencyAsset,
  IAssetActivity,
  PaymentResponsibility,
  RenewalCycle,
} from '../model/asset.model';

type Filter = Record<string, unknown>;

export type AssetActor = {
  id: string;
  role: UserRole | string;
  fullName?: string;
};

export type CreateAssetDto = {
  clientId: string;
  projectId?: string | null;
  assetType: AssetType;
  provider: string;
  accountName: string;
  urlOrIdentifier?: string;
  ownership: AssetOwnership;
  responsiblePerson?: string;
  registrationDate?: Date;
  expiryDate?: Date;
  sslExpiryDate?: Date;
  maintenanceAgreementDate?: Date;
  renewalCycle?: RenewalCycle;
  expectedCostMinor?: number;
  actualCostMinor?: number;
  clientChargeMinor?: number;
  currency?: CurrencyCode;
  paymentResponsibility?: PaymentResponsibility;
  status?: AssetStatus;
  notes?: string;
};

export type UpdateAssetDto = Partial<CreateAssetDto>;

export type ListAssetsQuery = PaginationQuery & {
  search?: string;
  clientId?: string;
  projectId?: string;
  assetType?: AssetType;
  ownership?: AssetOwnership;
  status?: AssetStatus;
  expiringBefore?: Date;
  trashOnly?: boolean;
};

function deriveStatus(expiryDate?: Date | null, current?: AssetStatus): AssetStatus {
  if (current === 'cancelled' || current === 'archived') return current;
  if (!expiryDate) return current ?? 'active';
  const now = Date.now();
  const exp = expiryDate.getTime();
  if (exp < now) return 'expired';
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (exp - now <= thirtyDays) return 'expiring_soon';
  return 'active';
}

export class AssetService {
  private buildActivity(
    type: string,
    message: string,
    actor: AssetActor,
    meta?: Record<string, unknown>,
  ): IAssetActivity {
    return {
      type,
      message,
      meta,
      createdBy: new Types.ObjectId(actor.id),
      createdByName: actor.fullName,
      createdAt: new Date(),
    };
  }

  private async getOrThrow(id: string, includeDeleted = false): Promise<IAgencyAsset> {
    const query = AgencyAsset.findById(id);
    if (includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query.exec();
    if (!doc) throw new NotFoundError('Asset');
    return doc;
  }

  private async assertClient(clientId: string) {
    const client = await AgencyClient.findById(clientId).exec();
    if (!client || client.isDeleted) throw new BadRequestError('Client not found');
    return client;
  }

  private async assertProject(projectId?: string | null, clientId?: string) {
    if (!projectId) return null;
    const project = await AgencyProject.findById(projectId).exec();
    if (!project || project.isDeleted) throw new BadRequestError('Project not found');
    if (clientId && String(project.clientId) !== clientId) {
      throw new BadRequestError('Project does not belong to the selected client');
    }
    return project;
  }

  private toResponse(doc: IAgencyAsset, extras?: { clientName?: string; projectName?: string }) {
    return {
      id: doc.id,
      code: doc.code,
      clientId: String(doc.clientId),
      clientName: extras?.clientName,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: extras?.projectName,
      assetType: doc.assetType,
      provider: doc.provider,
      accountName: doc.accountName,
      urlOrIdentifier: doc.urlOrIdentifier,
      ownership: doc.ownership,
      responsiblePerson: doc.responsiblePerson,
      registrationDate: doc.registrationDate?.toISOString(),
      expiryDate: doc.expiryDate?.toISOString(),
      sslExpiryDate: doc.sslExpiryDate?.toISOString(),
      maintenanceAgreementDate: doc.maintenanceAgreementDate?.toISOString(),
      renewalCycle: doc.renewalCycle,
      expectedCostMinor: doc.expectedCostMinor,
      actualCostMinor: doc.actualCostMinor,
      clientChargeMinor: doc.clientChargeMinor,
      currency: doc.currency,
      paymentResponsibility: doc.paymentResponsibility,
      status: doc.status,
      notes: doc.notes,
      activityLog: (doc.activityLog ?? []).map((a) => ({
        id: String((a as { _id?: Types.ObjectId })._id ?? ''),
        type: a.type,
        message: a.message,
        createdByName: a.createdByName,
        createdAt: a.createdAt.toISOString(),
      })),
      isActive: doc.isActive,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private async resolveNames(doc: IAgencyAsset) {
    const [client, project] = await Promise.all([
      AgencyClient.findById(doc.clientId).select('name').exec(),
      doc.projectId ? AgencyProject.findById(doc.projectId).select('name').exec() : null,
    ]);
    return {
      clientName: client?.name,
      projectName: project?.name,
    };
  }

  async list(
    query: ListAssetsQuery,
    _actor: AssetActor,
  ): Promise<{ items: ReturnType<AssetService['toResponse']>[]; meta: PaginationMeta }> {
    const { page, limit, skip, sort } = parsePaginationQuery({
      ...query,
      sort: query.sort ?? 'expiryDate',
      order: query.order ?? 'asc',
    });

    const filter: Filter = {
      ...buildSearchFilter(query.search, ['provider', 'accountName', 'urlOrIdentifier', 'code']),
    };
    if (query.trashOnly) filter.isDeleted = true;
    else filter.isDeleted = { $ne: true };
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.assetType) filter.assetType = query.assetType;
    if (query.ownership) filter.ownership = query.ownership;
    if (query.status) filter.status = query.status;
    if (query.expiringBefore) {
      filter.expiryDate = { $lte: query.expiringBefore };
    }

    const findQuery = AgencyAsset.find(filter).sort(sort).skip(skip).limit(limit);
    const countQuery = AgencyAsset.countDocuments(filter);
    if (query.trashOnly) {
      findQuery.setOptions({ includeDeleted: true });
      countQuery.setOptions({ includeDeleted: true });
    }

    const [docs, total] = await Promise.all([findQuery.exec(), countQuery.exec()]);

    const clientIds = [...new Set(docs.map((d) => String(d.clientId)))];
    const projectIds = [...new Set(docs.filter((d) => d.projectId).map((d) => String(d.projectId)))];
    const [clients, projects] = await Promise.all([
      AgencyClient.find({ _id: { $in: clientIds } }).select('name').exec(),
      projectIds.length
        ? AgencyProject.find({ _id: { $in: projectIds } }).select('name').exec()
        : Promise.resolve([]),
    ]);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    return {
      items: docs.map((d) =>
        this.toResponse(d, {
          clientName: clientMap.get(String(d.clientId)),
          projectName: d.projectId ? projectMap.get(String(d.projectId)) : undefined,
        }),
      ),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async getById(id: string, _actor: AssetActor) {
    const doc = await this.getOrThrow(id);
    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }

  async create(dto: CreateAssetDto, actor: AssetActor) {
    await this.assertClient(dto.clientId);
    await this.assertProject(dto.projectId, dto.clientId);
    const code = await allocateAgencyDocumentCode('asset');
    const expiryDate = dto.expiryDate;
    const status = deriveStatus(expiryDate, dto.status);

    const doc = await AgencyAsset.create({
      code,
      clientId: new Types.ObjectId(dto.clientId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      assetType: dto.assetType,
      provider: dto.provider.trim(),
      accountName: dto.accountName.trim(),
      urlOrIdentifier: dto.urlOrIdentifier?.trim(),
      ownership: dto.ownership,
      responsiblePerson: dto.responsiblePerson?.trim(),
      registrationDate: dto.registrationDate,
      expiryDate: dto.expiryDate,
      sslExpiryDate: dto.sslExpiryDate,
      maintenanceAgreementDate: dto.maintenanceAgreementDate,
      renewalCycle: dto.renewalCycle,
      expectedCostMinor: dto.expectedCostMinor,
      actualCostMinor: dto.actualCostMinor,
      clientChargeMinor: dto.clientChargeMinor,
      currency: dto.currency ?? DEFAULT_AGENCY_CURRENCY,
      paymentResponsibility: dto.paymentResponsibility ?? 'agency',
      status,
      notes: dto.notes?.trim(),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
      activityLog: [this.buildActivity('created', 'Asset registered', actor)],
    });

    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'asset_created',
      entityType: 'asset',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: dto.clientId,
      projectId: dto.projectId ?? null,
      message: `Asset registered: ${doc.accountName}`,
      meta: { assetType: doc.assetType, provider: doc.provider },
    });

    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }

  async update(id: string, dto: UpdateAssetDto, actor: AssetActor) {
    const doc = await this.getOrThrow(id);
    if (dto.clientId && dto.clientId !== String(doc.clientId)) {
      await this.assertClient(dto.clientId);
      doc.clientId = new Types.ObjectId(dto.clientId);
    }
    const clientId = String(doc.clientId);
    if (dto.projectId !== undefined) {
      await this.assertProject(dto.projectId, clientId);
      doc.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.assetType !== undefined) doc.assetType = dto.assetType;
    if (dto.provider !== undefined) doc.provider = dto.provider.trim();
    if (dto.accountName !== undefined) doc.accountName = dto.accountName.trim();
    if (dto.urlOrIdentifier !== undefined) doc.urlOrIdentifier = dto.urlOrIdentifier?.trim();
    if (dto.ownership !== undefined) doc.ownership = dto.ownership;
    if (dto.responsiblePerson !== undefined) doc.responsiblePerson = dto.responsiblePerson?.trim();
    if (dto.registrationDate !== undefined) doc.registrationDate = dto.registrationDate;
    if (dto.expiryDate !== undefined) doc.expiryDate = dto.expiryDate;
    if (dto.sslExpiryDate !== undefined) doc.sslExpiryDate = dto.sslExpiryDate;
    if (dto.maintenanceAgreementDate !== undefined) {
      doc.maintenanceAgreementDate = dto.maintenanceAgreementDate;
    }
    if (dto.renewalCycle !== undefined) doc.renewalCycle = dto.renewalCycle;
    if (dto.expectedCostMinor !== undefined) doc.expectedCostMinor = dto.expectedCostMinor;
    if (dto.actualCostMinor !== undefined) doc.actualCostMinor = dto.actualCostMinor;
    if (dto.clientChargeMinor !== undefined) doc.clientChargeMinor = dto.clientChargeMinor;
    if (dto.currency !== undefined) doc.currency = dto.currency;
    if (dto.paymentResponsibility !== undefined) {
      doc.paymentResponsibility = dto.paymentResponsibility;
    }
    if (dto.notes !== undefined) doc.notes = dto.notes?.trim();
    if (dto.status === 'cancelled' || dto.status === 'archived') {
      doc.status = dto.status;
    } else {
      doc.status = deriveStatus(doc.expiryDate, dto.status ?? doc.status);
    }

    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('updated', 'Asset updated', actor));
    await doc.save();
    await activityService.record({
      actor: { id: actor.id, fullName: actor.fullName },
      action: 'asset_updated',
      entityType: 'asset',
      entityId: doc.id,
      entityCode: doc.code,
      clientId: String(doc.clientId),
      projectId: doc.projectId ? String(doc.projectId) : null,
      message: `Asset updated: ${doc.code}`,
      meta: { status: doc.status },
    });
    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }

  async remove(id: string, actor: AssetActor) {
    const doc = await this.getOrThrow(id);
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('trashed', 'Asset moved to trash', actor));
    await doc.save();
  }

  async restore(id: string, actor: AssetActor) {
    const doc = await this.getOrThrow(id, true);
    if (!doc.isDeleted) throw new BadRequestError('Asset is not in trash');
    doc.isDeleted = false;
    doc.deletedAt = undefined;
    doc.isActive = true;
    doc.status = deriveStatus(doc.expiryDate, doc.status === 'archived' ? 'active' : doc.status);
    doc.updatedBy = new Types.ObjectId(actor.id);
    doc.activityLog.push(this.buildActivity('restored', 'Asset restored', actor));
    await doc.save();
    const extras = await this.resolveNames(doc);
    return this.toResponse(doc, extras);
  }
}

export const assetService = new AssetService();
