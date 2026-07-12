import { DeviceType, PageType } from '@core/constants/leads';
import { IDisplayRules } from '@core/schemas/lead-gen.schema';

export type DisplayContext = {
  industry?: string;
  service?: string;
  pageType?: PageType | string;
  pagePath?: string;
  device?: DeviceType | string;
  now?: Date;
};

/**
 * Returns true when an entity's displayRules match the current page context.
 * Empty targeting arrays mean "applies to all" for that dimension.
 */
export function matchesDisplayRules(
  rules: IDisplayRules | undefined | null,
  context: DisplayContext,
): boolean {
  if (!rules) return true;

  const now = context.now ?? new Date();

  if (rules.startAt && now < new Date(rules.startAt)) return false;
  if (rules.endAt && now > new Date(rules.endAt)) return false;

  if (context.pagePath && rules.excludePaths?.length) {
    const path = context.pagePath.toLowerCase();
    if (rules.excludePaths.some((p) => path.startsWith(p.toLowerCase()))) {
      return false;
    }
  }

  if (rules.industries?.length && context.industry) {
    const industry = context.industry.toLowerCase();
    if (!rules.industries.some((i) => i.toLowerCase() === industry)) return false;
  }

  if (rules.services?.length && context.service) {
    const service = context.service.toLowerCase();
    if (!rules.services.some((s) => s.toLowerCase() === service)) return false;
  }

  if (rules.pageTypes?.length && context.pageType) {
    if (!rules.pageTypes.includes(context.pageType as PageType)) return false;
  }

  if (rules.pagePaths?.length && context.pagePath) {
    const path = context.pagePath.toLowerCase();
    if (!rules.pagePaths.some((p) => path.startsWith(p.toLowerCase()))) return false;
  }

  if (rules.devices?.length && context.device) {
    const hasAll = rules.devices.includes(DeviceType.ALL);
    if (!hasAll && !rules.devices.includes(context.device as DeviceType)) return false;
  }

  return true;
}

export function sortByPriorityDesc<T extends { priority?: number; displayRules?: IDisplayRules }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const pa = a.priority ?? a.displayRules?.priority ?? 0;
    const pb = b.priority ?? b.displayRules?.priority ?? 0;
    return pb - pa;
  });
}
