import { Request, Response } from 'express';
import { asyncHandler, sendSuccess } from '@core/response';
import { reportsService, type ReportFilters } from '../service/reports.service';
import type { CurrencyCode } from '@core/utils/money';

function filtersFromQuery(query: Request['query']): ReportFilters {
  return {
    from: query.from ? new Date(String(query.from)) : undefined,
    to: query.to ? new Date(String(query.to)) : undefined,
    clientId: query.clientId ? String(query.clientId) : undefined,
    projectId: query.projectId ? String(query.projectId) : undefined,
    currency: query.currency ? (String(query.currency) as CurrencyCode) : undefined,
  };
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export const reportsController = {
  catalog: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { reports: reportsService.getCatalog() }, 'Report catalog');
  }),

  summary: asyncHandler(async (req: Request, res: Response) => {
    const filters = filtersFromQuery(req.query);
    if (req.query.format === 'csv') {
      const file = await reportsService.exportSummaryCsv(filters);
      return sendCsv(res, file.filename, file.csv);
    }
    const data = await reportsService.summary(filters);
    sendSuccess(res, data, 'Financial summary');
  }),

  overdue: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportsService.overdueInvoices(filtersFromQuery(req.query), req.query);
    sendSuccess(res, data, 'Overdue invoices');
  }),

  expenses: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportsService.expensesBreakdown(filtersFromQuery(req.query));
    sendSuccess(res, data, 'Expense breakdown');
  }),

  refunds: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportsService.refundsAndAdjustments(filtersFromQuery(req.query));
    sendSuccess(res, data, 'Refunds and adjustments');
  }),

  projectProfitability: asyncHandler(async (req: Request, res: Response) => {
    const filters = filtersFromQuery(req.query);
    if (req.query.format === 'csv') {
      const file = await reportsService.exportProjectProfitabilityCsv(filters);
      return sendCsv(res, file.filename, file.csv);
    }
    const data = await reportsService.projectProfitability(filters, req.query);
    sendSuccess(res, data, 'Project profitability');
  }),

  clientBalances: asyncHandler(async (req: Request, res: Response) => {
    const filters = filtersFromQuery(req.query);
    if (req.query.format === 'csv') {
      const file = await reportsService.exportClientBalancesCsv(filters);
      return sendCsv(res, file.filename, file.csv);
    }
    const data = await reportsService.clientBalances(filters, req.query);
    sendSuccess(res, data, 'Client balances');
  }),

  recurring: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportsService.recurring(filtersFromQuery(req.query));
    sendSuccess(res, data, 'Recurring revenue and costs');
  }),

  executiveDashboard: asyncHandler(async (req: Request, res: Response) => {
    const filters = filtersFromQuery(req.query);
    if (req.query.format === 'csv') {
      const file = await reportsService.exportExecutiveDashboardCsv(filters);
      sendCsv(res, file.filename, file.csv);
      return;
    }
    if (req.query.format === 'pdf') {
      const file = await reportsService.exportExecutiveDashboardPdf(filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(file.buffer);
      return;
    }
    const data = await reportsService.executiveDashboard(filters);
    sendSuccess(res, data, 'Executive agency dashboard');
  }),
};
