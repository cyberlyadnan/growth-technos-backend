import { Router } from 'express';
import { Permission } from '@core/constants';
import { authorize, validate, vaultSensitiveRateLimiter } from '@core/middlewares';
import { assetController } from '../controller/asset.controller';
import { credentialController } from '../controller/credential.controller';
import { renewalController } from '../controller/renewal.controller';
import {
  assetIdParamSchema,
  createAssetSchema,
  listAssetsSchema,
  updateAssetSchema,
} from '../validation/asset.validation';
import {
  createCredentialSchema,
  credentialIdParamSchema,
  deleteCredentialSchema,
  listCredentialsSchema,
  revealCredentialSchema,
  updateCredentialMetaSchema,
  updateCredentialSecretSchema,
} from '../validation/credential.validation';
import {
  createRenewalSchema,
  listRenewalsSchema,
  renewalIdParamSchema,
  updateRenewalSchema,
} from '../validation/renewal.validation';

const router = Router();

// --- Assets ---
router.get(
  '/',
  authorize(Permission.ASSETS_READ),
  validate(listAssetsSchema, 'query'),
  assetController.list,
);
router.post(
  '/',
  authorize(Permission.ASSETS_CREATE),
  validate(createAssetSchema),
  assetController.create,
);
router.get(
  '/credentials/status',
  authorize(Permission.ASSETS_READ),
  credentialController.status,
);
router.get(
  '/credentials',
  authorize(Permission.ASSETS_READ),
  validate(listCredentialsSchema, 'query'),
  credentialController.list,
);
router.post(
  '/credentials',
  authorize(Permission.ASSETS_CREATE, Permission.ASSETS_REVEAL),
  vaultSensitiveRateLimiter,
  validate(createCredentialSchema),
  credentialController.create,
);
router.get(
  '/credentials/:id',
  authorize(Permission.ASSETS_READ),
  validate(credentialIdParamSchema, 'params'),
  credentialController.getById,
);
router.patch(
  '/credentials/:id',
  authorize(Permission.ASSETS_UPDATE),
  validate(credentialIdParamSchema, 'params'),
  validate(updateCredentialMetaSchema),
  credentialController.updateMetadata,
);
router.post(
  '/credentials/:id/secret',
  authorize(Permission.ASSETS_UPDATE, Permission.ASSETS_REVEAL),
  vaultSensitiveRateLimiter,
  validate(credentialIdParamSchema, 'params'),
  validate(updateCredentialSecretSchema),
  credentialController.updateSecret,
);
router.post(
  '/credentials/:id/reveal',
  authorize(Permission.ASSETS_REVEAL),
  vaultSensitiveRateLimiter,
  validate(credentialIdParamSchema, 'params'),
  validate(revealCredentialSchema),
  credentialController.reveal,
);
router.post(
  '/credentials/:id/rewrap',
  authorize(Permission.ASSETS_REVEAL),
  vaultSensitiveRateLimiter,
  validate(credentialIdParamSchema, 'params'),
  validate(revealCredentialSchema),
  credentialController.rewrap,
);
router.post(
  '/credentials/:id/archive',
  authorize(Permission.ASSETS_UPDATE),
  validate(credentialIdParamSchema, 'params'),
  credentialController.archive,
);
router.post(
  '/credentials/:id/restore',
  authorize(Permission.ASSETS_UPDATE),
  validate(credentialIdParamSchema, 'params'),
  credentialController.restore,
);
router.get(
  '/credentials/:id/audit',
  authorize(Permission.ASSETS_READ),
  validate(credentialIdParamSchema, 'params'),
  credentialController.audit,
);
router.post(
  '/credentials/:id/delete',
  authorize(Permission.ASSETS_DELETE, Permission.ASSETS_REVEAL),
  vaultSensitiveRateLimiter,
  validate(credentialIdParamSchema, 'params'),
  validate(deleteCredentialSchema),
  credentialController.remove,
);

// --- Renewals ---
router.get(
  '/renewals',
  authorize(Permission.ASSETS_READ),
  validate(listRenewalsSchema, 'query'),
  renewalController.list,
);
router.post(
  '/renewals',
  authorize(Permission.ASSETS_CREATE),
  validate(createRenewalSchema),
  renewalController.create,
);
router.post(
  '/renewals/process-due',
  authorize(Permission.ASSETS_UPDATE),
  renewalController.processDue,
);
router.get(
  '/renewals/:id',
  authorize(Permission.ASSETS_READ),
  validate(renewalIdParamSchema, 'params'),
  renewalController.getById,
);
router.patch(
  '/renewals/:id',
  authorize(Permission.ASSETS_UPDATE),
  validate(renewalIdParamSchema, 'params'),
  validate(updateRenewalSchema),
  renewalController.update,
);
router.post(
  '/renewals/:id/complete',
  authorize(Permission.ASSETS_UPDATE),
  validate(renewalIdParamSchema, 'params'),
  renewalController.complete,
);
router.post(
  '/renewals/:id/cancel',
  authorize(Permission.ASSETS_UPDATE),
  validate(renewalIdParamSchema, 'params'),
  renewalController.cancel,
);

// --- Asset by id (after static paths) ---
router.get(
  '/:id',
  authorize(Permission.ASSETS_READ),
  validate(assetIdParamSchema, 'params'),
  assetController.getById,
);
router.patch(
  '/:id',
  authorize(Permission.ASSETS_UPDATE),
  validate(assetIdParamSchema, 'params'),
  validate(updateAssetSchema),
  assetController.update,
);
router.post(
  '/:id/restore',
  authorize(Permission.ASSETS_UPDATE),
  validate(assetIdParamSchema, 'params'),
  assetController.restore,
);
router.delete(
  '/:id',
  authorize(Permission.ASSETS_DELETE),
  validate(assetIdParamSchema, 'params'),
  assetController.remove,
);

export default router;
