import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import { BadRequestError, NotFoundError, ConflictError } from '@core/errors';
import { logger } from '@core/logger';
import { DiscoveryJob, IDiscoveryJob, DiscoveryJobStatus } from '../model/discovery-job.model';
import { StagedProspect, IStagedProspect, ProspectReviewStatus } from '../model/staged-prospect.model';
import { AgencyClient, AgencyClientStatus } from '@modules/agency/clients/model/client.model';
import { clientService } from '@modules/agency/clients/service/client.service';
import { UserRole } from '@core/constants';

export type StartDiscoveryConfig = {
  provider: 'serper' | 'tinyfish' | 'scavio' | 'osm';
  city: string;
  industry: string;
  limit: number;
  keywords?: string;
  minScore?: number;
};

// Memory map of actively running child processes by jobId
const activeChildProcesses = new Map<string, ChildProcess>();

function resolvePythonBinary(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), 'growth-technos-operations/ai-tools/sellbird/.venv/bin/python3'),
    path.resolve(process.cwd(), '../growth-technos-operations/ai-tools/sellbird/.venv/bin/python3'),
    path.resolve(process.cwd(), 'ai-tools/sellbird/.venv/bin/python3'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'python3';
}

function resolveDiscoveryScript(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), 'growth-technos-operations/sales/discovery/discovery_service.py'),
    path.resolve(process.cwd(), '../growth-technos-operations/sales/discovery/discovery_service.py'),
    path.resolve(process.cwd(), 'sales/discovery/discovery_service.py'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error('Discovery service Python script not found on disk');
}

