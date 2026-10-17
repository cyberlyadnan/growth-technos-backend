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
        nextImplementation: 'assets',
        notes: [
          'Clients, projects, quotations, invoices, payments, receipts, expenses, and reports are live.',
          'No live payment gateway is integrated — payments are recorded manually after verification.',
          'Reports distinguish invoice-based revenue from cash collected; nothing is estimated as profit.',
          'Finalized expenses require void (not silent edit). Draft expenses may be trashed.',
        ],
      },
      'Agency management foundation',
    );
  }),
};
