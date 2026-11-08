import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from '@core/errors';
import { logger } from '@core/logger';
import {
  AgencyClient,
  AgencyClientStatus,
  IAgencyClient,
} from '@modules/agency/clients/model/client.model';
import { Opportunity } from '@modules/agency/opportunities/model/opportunity.model';
import { StagedProspect, ProspectReviewStatus } from '@modules/agency/discovery/model/staged-prospect.model';
import { AgencyPayment } from '@modules/agency/billing/model/payment.model';
import { AgencyInvoice } from '@modules/agency/billing/model/invoice.model';

export type OutreachActivityType =
  | 'email_sent'
  | 'linkedin_connection_sent'
  | 'linkedin_message_sent'
  | 'whatsapp_message_sent'
  | 'phone_call_completed'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'proposal_shared'
  | 'client_response_received'
  | 'internal_note';

export type OutreachChannel =
  | 'email'
  | 'linkedin'
  | 'whatsapp'
  | 'phone'
  | 'google_meet'
  | 'in_person'
  | 'other';

export type RecordOutreachActivityDto = {
  clientId: string;
  activityType: OutreachActivityType;
  channel: OutreachChannel;
  summary: string;
  outcome?: string;
  nextAction?: string;
  nextFollowUpDate?: string | Date | null;
  updateClientStatus?: AgencyClientStatus;
};

export type ClientResponseDisposition =
  | 'interested'
  | 'not_interested'
  | 'wants_more_info'
  | 'requested_call'
  | 'requested_proposal'
  | 'no_response'
  | 'follow_up_later';

export type RecordClientResponseDto = {
  clientId: string;
  disposition: ClientResponseDisposition;
  channel: OutreachChannel;
  notes: string;
  nextFollowUpDate?: string | Date | null;
  newStatus?: AgencyClientStatus;
};

export type DiscoveryCallNotesDto = {
  clientId: string;
  questionsAndAnswers: Array<{ question: string; answer?: string }>;
  callDate?: string | Date;
  notes?: string;
  nextSteps?: string;
  updateStatusTo?: AgencyClientStatus;
};

