import { Types } from 'mongoose';
import { CtaActionType, DeviceType } from '@core/constants/leads';
import { ICtaAction, IDisplayRules, IFrequencyControl } from '@core/schemas/lead-gen.schema';
import { DisplayContext } from '../utils/display-rules';

export function toObjectId(value: string | Types.ObjectId | null | undefined): Types.ObjectId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (value instanceof Types.ObjectId) return value;
  return new Types.ObjectId(String(value));
}

export function mapCtaAction(
  cta: ICtaAction | undefined,
  fallback: CtaActionType = CtaActionType.LINK,
): ICtaAction {
  return {
    type: cta?.type ?? fallback,
    label: cta?.label,
    url: cta?.url,
    formId: cta?.formId ?? null,
    offerId: cta?.offerId ?? null,
    magnetId: cta?.magnetId ?? null,
    popupId: cta?.popupId ?? null,
    phone: cta?.phone,
    whatsappNumber: cta?.whatsappNumber,
  };
}

export function mergeDisplayRules(
  existing: IDisplayRules,
  patch?: Partial<IDisplayRules>,
): IDisplayRules {
  if (!patch) return existing;
  return {
    industries: patch.industries ?? existing.industries,
    services: patch.services ?? existing.services,
    pagePaths: patch.pagePaths ?? existing.pagePaths,
    pageTypes: patch.pageTypes ?? existing.pageTypes,
    devices: patch.devices ?? existing.devices,
    excludePaths: patch.excludePaths ?? existing.excludePaths,
    priority: patch.priority ?? existing.priority,
    startAt: patch.startAt !== undefined ? patch.startAt : existing.startAt,
    endAt: patch.endAt !== undefined ? patch.endAt : existing.endAt,
  };
}

export type CtaActionInput = {
  type?: CtaActionType;
  label?: string;
  url?: string;
  formId?: string | null;
  offerId?: string | null;
  magnetId?: string | null;
  popupId?: string | null;
  phone?: string;
  whatsappNumber?: string;
};

export function buildCtaAction(
  input: CtaActionInput | undefined,
  fallback: CtaActionType,
): ICtaAction {
  return {
    type: input?.type ?? fallback,
    label: input?.label,
    url: input?.url,
    formId: toObjectId(input?.formId) ?? null,
    offerId: toObjectId(input?.offerId) ?? null,
    magnetId: toObjectId(input?.magnetId) ?? null,
    popupId: toObjectId(input?.popupId) ?? null,
    phone: input?.phone,
    whatsappNumber: input?.whatsappNumber,
  };
}

export function patchCtaAction(
  existing: ICtaAction | undefined,
  input: CtaActionInput | undefined,
  fallback: CtaActionType,
): ICtaAction {
  if (!input) return mapCtaAction(existing, fallback);
  return {
    type: input.type ?? existing?.type ?? fallback,
    label: input.label !== undefined ? input.label : existing?.label,
    url: input.url !== undefined ? input.url : existing?.url,
    formId: input.formId !== undefined ? (toObjectId(input.formId) ?? null) : (existing?.formId ?? null),
    offerId: input.offerId !== undefined ? (toObjectId(input.offerId) ?? null) : (existing?.offerId ?? null),
    magnetId:
      input.magnetId !== undefined ? (toObjectId(input.magnetId) ?? null) : (existing?.magnetId ?? null),
    popupId: input.popupId !== undefined ? (toObjectId(input.popupId) ?? null) : (existing?.popupId ?? null),
    phone: input.phone !== undefined ? input.phone : existing?.phone,
    whatsappNumber:
      input.whatsappNumber !== undefined ? input.whatsappNumber : existing?.whatsappNumber,
  };
}

export function matchesDeviceVisibility(
  context: DisplayContext,
  flags: { showOnMobile?: boolean; showOnDesktop?: boolean },
): boolean {
  const device = context.device;
  if (!device || device === DeviceType.ALL) return true;
  if (device === DeviceType.MOBILE || device === DeviceType.TABLET) {
    return flags.showOnMobile !== false;
  }
  if (device === DeviceType.DESKTOP) {
    return flags.showOnDesktop !== false;
  }
  return true;
}

export function defaultFrequency(input?: IFrequencyControl): IFrequencyControl {
  return {
    cookieKey: input?.cookieKey,
    maxShows: input?.maxShows,
    cooldownHours: input?.cooldownHours,
    oncePerSession: input?.oncePerSession ?? false,
  };
}
