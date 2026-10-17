import { Request, Response } from 'express';
import { asyncHandler, sendSuccess } from '@core/response';
import { getAgencyNumberingConfig } from '@core/utils/agency-identifiers';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';
import { AGENCY_MODULES, AGENCY_RELATIONSHIP_GRAPH } from '../constants/agency-modules';
import { AGENCY_SECURITY_REQUIREMENTS } from '../constants/security';

export const agencyController = {
  /**
   * Foundation snapshot for admin hub — no entity CRUD, no fake records.
   */
  getFoundation: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(
      res,
      {
        phase: 'foundation',
        currencyDefault: DEFAULT_AGENCY_CURRENCY,
        modules: AGENCY_MODULES,
        numbering: getAgencyNumberingConfig(),
        relationships: AGENCY_RELATIONSHIP_GRAPH,
        security: AGENCY_SECURITY_REQUIREMENTS,
        nextImplementation: null,
        notes: [
          'Clients, projects, quotations, invoices, payments, receipts, expenses, reports, assets, credentials, renewals, maintenance, documents, activity history, and handovers are live.',
          'Executive dashboard at /agency/reports/executive-dashboard uses live MongoDB actuals only — invoiced ≠ cash collected.',
          'Documents use private on-disk storage with authenticated downloads — not public CDN URLs.',
          'Activity history sanitizes secrets and refuses silent modification of immutable financial events.',
          'Handover PDFs exclude passwords and API keys; credential transfer uses the vault with audited reveal.',
          'Maintenance billing creates draft invoices only via the existing invoice service — never auto-issued or auto-charged.',
          'Credentials vault uses AES-256-GCM; keys must be set via AGENCY_VAULT_* env. No plaintext fallback.',
          'No live payment gateway is integrated — payments are recorded manually after verification.',
        ],
      },
      'Agency management foundation',
    );
  }),
};