export class SalesWorkflowService {
  /**
   * Record actual outreach activity performed by a human.
   */
  async recordOutreachActivity(
    dto: RecordOutreachActivityDto,
    userId: string,
    userName = 'Admin',
  ): Promise<IAgencyClient> {
    if (!Types.ObjectId.isValid(dto.clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await AgencyClient.findById(dto.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const now = new Date();
    client.lastContactDate = now;
    client.lastContactChannel = dto.channel;

    if (dto.nextFollowUpDate) {
      client.nextFollowUpDate = new Date(dto.nextFollowUpDate);
      if (dto.nextAction) {
        client.followUpNotes = dto.nextAction;
      }
    }

    if (dto.updateClientStatus) {
      client.status = dto.updateClientStatus;
    } else if (client.status === 'lead' || client.status === 'draft') {
      // Auto-advance to contacted
      client.status = 'contacted';
    }

    client.activityLog.push({
      type: dto.activityType,
      message: `${dto.activityType.replace(/_/g, ' ').toUpperCase()} (${dto.channel}): ${dto.summary}`,
      meta: {
        channel: dto.channel,
        outcome: dto.outcome || '',
        nextAction: dto.nextAction || '',
        nextFollowUpDate: dto.nextFollowUpDate || null,
      },
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
      createdAt: now,
    });

    await client.save();
    logger.info(`[sales] Recorded ${dto.activityType} for ${client.name} via ${dto.channel}`);
    return client;
  }

  /**
   * Record a response received from a prospect.
   */
  async recordClientResponse(
    dto: RecordClientResponseDto,
    userId: string,
    userName = 'Admin',
  ): Promise<IAgencyClient> {
    if (!Types.ObjectId.isValid(dto.clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await AgencyClient.findById(dto.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const now = new Date();
    client.lastContactDate = now;
    client.lastContactChannel = dto.channel;

    // Automatic status resolution if not explicitly overridden
    let statusToSet = dto.newStatus;
    if (!statusToSet) {
      switch (dto.disposition) {
        case 'interested':
          statusToSet = 'interested';
          break;
        case 'requested_call':
          statusToSet = 'meeting_scheduled';
          break;
        case 'requested_proposal':
          statusToSet = 'proposal';
          break;
        case 'wants_more_info':
          statusToSet = 'responded';
          break;
        case 'not_interested':
          statusToSet = 'not_interested';
          break;
        case 'follow_up_later':
          statusToSet = 'follow_up';
          break;
        default:
          statusToSet = 'responded';
      }
    }

    client.status = statusToSet;

    if (dto.nextFollowUpDate) {
      client.nextFollowUpDate = new Date(dto.nextFollowUpDate);
      client.followUpNotes = `Response: ${dto.disposition}. ${dto.notes}`;
    }

    client.activityLog.push({
      type: 'client_response_received',
      message: `PROSPECT RESPONSE [${dto.disposition.toUpperCase()}]: ${dto.notes}`,
      meta: {
        disposition: dto.disposition,
        channel: dto.channel,
        notes: dto.notes,
        newStatus: statusToSet,
      },
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
      createdAt: now,
    });

    await client.save();
    logger.info(`[sales] Recorded response (${dto.disposition}) for ${client.name} -> new status: ${statusToSet}`);
    return client;
  }

  /**
   * Save structured discovery call answers and next steps.
   */
  async saveDiscoveryCallNotes(
    dto: DiscoveryCallNotesDto,
    userId: string,
    userName = 'Admin',
  ): Promise<IAgencyClient> {
    if (!Types.ObjectId.isValid(dto.clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await AgencyClient.findById(dto.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const callDate = dto.callDate ? new Date(dto.callDate) : new Date();

    client.discoveryCallNotes = {
      questionsAndAnswers: dto.questionsAndAnswers || [],
      callDate,
      notes: dto.notes || '',
      nextSteps: dto.nextSteps || '',
    };

    if (dto.updateStatusTo) {
      client.status = dto.updateStatusTo;
    } else if (client.status === 'meeting_scheduled' || client.status === 'contacted') {
      client.status = 'qualified';
    }

    client.activityLog.push({
      type: 'meeting_completed',
      message: `Discovery Call Completed with ${client.name}. Next steps: ${dto.nextSteps || 'Prepare tailored proposal'}`,
      meta: {
        callDate,
        notes: dto.notes,
        nextSteps: dto.nextSteps,
      },
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
      createdAt: new Date(),
    });

    await client.save();
    logger.info(`[sales] Saved discovery call notes for ${client.name}`);
    return client;
  }

  /**
   * List pending follow-ups grouped into Overdue, Due Today, and Upcoming.
   */
  async listFollowUps() {
    const clientsWithFollowUp = await AgencyClient.find(
      {
        nextFollowUpDate: { $ne: null },
        status: { $nin: ['won', 'active', 'archived', 'lost', 'disqualified'] },
      },
      'code name status phone email contactPersons nextFollowUpDate followUpNotes assignedToName industry domain lastContactDate',
    )
      .sort({ nextFollowUpDate: 1 })
      .lean();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const overdue: any[] = [];
    const dueToday: any[] = [];
    const upcoming: any[] = [];

    for (const c of clientsWithFollowUp) {
      const fDate = new Date(c.nextFollowUpDate!);
      const item = {
        ...c,
        id: String(c._id),
      };

      if (fDate < startOfToday) {
        overdue.push(item);
      } else if (fDate >= startOfToday && fDate <= endOfToday) {
        dueToday.push(item);
      } else {
        upcoming.push(item);
      }
    }

    return {
      summary: {
        totalPending: clientsWithFollowUp.length,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        upcomingCount: upcoming.length,
      },
      overdue,
      dueToday,
      upcoming,
    };
  }

  /**
   * Complete or reschedule a follow-up.
   */
  async completeFollowUp(
    clientId: string,
    action: 'completed' | 'reschedule',
    data: {
      notes: string;
      rescheduleDate?: string | Date;
    },
    userId: string,
    userName = 'Admin',
  ): Promise<IAgencyClient> {
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await AgencyClient.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const previousFollowUpDate = client.nextFollowUpDate;

    if (action === 'completed') {
      client.nextFollowUpDate = null;
      client.followUpNotes = undefined;
    } else if (action === 'reschedule' && data.rescheduleDate) {
      client.nextFollowUpDate = new Date(data.rescheduleDate);
      client.followUpNotes = data.notes;
    }

    client.activityLog.push({
      type: action === 'completed' ? 'follow_up_completed' : 'follow_up_rescheduled',
      message:
        action === 'completed'
          ? `Follow-up completed: ${data.notes || 'Task finished'}`
          : `Follow-up rescheduled to ${new Date(data.rescheduleDate!).toLocaleDateString('en-IN')}: ${data.notes}`,
      meta: {
        action,
        previousFollowUpDate,
        newFollowUpDate: client.nextFollowUpDate,
        notes: data.notes,
      },
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
      createdAt: new Date(),
    });

    await client.save();
    return client;
  }

  /**
   * Comprehensive sales analytics for the Lead Center dashboard.
   */
  async getSalesAnalytics(timeframe = '30d') {
    let startDate = new Date();
    if (timeframe === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else {
      // All time
      startDate = new Date(0);
    }

    const [
      stagedDiscovered,
      stagedApproved,
      allClients,
      opportunities,
      paidInvoices,
    ] = await Promise.all([
      StagedProspect.countDocuments({ createdAt: { $gte: startDate } }),
      StagedProspect.countDocuments({ reviewStatus: 'approved', createdAt: { $gte: startDate } }),
      AgencyClient.find({ isDeleted: false, createdAt: { $gte: startDate } }, 'status activityLog lastContactDate').lean(),
      Opportunity.find({ isDeleted: false, createdAt: { $gte: startDate } }, 'stage estimatedValueInr wonAt lostReason').lean(),
      AgencyInvoice.find({ isDeleted: false, paymentStatus: 'paid' }, 'totalAmountMinor currency').lean(),
    ]);

    // Calculate outreach activities & responses
    let totalOutreachSent = 0;
    let totalResponsesReceived = 0;
    let totalMeetingsCompleted = 0;

    for (const c of allClients) {
      for (const act of (c.activityLog || [])) {
        if (
          [
            'email_sent',
            'linkedin_connection_sent',
            'linkedin_message_sent',
            'whatsapp_message_sent',
            'phone_call_completed',
          ].includes(act.type)
        ) {
          totalOutreachSent++;
        } else if (act.type === 'client_response_received') {
          totalResponsesReceived++;
        } else if (act.type === 'meeting_completed') {
          totalMeetingsCompleted++;
        }
      }
    }

    // Opportunity metrics
    let activePipelineValueInr = 0;
    let wonDealsValueInr = 0;
    let dealsWonCount = 0;
    let dealsLostCount = 0;

    for (const opp of opportunities) {
      if (opp.stage === 'won') {
        dealsWonCount++;
        wonDealsValueInr += opp.estimatedValueInr || 0;
      } else if (opp.stage === 'lost') {
        dealsLostCount++;
      } else {
        // active pipeline
        activePipelineValueInr += opp.estimatedValueInr || 0;
      }
    }

    const totalClosedDeals = dealsWonCount + dealsLostCount;
    const winRate = totalClosedDeals > 0 ? Math.round((dealsWonCount / totalClosedDeals) * 100) : 0;
    const avgDealValueInr = dealsWonCount > 0 ? Math.round(wonDealsValueInr / dealsWonCount) : 0;

    // Actual revenue collected from settled invoices (in INR)
    const actualCollectedRevenueInr = paidInvoices.reduce((acc, inv) => {
      return acc + Math.round((inv.totalAmountMinor || 0) / 100);
    }, 0);

    return {
      timeframe,
      topMetrics: {
        leadsDiscovered: stagedDiscovered,
        leadsApproved: stagedApproved,
        outreachActivities: totalOutreachSent,
        responsesReceived: totalResponsesReceived,
        responseRatePercent: totalOutreachSent > 0 ? Math.round((totalResponsesReceived / totalOutreachSent) * 100) : 0,
        meetingsCompleted: totalMeetingsCompleted,
        activePipelineValueInr,
        wonDealsValueInr,
        actualCollectedRevenueInr,
        dealsWonCount,
        dealsLostCount,
        winRatePercent: winRate,
        avgDealValueInr,
      },
    };
  }
}

export const salesWorkflowService = new SalesWorkflowService();
