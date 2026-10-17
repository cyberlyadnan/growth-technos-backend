import { Request, Response } from 'express';
import {
  asyncHandler,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@core/response';
import { isVaultConfigured } from '@core/security/vault-crypto';
import { credentialService, type CredentialActor } from '../service/credential.service';

function actorFromRequest(req: Request): CredentialActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    email: req.user!.email,
    fullName: req.user!.email,
  };
}

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

export const credentialController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, {
      vaultConfigured: isVaultConfigured(),
      algorithm: 'aes-256-gcm',
      note: isVaultConfigured()
        ? 'Vault ready. Secrets are encrypted at rest; list/detail responses never include plaintext.'
        : 'Vault keys not configured. Create/reveal/update-secret will refuse until AGENCY_VAULT_* env is set. Plaintext storage is not permitted.',
    });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await credentialService.list(req.query, actorFromRequest(req));
    sendPaginated(res, result.items, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.getById(String(req.params.id), actorFromRequest(req));
    sendSuccess(res, item);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.create(req.body, actorFromRequest(req), reqMeta(req));
    sendCreated(res, item, 'Credential stored (encrypted)');
  }),

  updateMetadata: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.updateMetadata(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential metadata updated');
  }),

  updateSecret: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.updateSecret(
      String(req.params.id),
      req.body,
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential secret rotated');
  }),

  reveal: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.reveal(
      String(req.params.id),
      req.body.currentPassword,
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential revealed');
  }),

  rewrap: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.rewrap(
      String(req.params.id),
      req.body.currentPassword,
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential rewrapped under active key');
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.archive(
      String(req.params.id),
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential archived');
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const item = await credentialService.restore(
      String(req.params.id),
      actorFromRequest(req),
      reqMeta(req),
    );
    sendSuccess(res, item, 'Credential restored');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await credentialService.remove(
      String(req.params.id),
      req.body.currentPassword,
      actorFromRequest(req),
      reqMeta(req),
    );
    sendNoContent(res);
  }),

  audit: asyncHandler(async (req: Request, res: Response) => {
    const result = await credentialService.listAudit(String(req.params.id), req.query);
    sendPaginated(res, result.items, result.meta);
  }),
};
