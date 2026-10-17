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
        nextImplementation: 'expenses',
        notes: [
          'Clients, projects, quotations, invoices, payments, and receipts are live.',
          'No live payment gateway is integrated — payments are recorded manually after verification.',
          'Issued invoices are immutable; use cancel or credit notes for corrections.',
          'Only confirmed payments count as money received; pending/failed never affect balances.',
        ],
      },
      'Agency management foundation',
    );
  }),
};
