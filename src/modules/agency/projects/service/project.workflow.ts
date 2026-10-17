import { BadRequestError } from '@core/errors';
import type { AgencyProjectStatus, IAgencyProject } from '../model/project.model';

/** Allowed status transitions. `archived` only via archive endpoint. */
export const PROJECT_STATUS_TRANSITIONS: Record<AgencyProjectStatus, AgencyProjectStatus[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['active', 'on_hold', 'cancelled'],
  active: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
  archived: [],
};

export function assertValidStatusTransition(
  from: AgencyProjectStatus,
  to: AgencyProjectStatus,
): void {
  if (from === to) return;
  const allowed = PROJECT_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestError(
      `Invalid project status transition from "${from}" to "${to}". Allowed: ${
        allowed.length ? allowed.join(', ') : 'none'
      }`,
    );
  }
}

/**
 * Completing a project requires evidence of delivery readiness:
 * acceptance record, all milestones done, or 100% progress with no open milestones.
 */
export function assertCanComplete(project: IAgencyProject): void {
  const activeMilestones = (project.milestones ?? []).filter((m) => m.status !== 'cancelled');
  const allMilestonesDone =
    activeMilestones.length > 0 && activeMilestones.every((m) => m.status === 'done');
  const hasAcceptance = (project.acceptanceRecords ?? []).length > 0;
  const progressComplete = (project.progressPercent ?? 0) >= 100;

  if (!allMilestonesDone && !hasAcceptance && !progressComplete) {
    throw new BadRequestError(
      'Cannot mark project completed until milestones are done, progress is 100%, or an acceptance record exists',
    );
  }

  const pendingDeliverables = (project.deliverables ?? []).filter(
    (d) => d.status === 'pending' || d.status === 'delivered',
  );
  if (pendingDeliverables.length > 0 && !hasAcceptance) {
    throw new BadRequestError(
      'Cannot complete project while deliverables are still pending/delivered without client acceptance',
    );
  }
}

export function computeProgressPercent(project: {
  milestones?: Array<{ status: string; progressPercent?: number }>;
  tasks?: Array<{ status: string }>;
  progressPercent?: number;
}): number {
  const milestones = (project.milestones ?? []).filter((m) => m.status !== 'cancelled');
  if (milestones.length > 0) {
    const sum = milestones.reduce((acc, m) => {
      if (m.status === 'done') return acc + 100;
      return acc + Math.min(100, Math.max(0, m.progressPercent ?? 0));
    }, 0);
    return Math.round(sum / milestones.length);
  }

  const tasks = project.tasks ?? [];
  if (tasks.length > 0) {
    const done = tasks.filter((t) => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }

  return Math.min(100, Math.max(0, project.progressPercent ?? 0));
}

export function statusToIsActive(status: AgencyProjectStatus): boolean {
  return status === 'active' || status === 'on_hold' || status === 'planned';
}
