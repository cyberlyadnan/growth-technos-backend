import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { logger } from '@core/logger';
import {
  Opportunity,
  IOpportunity,
  OpportunityCategory,
  OpportunityStage,
} from '../model/opportunity.model';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { allocateAgencyDocumentCode } from '@modules/agency/clients/service/number-sequence.service';

export type CreateOpportunityDto = {
  clientId: string;
  title: string;
  projectCategory: OpportunityCategory;
  clientRequirement?: string;
  proposedSolution?: string;
  estimatedValueInr: number;
  expectedCloseDate: string | Date;
  stage?: OpportunityStage;
  probabilityPercent?: number;
  nextAction?: string;
  notes?: string;
  proposalQuotationId?: string | null;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
};

export type UpdateOpportunityDto = Partial<CreateOpportunityDto> & {
  lostReason?: string;
};

export class OpportunityService {
  async createOpportunity(dto: CreateOpportunityDto, userId: string): Promise<IOpportunity> {
    if (!Types.ObjectId.isValid(dto.clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await AgencyClient.findById(dto.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const code = await allocateAgencyDocumentCode('opportunity');
    const closeDate = new Date(dto.expectedCloseDate);

    const opportunity = await Opportunity.create({
      code,
      clientId: client._id,
      clientName: client.name,
      contactPersonName: dto.contactPersonName || client.contactPersons?.[0]?.name,
      contactPersonEmail: dto.contactPersonEmail || client.email || client.contactPersons?.[0]?.email,
      contactPersonPhone: dto.contactPersonPhone || client.phone || client.contactPersons?.[0]?.phone,
      title: dto.title,
      projectCategory: dto.projectCategory,
      clientRequirement: dto.clientRequirement || '',
      proposedSolution: dto.proposedSolution || '',
      estimatedValueInr: dto.estimatedValueInr,
      expectedCloseDate: closeDate,
      stage: dto.stage || 'discovery',
      probabilityPercent: dto.probabilityPercent ?? 25,
      nextAction: dto.nextAction,
      notes: dto.notes,
      proposalQuotationId: dto.proposalQuotationId ? new Types.ObjectId(dto.proposalQuotationId) : null,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    // Record activity in client timeline
    client.activityLog.push({
      type: 'opportunity_created',
      message: `New Opportunity created: "${opportunity.title}" (${opportunity.code}) — Est. ₹${opportunity.estimatedValueInr.toLocaleString('en-IN')}`,
      meta: {
        opportunityId: opportunity.id,
        code: opportunity.code,
        estimatedValueInr: opportunity.estimatedValueInr,
        stage: opportunity.stage,
      },
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
    });
    await client.save();

    logger.info(`[opportunity] Created opportunity ${opportunity.code} for client ${client.name}`);
    return opportunity;
  }

  async updateOpportunity(
    id: string,
    dto: UpdateOpportunityDto,
    userId: string,
  ): Promise<IOpportunity> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid opportunity ID');
    }

    const opp = await Opportunity.findById(id);
    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }

    const previousStage = opp.stage;

    if (dto.title !== undefined) opp.title = dto.title;
    if (dto.projectCategory !== undefined) opp.projectCategory = dto.projectCategory;
    if (dto.clientRequirement !== undefined) opp.clientRequirement = dto.clientRequirement;
    if (dto.proposedSolution !== undefined) opp.proposedSolution = dto.proposedSolution;
    if (dto.estimatedValueInr !== undefined) opp.estimatedValueInr = dto.estimatedValueInr;
    if (dto.expectedCloseDate !== undefined) opp.expectedCloseDate = new Date(dto.expectedCloseDate);
    if (dto.probabilityPercent !== undefined) opp.probabilityPercent = dto.probabilityPercent;
    if (dto.nextAction !== undefined) opp.nextAction = dto.nextAction;
    if (dto.notes !== undefined) opp.notes = dto.notes;
    if (dto.contactPersonName !== undefined) opp.contactPersonName = dto.contactPersonName;
    if (dto.contactPersonEmail !== undefined) opp.contactPersonEmail = dto.contactPersonEmail;
    if (dto.contactPersonPhone !== undefined) opp.contactPersonPhone = dto.contactPersonPhone;
    if (dto.proposalQuotationId !== undefined) {
      opp.proposalQuotationId = dto.proposalQuotationId ? new Types.ObjectId(dto.proposalQuotationId) : null;
    }

    if (dto.stage !== undefined && dto.stage !== previousStage) {
      opp.stage = dto.stage;

      if (dto.stage === 'won') {
        opp.wonAt = new Date();
        opp.probabilityPercent = 100;

        // Auto-sync client status
        await AgencyClient.findByIdAndUpdate(opp.clientId, {
          status: 'active',
          $push: {
            activityLog: {
              type: 'deal_won',
              message: `🎉 Deal Won! Opportunity "${opp.title}" closed for ₹${opp.estimatedValueInr.toLocaleString('en-IN')}`,
              meta: { opportunityId: opp.id, code: opp.code, value: opp.estimatedValueInr },
              createdBy: new Types.ObjectId(userId),
              createdAt: new Date(),
            },
          },
        });
      } else if (dto.stage === 'lost') {
        opp.lostReason = dto.lostReason || 'Competitor / Budget constraints';
        opp.probabilityPercent = 0;

        await AgencyClient.findByIdAndUpdate(opp.clientId, {
          $push: {
            activityLog: {
              type: 'deal_lost',
              message: `Opportunity "${opp.title}" marked Lost. Reason: ${opp.lostReason}`,
              meta: { opportunityId: opp.id, code: opp.code, reason: opp.lostReason },
              createdBy: new Types.ObjectId(userId),
              createdAt: new Date(),
            },
          },
        });
      }
    }

    opp.updatedBy = new Types.ObjectId(userId);
    await opp.save();

    return opp;
  }

  async getOpportunity(id: string): Promise<IOpportunity> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid opportunity ID');
    }

    const opp = await Opportunity.findById(id).lean();
    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }
    return opp as IOpportunity;
  }

  async listOpportunities(params: {
    clientId?: string;
    stage?: string;
    projectCategory?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (params.clientId && Types.ObjectId.isValid(params.clientId)) {
      filter.clientId = new Types.ObjectId(params.clientId);
    }
    if (params.stage) {
      filter.stage = params.stage;
    }
    if (params.projectCategory) {
      filter.projectCategory = params.projectCategory;
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
        { clientName: { $regex: term, $options: 'i' } },
      ];
    }

    const [items, total, allPipeline] = await Promise.all([
      Opportunity.find(filter)
        .sort({ expectedCloseDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Opportunity.countDocuments(filter),
      Opportunity.find({ isDeleted: false }, 'stage estimatedValueInr').lean(),
    ]);

    // Calculate aggregated pipeline breakdown
    let estimatedPipelineValue = 0;
    let wonValue = 0;
    let lostValue = 0;
    const stageCounts: Record<string, number> = {
      discovery: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    };

    for (const item of allPipeline) {
      const stage = item.stage || 'discovery';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;

      if (stage === 'won') {
        wonValue += item.estimatedValueInr || 0;
      } else if (stage === 'lost') {
        lostValue += item.estimatedValueInr || 0;
      } else {
        // Active pipeline: discovery + proposal + negotiation
        estimatedPipelineValue += item.estimatedValueInr || 0;
      }
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        estimatedPipelineValue,
        wonValue,
        lostValue,
        stageCounts,
        totalOpportunities: allPipeline.length,
      },
    };
  }

  async deleteOpportunity(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid opportunity ID');
    }
    await Opportunity.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: new Types.ObjectId(userId),
    });
  }
}

export const opportunityService = new OpportunityService();