export class DiscoveryService {
  /**
   * Start a background discovery job.
   */
  async startJob(
    config: StartDiscoveryConfig,
    userId: string,
    userName?: string,
  ): Promise<IDiscoveryJob> {
    // Check if there is already an active job running in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingRunning = await DiscoveryJob.findOne({
      status: DiscoveryJobStatus.RUNNING,
      startedAt: { $gte: tenMinutesAgo },
    });

    if (existingRunning) {
      throw new ConflictError(
        `A discovery job (${existingRunning.jobId}) is already running. Please wait for it to complete or cancel it.`,
      );
    }

    const jobId = `DJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const job = await DiscoveryJob.create({
      jobId,
      createdBy: new Types.ObjectId(userId),
      createdByName: userName || 'Admin',
      status: DiscoveryJobStatus.RUNNING,
      config: {
        provider: config.provider,
        city: config.city,
        industry: config.industry,
        limit: config.limit,
        keywords: config.keywords || '',
        minScore: config.minScore || 0,
      },
      stats: {
        companiesFound: 0,
        prospectsQualified: 0,
        duplicatesDetected: 0,
        avgScore: 0,
      },
      progressPercent: 5,
      currentStepMessage: 'Initializing discovery engine...',
      startedAt: new Date(),
    });

    // Run in background (do not await completion here)
    this.executeDiscoveryProcess(jobId, config).catch((err) => {
      logger.error(`[discovery] Background execution failed for job ${jobId}`, { error: err });
    });

    return job;
  }

  /**
   * Spawns Python process and processes streaming events.
   */
  private async executeDiscoveryProcess(jobId: string, config: StartDiscoveryConfig): Promise<void> {
    const pythonBin = resolvePythonBinary();
    const scriptPath = resolveDiscoveryScript();

    const args = [
      scriptPath,
      '--provider', config.provider,
      '--city', config.city,
      '--industry', config.industry,
      '--limit', String(config.limit),
    ];

    if (config.keywords && config.keywords.trim()) {
      args.push('--keywords', config.keywords.trim());
    }

    logger.info(`[discovery] Spawning discovery runner: ${pythonBin} ${args.join(' ')}`);

    const child = spawn(pythonBin, args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    activeChildProcesses.set(jobId, child);

    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Safety timeout after 5 minutes
    const timeoutHandle = setTimeout(async () => {
      if (activeChildProcesses.has(jobId)) {
        logger.warn(`[discovery] Job ${jobId} timed out after 5 minutes, killing child process.`);
        child.kill('SIGTERM');
        activeChildProcesses.delete(jobId);
        await DiscoveryJob.findOneAndUpdate(
          { jobId },
          {
            status: DiscoveryJobStatus.FAILED,
            error: 'Discovery process timed out after 5 minutes',
            completedAt: new Date(),
          },
        );
      }
    }, 5 * 60 * 1000);

    child.stdout.on('data', async (chunk: Buffer) => {
      const text = chunk.toString();
      stdoutBuffer += text;

      // Check for streaming progress events
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"event": "progress"')) {
          try {
            const event = JSON.parse(trimmed);
            await DiscoveryJob.findOneAndUpdate(
              { jobId },
              {
                progressPercent: event.progressPercent ?? 50,
                currentStepMessage: event.message || 'Processing prospects...',
              },
            );
          } catch {
            // Ignore partial JSON parse errors
          }
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    child.on('close', async (code) => {
      clearTimeout(timeoutHandle);
      activeChildProcesses.delete(jobId);

      if (code !== 0) {
        logger.error(`[discovery] Python script exited with code ${code}: ${stderrBuffer}`);
        await DiscoveryJob.findOneAndUpdate(
          { jobId },
          {
            status: DiscoveryJobStatus.FAILED,
            error: stderrBuffer.slice(-500) || `Process exited with error code ${code}`,
            completedAt: new Date(),
          },
        );
        return;
      }

      try {
        await this.handleDiscoverySuccess(jobId, stdoutBuffer);
      } catch (err: any) {
        logger.error(`[discovery] Error saving prospects for job ${jobId}`, { error: err });
        await DiscoveryJob.findOneAndUpdate(
          { jobId },
          {
            status: DiscoveryJobStatus.FAILED,
            error: err.message || 'Failed to parse discovered prospects',
            completedAt: new Date(),
          },
        );
      }
    });
  }

  /**
   * Ingest discovered prospects into StagedProspect collection with duplicate checks.
   */
  private async handleDiscoverySuccess(jobId: string, outputText: string): Promise<void> {
    // Locate the JSON array output
    const jsonStart = outputText.indexOf('[');
    const jsonEnd = outputText.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('No valid JSON array output received from discovery engine');
    }

    const jsonStr = outputText.substring(jsonStart, jsonEnd + 1);
    const rawProspects: any[] = JSON.parse(jsonStr);

    let companiesFound = rawProspects.length;
    let prospectsQualified = 0;
    let duplicatesDetected = 0;
    let totalScoreSum = 0;

    for (const raw of rawProspects) {
      const companyName = raw.companyName || 'Unknown Company';
      const domain = (raw.domain || '').toLowerCase().trim();
      const website = raw.website || '';
      const score = raw.qualificationScore?.overallScore ?? 0;
      const grade = raw.qualificationScore?.grade ?? 'C';

      // Check duplicates against AgencyClient
      let isDuplicate = false;
      let matchedClientId: Types.ObjectId | null = null;
      let matchedClientName: string | null = null;
      let matchReason: string | null = null;

      if (domain) {
        const clientMatch = await AgencyClient.findOne({
          $or: [
            { domain },
            { website: { $regex: domain, $options: 'i' } },
            { name: { $regex: `^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
          ],
        });

        if (clientMatch) {
          isDuplicate = true;
          duplicatesDetected++;
          matchedClientId = clientMatch._id as Types.ObjectId;
          matchedClientName = clientMatch.name;
          matchReason = `Matches existing CRM Client "${clientMatch.name}" (${clientMatch.code || domain})`;
        }
      }

      // Check duplicate against previously approved StagedProspect
      if (!isDuplicate && domain) {
        const stagedMatch = await StagedProspect.findOne({
          domain,
          reviewStatus: ProspectReviewStatus.APPROVED,
        });

        if (stagedMatch) {
          isDuplicate = true;
          duplicatesDetected++;
          matchedClientId = stagedMatch.promotedClientId || null;
          matchedClientName = stagedMatch.companyName;
          matchReason = `Already approved into CRM as "${stagedMatch.companyName}"`;
        }
      }

      if (score >= 40) {
        prospectsQualified++;
      }
      totalScoreSum += score;

      await StagedProspect.create({
        jobId,
        companyName,
        legalName: raw.legalName || undefined,
        domain,
        website,
        industry: raw.industry || 'Business Services',
        city: raw.city || 'Noida',
        state: raw.state || 'Uttar Pradesh',
        country: raw.country || 'India',
        address: raw.address || undefined,
        phone: raw.phone || undefined,
        email: raw.email || undefined,
        sourceProvider: raw.sourceProvider || 'serper',
        qualificationScore: {
          overallScore: score,
          grade,
          signalsBreakdown: raw.qualificationScore?.signalsBreakdown || {},
          recommendation: raw.qualificationScore?.recommendation || '',
        },
        verifiedFacts: raw.verifiedFacts || {},
        digitalPresence: raw.digitalPresence || {},
        decisionMakers: raw.decisionMakers || [],
        growthOpportunities: raw.growthOpportunities || [],
        duplicateCheck: {
          isDuplicate,
          matchedClientId,
          matchedClientName,
          matchReason,
        },
        reviewStatus: ProspectReviewStatus.STAGED,
      });
    }

    const avgScore = companiesFound > 0 ? Math.round(totalScoreSum / companiesFound) : 0;

    await DiscoveryJob.findOneAndUpdate(
      { jobId },
      {
        status: DiscoveryJobStatus.COMPLETED,
        progressPercent: 100,
        currentStepMessage: `Discovery completed. Found ${companiesFound} companies (${duplicatesDetected} duplicates flagged).`,
        stats: {
          companiesFound,
          prospectsQualified,
          duplicatesDetected,
          avgScore,
        },
        completedAt: new Date(),
      },
    );

    logger.info(`[discovery] Job ${jobId} successfully completed with ${companiesFound} prospects.`);
  }

  /**
   * Cancel an active discovery job.
   */
  async cancelJob(jobId: string): Promise<IDiscoveryJob> {
    const job = await DiscoveryJob.findOne({ jobId });
    if (!job) {
      throw new NotFoundError(`Discovery job ${jobId} not found`);
    }

    if (activeChildProcesses.has(jobId)) {
      const child = activeChildProcesses.get(jobId);
      child?.kill('SIGTERM');
      activeChildProcesses.delete(jobId);
    }

    job.status = DiscoveryJobStatus.CANCELLED;
    job.currentStepMessage = 'Job cancelled by user.';
    job.completedAt = new Date();
    await job.save();

    return job;
  }

  /**
   * List recent discovery jobs.
   */
  async listJobs(limit = 15): Promise<IDiscoveryJob[]> {
    return DiscoveryJob.find({})
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();
  }

  /**
   * Get job status and live progress.
   */
  async getJobStatus(jobId: string): Promise<IDiscoveryJob> {
    const job = await DiscoveryJob.findOne({ jobId }).lean();
    if (!job) {
      throw new NotFoundError(`Discovery job ${jobId} not found`);
    }
    return job;
  }

  /**
   * List staged prospects with filtering and pagination.
   */
  async listStagedProspects(params: {
    jobId?: string;
    grade?: string;
    reviewStatus?: string;
    isDuplicate?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (params.jobId) {
      filter.jobId = params.jobId;
    }
    if (params.grade) {
      filter['qualificationScore.grade'] = params.grade;
    }
    if (params.reviewStatus) {
      filter.reviewStatus = params.reviewStatus;
    }
    if (params.isDuplicate !== undefined) {
      filter['duplicateCheck.isDuplicate'] = params.isDuplicate;
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim();
      filter.$or = [
        { companyName: { $regex: term, $options: 'i' } },
        { domain: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
        { industry: { $regex: term, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      StagedProspect.find(filter)
        .sort({ 'qualificationScore.overallScore': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StagedProspect.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single staged prospect detail dossier.
   */
  async getStagedProspect(prospectId: string): Promise<IStagedProspect> {
    if (!Types.ObjectId.isValid(prospectId)) {
      throw new BadRequestError('Invalid prospect ID');
    }

    const prospect = await StagedProspect.findById(prospectId).lean();
    if (!prospect) {
      throw new NotFoundError('Staged prospect not found');
    }

    return prospect;
  }

  /**
   * Single-click promote / approve prospect into MongoDB Atlas CRM (AgencyClient).
   */
  async approveProspect(
    prospectId: string,
    userId: string,
    userRole: UserRole = UserRole.ADMIN,
    overrides?: {
      assignedAccountManagerId?: string;
      customNotes?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(prospectId)) {
      throw new BadRequestError('Invalid prospect ID');
    }

    const prospect = await StagedProspect.findById(prospectId);
    if (!prospect) {
      throw new NotFoundError('Staged prospect not found');
    }

    if (prospect.reviewStatus === ProspectReviewStatus.APPROVED && prospect.promotedClientId) {
      throw new ConflictError('Prospect has already been approved into CRM');
    }

    // Prepare note summary
    const oppSummary = (prospect.growthOpportunities || [])
      .map((o) => `• ${o.title}: ${o.recommendedPitch} (Est: ₹${(o.estimatedValueInr || 0).toLocaleString('en-IN')})`)
      .join('\n');

    const leadNote = [
      `[AI Lead Discovery Import — ${prospect.sourceProvider.toUpperCase()}]`,
      `Score: ${prospect.qualificationScore.overallScore}/100 (Grade ${prospect.qualificationScore.grade})`,
      `Verified Tech: ${prospect.verifiedFacts?.techStack?.join(', ') || 'Standard Web Stack'}`,
      `SSL: ${prospect.verifiedFacts?.sslStatus ? 'Valid' : 'None/Issue'} · TTFB: ${prospect.verifiedFacts?.ttfbMs || 0}ms`,
      '',
      'Identified Opportunities:',
      oppSummary || 'Custom software automation & CRM development',
      overrides?.customNotes ? `\nInternal Notes: ${overrides.customNotes}` : '',
    ].filter(Boolean).join('\n');

    // Create AgencyClient through canonical agency clientService
    const createdClient = await clientService.createClient(
      {
        name: prospect.companyName,
        legalName: prospect.legalName || prospect.companyName,
        website: prospect.website,
        domain: prospect.domain,
        email: prospect.email,
        phone: prospect.phone,
        industry: prospect.industry,
        billingAddress: {
          city: prospect.city,
          state: prospect.state,
          country: prospect.country,
          postalCode: '',
          streetAddress1: prospect.address || '',
        },
        status: AgencyClientStatus.LEAD,
        notes: leadNote,
        detectedSignals: (prospect.growthOpportunities || []).map((o) => o.title),
        recommendedOffer: {
          primaryService: prospect.growthOpportunities?.[0]?.title || 'Custom Business Software',
          estimatedBudgetMin: prospect.growthOpportunities?.[0]?.estimatedValueInr || 45000,
          estimatedBudgetMax: (prospect.growthOpportunities?.[0]?.estimatedValueInr || 45000) * 1.5,
          valueProposition: prospect.growthOpportunities?.[0]?.recommendedPitch || 'Custom software engineered around your actual business operations.',
        },
        assignedAccountManagerId: overrides?.assignedAccountManagerId,
      },
      userId,
      userRole,
    );

    // Update staged prospect status
    prospect.reviewStatus = ProspectReviewStatus.APPROVED;
    prospect.reviewedBy = new Types.ObjectId(userId);
    prospect.reviewedAt = new Date();
    prospect.promotedClientId = new Types.ObjectId(createdClient.id);
    await prospect.save();

    logger.info(`[discovery] Approved prospect ${prospect.companyName} into CRM as ${createdClient.code} (${createdClient.id})`);

    return {
      success: true,
      prospectId: prospect.id,
      client: createdClient,
    };
  }

  /**
   * Reject a staged prospect with reason.
   */
  async rejectProspect(prospectId: string, reason: string, userId: string) {
    if (!Types.ObjectId.isValid(prospectId)) {
      throw new BadRequestError('Invalid prospect ID');
    }

    const prospect = await StagedProspect.findById(prospectId);
    if (!prospect) {
      throw new NotFoundError('Staged prospect not found');
    }

    prospect.reviewStatus = ProspectReviewStatus.REJECTED;
    prospect.rejectionReason = reason || 'Not suitable';
    prospect.reviewedBy = new Types.ObjectId(userId);
    prospect.reviewedAt = new Date();
    await prospect.save();

    return {
      success: true,
      prospectId: prospect.id,
      status: prospect.reviewStatus,
    };
  }
}

export const discoveryService = new DiscoveryService();

