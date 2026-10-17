import { Types } from 'mongoose';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { AgencyInvoice } from '@modules/agency/billing/model/invoice.model';
import { AgencyPayment } from '@modules/agency/billing/model/payment.model';
import { AgencyExpense } from '@modules/agency/expenses/model/expense.model';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { AgencyQuotation } from '@modules/agency/quotations/model/quotation.model';
import { AgencyRenewal } from '@modules/agency/assets/model/renewal.model';
import { MaintenanceAgreement } from '@modules/agency/maintenance/model/agreement.model';
import { activityService } from '@modules/agency/activity/service/activity.service';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';
import { buildExecutiveDashboardPdfBuffer } from './executive-dashboard-pdf.service';

export type ReportFilters = {
  from?: Date;
  to?: Date;
  clientId?: string;
  projectId?: string;
  currency?: CurrencyCode;
};

export type ReportMethodology = {
  basis: 'invoice' | 'cash' | 'mixed';
  description: string;
  taxTreatment: string;
  refundTreatment: string;
  expenseTreatment: string;
};

function dateRange(field: string, filters: ReportFilters): Record<string, unknown> {
  if (!filters.from && !filters.to) return {};
  const range: Record<string, Date> = {};
  if (filters.from) range.$gte = filters.from;
  if (filters.to) range.$lte = filters.to;
  return { [field]: range };
}

function matchCurrency(filters: ReportFilters): Record<string, unknown> {
  return { currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY };
}

function clientProjectMatch(filters: ReportFilters): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.clientId) match.clientId = new Types.ObjectId(filters.clientId);
  if (filters.projectId) match.projectId = new Types.ObjectId(filters.projectId);
  return match;
}

/** Posted invoice statuses that represent issued commercial documents (not drafts/cancelled). */
const POSTED_INVOICE_STATUSES = ['issued', 'partially_paid', 'paid', 'overdue', 'credited'];

export class ReportsService {
  /**
   * Catalog of available reports with explicit cash vs invoice basis.
   */
  getCatalog() {
    return [
      {
        id: 'invoiced_revenue',
        title: 'Invoiced revenue',
        basis: 'invoice' as const,
        summary:
          'Sum of issued invoice grand totals (tax-inclusive as stored). Credit notes reduce revenue.',
      },
      {
        id: 'payments_received',
        title: 'Confirmed payments received',
        basis: 'cash' as const,
        summary: 'Only confirmed non-refund payments. Pending/failed never count.',
      },
      {
        id: 'outstanding_receivables',
        title: 'Outstanding receivables',
        basis: 'invoice' as const,
        summary: 'Open invoice balanceDueMinor across posted invoices.',
      },
      {
        id: 'overdue_invoices',
        title: 'Overdue invoices',
        basis: 'invoice' as const,
        summary: 'Posted invoices with remaining balance past due date.',
      },
      {
        id: 'refunds_adjustments',
        title: 'Refunds and adjustments',
        basis: 'mixed' as const,
        summary: 'Confirmed refund payments plus issued credit notes.',
      },
      {
        id: 'recorded_expenses',
        title: 'Recorded expenses',
        basis: 'cash' as const,
        summary: 'Recorded and finalized expenses (void/draft excluded). Actual cost records only.',
      },
      {
        id: 'project_profitability',
        title: 'Project profitability',
        basis: 'mixed' as const,
        summary:
          'Per-project invoiced revenue, cash collected, expenses, and gross margin. Not estimated.',
      },
      {
        id: 'client_balances',
        title: 'Client revenue and balances',
        basis: 'mixed' as const,
        summary: 'Per-client invoiced totals, cash received, and outstanding balances.',
      },
      {
        id: 'recurring',
        title: 'Recurring revenue and costs',
        basis: 'mixed' as const,
        summary:
          'Recurring-flagged expenses and projects with recurring billing model — only where records exist.',
      },
      {
        id: 'executive_dashboard',
        title: 'Executive dashboard',
        basis: 'mixed' as const,
        summary:
          'Live operational counts, financial actuals, trends, renewals, maintenance, and recent activity.',
      },
    ];
  }

  private methodology(id: string): ReportMethodology {
    const map: Record<string, ReportMethodology> = {
      invoiced_revenue: {
        basis: 'invoice',
        description:
          'Invoice-based: uses issued invoice grandTotalMinor. Does not equal cash collected.',
        taxTreatment: 'Grand totals include tax as stored on each invoice (CGST/SGST/IGST/custom).',
        refundTreatment: 'Credit notes (kind=credit_note) are subtracted from invoiced revenue.',
        expenseTreatment: 'Expenses are not included in this report.',
      },
      payments_received: {
        basis: 'cash',
        description:
          'Cash-based: confirmed payments only. Pending and failed payments are excluded.',
        taxTreatment: 'Payment amounts are face-value received; tax split is not re-derived here.',
        refundTreatment: 'Refund child payments (refundOfPaymentId set) are excluded from received.',
        expenseTreatment: 'Expenses are not included.',
      },
      outstanding_receivables: {
        basis: 'invoice',
        description: 'Invoice-based open balances (balanceDueMinor) on posted invoices.',
        taxTreatment: 'Balances are tax-inclusive remaining amounts.',
        refundTreatment: 'Credits already reduce balanceDueMinor on the source invoice.',
        expenseTreatment: 'Not included.',
      },
      overdue_invoices: {
        basis: 'invoice',
        description: 'Posted invoices with balanceDueMinor > 0 and dueDate before now.',
        taxTreatment: 'Uses stored tax-inclusive balances.',
        refundTreatment: 'Credits already reflected in balance.',
        expenseTreatment: 'Not included.',
      },
      refunds_adjustments: {
        basis: 'mixed',
        description: 'Cash refunds (confirmed refund payments) plus invoice credit notes.',
        taxTreatment: 'Credit note totals include tax as stored; refunds are face-value cash out.',
        refundTreatment: 'Listed explicitly; not double-counted as received cash.',
        expenseTreatment: 'Not included.',
      },
      recorded_expenses: {
        basis: 'cash',
        description: 'Actual expense records in recorded or finalized status within the date range.',
        taxTreatment: 'Expense amounts are stored as entered (no automatic tax reverse-charge).',
        refundTreatment: 'Not applicable.',
        expenseTreatment: 'Void and draft expenses are excluded from totals.',
      },
      project_profitability: {
        basis: 'mixed',
        description:
          'Gross profitability = invoiced revenue − project expenses (invoice basis for revenue). Cash collected shown separately — never presented as profit alone.',
        taxTreatment: 'Revenue uses invoice grand totals (tax-inclusive).',
        refundTreatment: 'Credit notes linked to project invoices reduce invoiced revenue.',
        expenseTreatment: 'Only recorded/finalized expenses linked to the project.',
      },
      client_balances: {
        basis: 'mixed',
        description: 'Per-client invoiced revenue, confirmed cash received, and outstanding balances.',
        taxTreatment: 'Tax-inclusive invoice figures.',
        refundTreatment: 'Refunds reduce net cash; credit notes reduce invoiced/outstanding.',
        expenseTreatment: 'Client-linked expenses listed separately, not netted into “profit”.',
      },
      recurring: {
        basis: 'mixed',
        description:
          'Only records explicitly marked recurring (expenses) or projects with billingModel=recurring.',
        taxTreatment: 'As stored on underlying records.',
        refundTreatment: 'Not projected.',
        expenseTreatment: 'Recurring expenses only; no fabricated run-rate.',
      },
    };
    return map[id];
  }

  async summary(filters: ReportFilters) {
    const currency = filters.currency ?? DEFAULT_AGENCY_CURRENCY;
    const [
      invoiced,
      credits,
      payments,
      refunds,
      outstanding,
      overdue,
      expenses,
    ] = await Promise.all([
      this.sumInvoicedRevenue(filters),
      this.sumCreditNotes(filters),
      this.sumConfirmedPayments(filters),
      this.sumRefunds(filters),
      this.sumOutstanding(filters),
      this.countOverdue(filters),
      this.sumExpenses(filters),
    ]);

    return {
      currency,
      filters: {
        from: filters.from?.toISOString(),
        to: filters.to?.toISOString(),
        clientId: filters.clientId ?? null,
        projectId: filters.projectId ?? null,
      },
      methodologyNote:
        'Invoiced revenue ≠ money collected. All figures are derived from live MongoDB records; not estimated values.',
      totals: {
        invoicedRevenueMinor: invoiced - credits,
        invoicedGrossMinor: invoiced,
        creditNotesMinor: credits,
        confirmedPaymentsReceivedMinor: payments,
        refundsMinor: refunds,
        netCashReceivedMinor: payments - refunds,
        outstandingReceivablesMinor: outstanding,
        overdueInvoiceCount: overdue.count,
        overdueBalanceMinor: overdue.balanceMinor,
        recordedExpensesMinor: expenses,
        /** Gross margin on invoice basis for filtered scope — not cash profit */
        grossMarginInvoiceBasisMinor: invoiced - credits - expenses,
      },
      definitions: {
        invoicedRevenue: this.methodology('invoiced_revenue'),
        paymentsReceived: this.methodology('payments_received'),
        outstanding: this.methodology('outstanding_receivables'),
        expenses: this.methodology('recorded_expenses'),
      },
    };
  }

  private async sumInvoicedRevenue(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'invoice',
      status: { $in: POSTED_INVOICE_STATUSES },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };
    const rows = await AgencyInvoice.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$grandTotalMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  private async sumCreditNotes(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'credit_note',
      status: { $nin: ['draft', 'cancelled'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };
    const rows = await AgencyInvoice.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$grandTotalMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  private async sumConfirmedPayments(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'confirmed',
      refundOfPaymentId: null,
      ...matchCurrency(filters),
      ...dateRange('paymentDate', filters),
    };
    if (filters.clientId) match.clientId = new Types.ObjectId(filters.clientId);
    if (filters.projectId) {
      // Payments linked via allocations to project invoices
      const invoiceIds = await AgencyInvoice.find({
        projectId: filters.projectId,
        isDeleted: { $ne: true },
      })
        .select('_id')
        .exec();
      match['allocations.invoiceId'] = { $in: invoiceIds.map((i) => i._id) };
    }
    const rows = await AgencyPayment.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  private async sumRefunds(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'confirmed',
      refundOfPaymentId: { $ne: null },
      ...matchCurrency(filters),
      ...dateRange('paymentDate', filters),
    };
    if (filters.clientId) match.clientId = new Types.ObjectId(filters.clientId);
    const rows = await AgencyPayment.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  private async sumOutstanding(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'invoice',
      status: { $in: ['issued', 'partially_paid', 'overdue'] },
      balanceDueMinor: { $gt: 0 },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
    };
    // Outstanding is a point-in-time snapshot — date filter applies to issueDate when provided
    Object.assign(match, dateRange('issueDate', filters));
    const rows = await AgencyInvoice.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$balanceDueMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  private async countOverdue(filters: ReportFilters) {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'invoice',
      balanceDueMinor: { $gt: 0 },
      dueDate: { $lt: new Date() },
      status: { $in: ['issued', 'partially_paid', 'overdue'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
    };
    const rows = await AgencyInvoice.aggregate<{ count: number; balanceMinor: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          balanceMinor: { $sum: '$balanceDueMinor' },
        },
      },
    ]).exec();
    return { count: rows[0]?.count ?? 0, balanceMinor: rows[0]?.balanceMinor ?? 0 };
  }

  private async sumExpenses(filters: ReportFilters): Promise<number> {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['recorded', 'finalized'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('expenseDate', filters),
    };
    const rows = await AgencyExpense.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]).exec();
    return rows[0]?.total ?? 0;
  }

  async overdueInvoices(filters: ReportFilters, pagination: PaginationQuery) {
    const { page, limit, skip } = parsePaginationQuery({
      ...pagination,
      sort: pagination.sort ?? 'dueDate',
      order: pagination.order ?? 'asc',
    });
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'invoice',
      balanceDueMinor: { $gt: 0 },
      dueDate: { $lt: new Date() },
      status: { $in: ['issued', 'partially_paid', 'overdue'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
    };
    const [items, total] = await Promise.all([
      AgencyInvoice.find(match).sort({ dueDate: 1 }).skip(skip).limit(limit).exec(),
      AgencyInvoice.countDocuments(match).exec(),
    ]);
    const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
    const clients = await AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec();
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      methodology: this.methodology('overdue_invoices'),
      items: items.map((inv) => {
        const client = clientMap.get(String(inv.clientId));
        return {
          id: inv.id,
          code: inv.code,
          title: inv.title,
          clientId: String(inv.clientId),
          clientName: client?.name,
          clientCode: client?.code,
          dueDate: inv.dueDate?.toISOString(),
          grandTotalMinor: inv.grandTotalMinor,
          balanceDueMinor: inv.balanceDueMinor,
          currency: inv.currency,
          status: inv.status,
        };
      }),
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async projectProfitability(filters: ReportFilters, pagination: PaginationQuery) {
    const { page, limit, skip } = parsePaginationQuery({
      ...pagination,
      sort: pagination.sort ?? 'name',
      order: pagination.order ?? 'asc',
    });

    const projectFilter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filters.clientId) projectFilter.clientId = filters.clientId;
    if (filters.projectId) projectFilter._id = filters.projectId;

    const [projects, total] = await Promise.all([
      AgencyProject.find(projectFilter).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      AgencyProject.countDocuments(projectFilter).exec(),
    ]);

    const rows = await Promise.all(
      projects.map(async (project) => {
        const scope: ReportFilters = {
          ...filters,
          clientId: String(project.clientId),
          projectId: project.id,
        };
        const [invoiced, credits, cash, expenses] = await Promise.all([
          this.sumInvoicedRevenue(scope),
          this.sumCreditNotes(scope),
          this.sumConfirmedPayments(scope),
          this.sumExpenses(scope),
        ]);
        const invoicedNet = invoiced - credits;
        return {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          clientId: String(project.clientId),
          currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
          invoicedRevenueMinor: invoicedNet,
          cashCollectedMinor: cash,
          expensesMinor: expenses,
          /** Invoice-basis gross margin — not cash profit and not estimated */
          grossProfitInvoiceBasisMinor: invoicedNet - expenses,
          note:
            cash !== invoicedNet
              ? 'Cash collected differs from invoiced revenue — both are actuals, not estimates.'
              : undefined,
        };
      }),
    );

    return {
      methodology: this.methodology('project_profitability'),
      items: rows,
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async clientBalances(filters: ReportFilters, pagination: PaginationQuery) {
    const { page, limit, skip } = parsePaginationQuery({
      ...pagination,
      sort: pagination.sort ?? 'name',
      order: pagination.order ?? 'asc',
    });

    const clientFilter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filters.clientId) clientFilter._id = filters.clientId;

    const [clients, total] = await Promise.all([
      AgencyClient.find(clientFilter).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      AgencyClient.countDocuments(clientFilter).exec(),
    ]);

    const rows = await Promise.all(
      clients.map(async (client) => {
        const scope: ReportFilters = { ...filters, clientId: client.id, projectId: undefined };
        const [invoiced, credits, cash, refunds, outstanding, expenses] = await Promise.all([
          this.sumInvoicedRevenue(scope),
          this.sumCreditNotes(scope),
          this.sumConfirmedPayments(scope),
          this.sumRefunds(scope),
          this.sumOutstanding(scope),
          this.sumExpenses(scope),
        ]);
        return {
          clientId: client.id,
          clientCode: client.code,
          clientName: client.name,
          currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
          invoicedRevenueMinor: invoiced - credits,
          cashReceivedMinor: cash,
          refundsMinor: refunds,
          netCashMinor: cash - refunds,
          outstandingMinor: outstanding,
          expensesMinor: expenses,
        };
      }),
    );

    return {
      methodology: this.methodology('client_balances'),
      items: rows,
      meta: buildPaginationMeta(total, page, limit) as PaginationMeta,
    };
  }

  async recurring(filters: ReportFilters) {
    const expenseMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      isRecurring: true,
      status: { $in: ['recorded', 'finalized'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('expenseDate', filters),
    };
    const projectMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      billingModel: 'recurring',
    };
    if (filters.clientId) projectMatch.clientId = filters.clientId;
    if (filters.projectId) projectMatch._id = filters.projectId;

    const [expenses, projects] = await Promise.all([
      AgencyExpense.find(expenseMatch).sort({ expenseDate: -1 }).limit(200).exec(),
      AgencyProject.find(projectMatch).select('code name clientId billingModel contractValue').limit(200).exec(),
    ]);

    const expenseTotal = expenses.reduce((s, e) => s + e.amountMinor, 0);
    const contractTotal = projects.reduce(
      (s, p) => s + (p.contractValue?.amountMinor ?? 0),
      0,
    );

    return {
      methodology: this.methodology('recurring'),
      disclaimer:
        'Only existing recurring-flagged records are listed. No projected or annualized estimates are invented.',
      expenses: {
        count: expenses.length,
        totalMinor: expenseTotal,
        currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
        items: expenses.map((e) => ({
          id: e.id,
          code: e.code,
          vendor: e.vendor,
          category: e.category,
          amountMinor: e.amountMinor,
          recurringInterval: e.recurringInterval,
          expenseDate: e.expenseDate.toISOString(),
          clientId: e.clientId ? String(e.clientId) : null,
          projectId: e.projectId ? String(e.projectId) : null,
        })),
      },
      recurringProjects: {
        count: projects.length,
        contractValueTotalMinor: contractTotal,
        currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
        items: projects.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          clientId: String(p.clientId),
          contractValueMinor: p.contractValue?.amountMinor ?? 0,
          currency: p.contractValue?.currency ?? DEFAULT_AGENCY_CURRENCY,
        })),
      },
    };
  }

  async expensesBreakdown(filters: ReportFilters) {
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['recorded', 'finalized'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('expenseDate', filters),
    };
    const byCategory = await AgencyExpense.aggregate<{
      _id: string;
      totalMinor: number;
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalMinor: { $sum: '$amountMinor' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalMinor: -1 } },
    ]).exec();

    const totalMinor = byCategory.reduce((s, r) => s + r.totalMinor, 0);
    return {
      methodology: this.methodology('recorded_expenses'),
      currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
      totalMinor,
      byCategory: byCategory.map((r) => ({
        category: r._id,
        totalMinor: r.totalMinor,
        count: r.count,
      })),
    };
  }

  async refundsAndAdjustments(filters: ReportFilters) {
    const refundMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'confirmed',
      refundOfPaymentId: { $ne: null },
      ...matchCurrency(filters),
      ...dateRange('paymentDate', filters),
    };
    if (filters.clientId) refundMatch.clientId = new Types.ObjectId(filters.clientId);

    const creditMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'credit_note',
      status: { $nin: ['draft', 'cancelled'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };

    const [refunds, credits] = await Promise.all([
      AgencyPayment.find(refundMatch).sort({ paymentDate: -1 }).limit(200).exec(),
      AgencyInvoice.find(creditMatch).sort({ issueDate: -1 }).limit(200).exec(),
    ]);

    return {
      methodology: this.methodology('refunds_adjustments'),
      currency: filters.currency ?? DEFAULT_AGENCY_CURRENCY,
      refundsMinor: refunds.reduce((s, r) => s + r.amountMinor, 0),
      creditNotesMinor: credits.reduce((s, c) => s + c.grandTotalMinor, 0),
      refunds: refunds.map((r) => ({
        id: r.id,
        code: r.code,
        amountMinor: r.amountMinor,
        paymentDate: r.paymentDate.toISOString(),
        refundOfPaymentId: r.refundOfPaymentId ? String(r.refundOfPaymentId) : null,
        clientId: String(r.clientId),
      })),
      creditNotes: credits.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        amountMinor: c.grandTotalMinor,
        issueDate: c.issueDate?.toISOString(),
        originalInvoiceId: c.originalInvoiceId ? String(c.originalInvoiceId) : null,
        clientId: String(c.clientId),
      })),
    };
  }

  /** CSV export helper — actual values only */
  toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
    const escape = (value: string | number | null | undefined) => {
      const s = value == null ? '' : String(value);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
      '\n',
    );
  }

  async exportSummaryCsv(filters: ReportFilters): Promise<{ filename: string; csv: string }> {
    const summary = await this.summary(filters);
    const t = summary.totals;
    const csv = this.toCsv(
      ['metric', 'basis', 'amount_minor', 'currency', 'notes'],
      [
        [
          'invoiced_revenue_net',
          'invoice',
          t.invoicedRevenueMinor,
          summary.currency,
          'Issued invoices minus credit notes',
        ],
        [
          'confirmed_payments_received',
          'cash',
          t.confirmedPaymentsReceivedMinor,
          summary.currency,
          'Excludes pending/failed/refunds',
        ],
        ['refunds', 'cash', t.refundsMinor, summary.currency, 'Confirmed refund payments'],
        [
          'net_cash_received',
          'cash',
          t.netCashReceivedMinor,
          summary.currency,
          'Payments minus refunds',
        ],
        [
          'outstanding_receivables',
          'invoice',
          t.outstandingReceivablesMinor,
          summary.currency,
          'Open balances',
        ],
        [
          'overdue_balance',
          'invoice',
          t.overdueBalanceMinor,
          summary.currency,
          `${t.overdueInvoiceCount} invoices`,
        ],
        [
          'recorded_expenses',
          'expense',
          t.recordedExpensesMinor,
          summary.currency,
          'Recorded+finalized only',
        ],
        [
          'gross_margin_invoice_basis',
          'mixed',
          t.grossMarginInvoiceBasisMinor,
          summary.currency,
          'Invoiced net minus expenses — not cash profit',
        ],
      ],
    );
    return { filename: `agency-report-summary-${Date.now()}.csv`, csv };
  }

  async exportProjectProfitabilityCsv(filters: ReportFilters) {
    const result = await this.projectProfitability(filters, { page: 1, limit: 500 });
    const csv = this.toCsv(
      [
        'project_code',
        'project_name',
        'invoiced_revenue_minor',
        'cash_collected_minor',
        'expenses_minor',
        'gross_profit_invoice_basis_minor',
        'currency',
      ],
      result.items.map((r) => [
        r.projectCode,
        r.projectName,
        r.invoicedRevenueMinor,
        r.cashCollectedMinor,
        r.expensesMinor,
        r.grossProfitInvoiceBasisMinor,
        r.currency,
      ]),
    );
    return { filename: `agency-project-profitability-${Date.now()}.csv`, csv };
  }

  async exportClientBalancesCsv(filters: ReportFilters) {
    const result = await this.clientBalances(filters, { page: 1, limit: 500 });
    const csv = this.toCsv(
      [
        'client_code',
        'client_name',
        'invoiced_revenue_minor',
        'cash_received_minor',
        'refunds_minor',
        'net_cash_minor',
        'outstanding_minor',
        'expenses_minor',
        'currency',
      ],
      result.items.map((r) => [
        r.clientCode,
        r.clientName,
        r.invoicedRevenueMinor,
        r.cashReceivedMinor,
        r.refundsMinor,
        r.netCashMinor,
        r.outstandingMinor,
        r.expensesMinor,
        r.currency,
      ]),
    );
    return { filename: `agency-client-balances-${Date.now()}.csv`, csv };
  }

  /**
   * Executive dashboard — all figures from live records.
   *
   * Definitions:
   * - Active clients: status=active, not deleted (point-in-time; not date-ranged).
   * - Projects active/completed: status match, not deleted.
   * - Projects overdue: status in active|planned|on_hold, targetDeliveryDate < now, no completionDate.
   * - Quotations awaiting decision: status=issued (not expired status); still listed if expiryDate passed until marked expired.
   * - Finance totals: same as summary() — invoiced net of credit notes; confirmed payments exclude refunds/pending;
   *   outstanding uses balanceDueMinor (allocation-aware); overdue uses dueDate + open balance.
   * - Gross margin: invoiced net − recorded/finalized expenses (invoice basis, not cash profit).
   * - Trends: monthly buckets of invoiced net and expenses within range (default last 12 months).
   * - Revenue by service: posted invoice grand totals (minus credit notes) grouped by linked project's serviceCategory.
   */
  async executiveDashboard(filters: ReportFilters) {
    const currency = filters.currency ?? DEFAULT_AGENCY_CURRENCY;
    const now = new Date();
    const trendFilters = this.resolveTrendFilters(filters);

    const [
      summary,
      operations,
      monthlyTrends,
      revenueByService,
      upcomingRenewals,
      maintenanceExpiring,
      projectProfitability,
      clientBalances,
      recentActivity,
    ] = await Promise.all([
      this.summary(filters),
      this.operationalCounts(filters, now),
      this.monthlyTrends(trendFilters),
      this.revenueByServiceCategory(filters),
      this.upcomingRenewals(filters, now, 90),
      this.maintenanceExpiringSoon(filters, now, 90),
      this.projectProfitability(filters, { page: 1, limit: 15 }),
      this.clientBalances(filters, { page: 1, limit: 15 }),
      activityService.list({
        page: 1,
        limit: 20,
        clientId: filters.clientId,
        projectId: filters.projectId,
      }),
    ]);

    return {
      currency,
      generatedAt: now.toISOString(),
      filters: summary.filters,
      methodologyNote: summary.methodologyNote,
      definitions: {
        ...summary.definitions,
        operations: {
          basis: 'mixed' as const,
          description:
            'Live counts from client/project/quotation collections. Overdue projects use targetDeliveryDate, not estimates.',
          taxTreatment: 'N/A',
          refundTreatment: 'N/A',
          expenseTreatment: 'N/A',
        },
        trends: {
          basis: 'mixed' as const,
          description:
            'Monthly invoiced revenue (issued invoices − credit notes by issueDate) and recorded/finalized expenses by expenseDate.',
          taxTreatment: 'Tax-inclusive invoice grand totals.',
          refundTreatment: 'Credit notes reduce invoiced revenue in the month of the credit note issueDate.',
          expenseTreatment: 'Draft/void expenses excluded.',
        },
        revenueByService: {
          basis: 'invoice' as const,
          description:
            'Posted invoice revenue attributed via project.serviceCategory. Unlinked invoices appear as uncategorized.',
          taxTreatment: 'Tax-inclusive.',
          refundTreatment: 'Credit notes attributed the same way and subtracted.',
          expenseTreatment: 'Not included in this breakdown.',
        },
      },
      operations,
      finance: summary.totals,
      monthlyTrends,
      revenueByServiceCategory: revenueByService,
      upcomingRenewals,
      maintenanceExpiring,
      projectProfitability: {
        methodology: projectProfitability.methodology,
        items: projectProfitability.items,
      },
      clientBalances: {
        methodology: clientBalances.methodology,
        items: clientBalances.items,
      },
      recentActivity: recentActivity.items,
    };
  }

  private resolveTrendFilters(filters: ReportFilters): ReportFilters {
    if (filters.from || filters.to) return filters;
    const to = new Date();
    const from = new Date(to);
    from.setUTCMonth(from.getUTCMonth() - 11);
    from.setUTCDate(1);
    from.setUTCHours(0, 0, 0, 0);
    return { ...filters, from, to };
  }

  private async operationalCounts(filters: ReportFilters, now: Date) {
    const clientMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'active',
    };
    if (filters.clientId) clientMatch._id = new Types.ObjectId(filters.clientId);

    const projectBase: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (filters.clientId) projectBase.clientId = new Types.ObjectId(filters.clientId);
    if (filters.projectId) projectBase._id = new Types.ObjectId(filters.projectId);

    const quotationMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: 'issued',
    };
    if (filters.clientId) quotationMatch.clientId = new Types.ObjectId(filters.clientId);
    if (filters.projectId) quotationMatch.projectId = new Types.ObjectId(filters.projectId);

    const [
      activeClients,
      projectsActive,
      projectsCompleted,
      projectsOverdue,
      quotationsAwaitingDecision,
    ] = await Promise.all([
      AgencyClient.countDocuments(clientMatch).exec(),
      AgencyProject.countDocuments({ ...projectBase, status: 'active' }).exec(),
      AgencyProject.countDocuments({ ...projectBase, status: 'completed' }).exec(),
      AgencyProject.countDocuments({
        ...projectBase,
        status: { $in: ['active', 'planned', 'on_hold'] },
        targetDeliveryDate: { $lt: now },
        $or: [{ completionDate: null }, { completionDate: { $exists: false } }],
      }).exec(),
      AgencyQuotation.countDocuments(quotationMatch).exec(),
    ]);

    return {
      activeClients,
      projectsActive,
      projectsCompleted,
      projectsOverdue,
      quotationsAwaitingDecision,
      definitions: {
        overdueProjects:
          'status ∈ {active, planned, on_hold} AND targetDeliveryDate < now AND completionDate empty',
        quotationsAwaitingDecision: 'status = issued (awaiting accept/reject)',
      },
    };
  }

  private async monthlyTrends(filters: ReportFilters) {
    const currency = filters.currency ?? DEFAULT_AGENCY_CURRENCY;
    const invoiceMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'invoice',
      status: { $in: POSTED_INVOICE_STATUSES },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };
    const creditMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      kind: 'credit_note',
      status: { $nin: ['draft', 'cancelled'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };
    const expenseMatch: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['recorded', 'finalized'] },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('expenseDate', filters),
    };

    const [invoicedRows, creditRows, expenseRows, paymentRows] = await Promise.all([
      AgencyInvoice.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: invoiceMatch },
        {
          $group: {
            _id: { y: { $year: '$issueDate' }, m: { $month: '$issueDate' } },
            total: { $sum: '$grandTotalMinor' },
          },
        },
      ]).exec(),
      AgencyInvoice.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: creditMatch },
        {
          $group: {
            _id: { y: { $year: '$issueDate' }, m: { $month: '$issueDate' } },
            total: { $sum: '$grandTotalMinor' },
          },
        },
      ]).exec(),
      AgencyExpense.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: expenseMatch },
        {
          $group: {
            _id: { y: { $year: '$expenseDate' }, m: { $month: '$expenseDate' } },
            total: { $sum: '$amountMinor' },
          },
        },
      ]).exec(),
      AgencyPayment.aggregate<{ _id: { y: number; m: number }; total: number }>([
        {
          $match: {
            isDeleted: { $ne: true },
            status: 'confirmed',
            refundOfPaymentId: null,
            ...matchCurrency(filters),
            ...(filters.clientId
              ? { clientId: new Types.ObjectId(filters.clientId) }
              : {}),
            ...dateRange('paymentDate', filters),
          },
        },
        {
          $group: {
            _id: { y: { $year: '$paymentDate' }, m: { $month: '$paymentDate' } },
            total: { $sum: '$amountMinor' },
          },
        },
      ]).exec(),
    ]);

    const mapKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
    const invoicedMap = new Map(invoicedRows.map((r) => [mapKey(r._id.y, r._id.m), r.total]));
    const creditMap = new Map(creditRows.map((r) => [mapKey(r._id.y, r._id.m), r.total]));
    const expenseMap = new Map(expenseRows.map((r) => [mapKey(r._id.y, r._id.m), r.total]));
    const paymentMap = new Map(paymentRows.map((r) => [mapKey(r._id.y, r._id.m), r.total]));

    const months: Array<{
      month: string;
      invoicedRevenueMinor: number;
      expensesMinor: number;
      confirmedPaymentsMinor: number;
    }> = [];

    const cursor = new Date(filters.from ?? new Date());
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = filters.to ? new Date(filters.to) : new Date();
    end.setUTCDate(1);

    // Safety: max 36 months
    for (let i = 0; i < 36; i += 1) {
      if (cursor > end) break;
      const key = mapKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
      const invoiced = invoicedMap.get(key) ?? 0;
      const credits = creditMap.get(key) ?? 0;
      months.push({
        month: key,
        invoicedRevenueMinor: invoiced - credits,
        expensesMinor: expenseMap.get(key) ?? 0,
        confirmedPaymentsMinor: paymentMap.get(key) ?? 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return { currency, months };
  }

  private async revenueByServiceCategory(filters: ReportFilters) {
    const currency = filters.currency ?? DEFAULT_AGENCY_CURRENCY;
    const projectCollection = AgencyProject.collection.name;

    const baseMatch = {
      isDeleted: { $ne: true },
      ...matchCurrency(filters),
      ...clientProjectMatch(filters),
      ...dateRange('issueDate', filters),
    };

    const pipeline = (kind: 'invoice' | 'credit_note', statuses: Record<string, unknown>) => [
      {
        $match: {
          ...baseMatch,
          kind,
          ...statuses,
        },
      },
      {
        $lookup: {
          from: projectCollection,
          localField: 'projectId',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            $ifNull: [
              { $cond: [{ $eq: ['$project.serviceCategory', ''] }, null, '$project.serviceCategory'] },
              'uncategorized',
            ],
          },
          totalMinor: { $sum: '$grandTotalMinor' },
          count: { $sum: 1 },
        },
      },
    ];

    const [invoiceRows, creditRows] = await Promise.all([
      AgencyInvoice.aggregate<{ _id: string; totalMinor: number; count: number }>(
        pipeline('invoice', { status: { $in: POSTED_INVOICE_STATUSES } }),
      ).exec(),
      AgencyInvoice.aggregate<{ _id: string; totalMinor: number; count: number }>(
        pipeline('credit_note', { status: { $nin: ['draft', 'cancelled'] } }),
      ).exec(),
    ]);

    const creditMap = new Map(creditRows.map((r) => [r._id || 'uncategorized', r.totalMinor]));
    const categories = new Map<
      string,
      { serviceCategory: string; invoicedGrossMinor: number; creditNotesMinor: number; netMinor: number; invoiceCount: number }
    >();

    for (const row of invoiceRows) {
      const key = row._id || 'uncategorized';
      const credits = creditMap.get(key) ?? 0;
      categories.set(key, {
        serviceCategory: key,
        invoicedGrossMinor: row.totalMinor,
        creditNotesMinor: credits,
        netMinor: row.totalMinor - credits,
        invoiceCount: row.count,
      });
      creditMap.delete(key);
    }
    for (const [key, credits] of creditMap) {
      categories.set(key, {
        serviceCategory: key,
        invoicedGrossMinor: 0,
        creditNotesMinor: credits,
        netMinor: -credits,
        invoiceCount: 0,
      });
    }

    const items = [...categories.values()].sort((a, b) => b.netMinor - a.netMinor);
    return {
      currency,
      items,
      totalNetMinor: items.reduce((s, i) => s + i.netMinor, 0),
    };
  }

  private async upcomingRenewals(filters: ReportFilters, now: Date, withinDays: number) {
    const until = new Date(now);
    until.setUTCDate(until.getUTCDate() + withinDays);
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['pending', 'reminded'] },
      kind: { $in: ['domain', 'hosting', 'ssl'] },
      dueDate: { $gte: now, $lte: until },
    };
    if (filters.clientId) match.clientId = new Types.ObjectId(filters.clientId);

    const items = await AgencyRenewal.find(match).sort({ dueDate: 1 }).limit(25).exec();
    const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
    const clients = await AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec();
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      withinDays,
      count: items.length,
      items: items.map((r) => {
        const client = clientMap.get(String(r.clientId));
        return {
          id: r.id,
          code: r.code,
          kind: r.kind,
          title: r.title,
          dueDate: r.dueDate.toISOString(),
          status: r.status,
          clientId: String(r.clientId),
          clientName: client?.name,
          clientCode: client?.code,
        };
      }),
    };
  }

  private async maintenanceExpiringSoon(filters: ReportFilters, now: Date, withinDays: number) {
    const until = new Date(now);
    until.setUTCDate(until.getUTCDate() + withinDays);
    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['active', 'expiring_soon'] },
      $or: [
        { endDate: { $gte: now, $lte: until } },
        { renewalDate: { $gte: now, $lte: until } },
        { status: 'expiring_soon' },
      ],
    };
    if (filters.clientId) match.clientId = new Types.ObjectId(filters.clientId);
    if (filters.projectId) match.projectId = new Types.ObjectId(filters.projectId);

    const items = await MaintenanceAgreement.find(match).sort({ endDate: 1 }).limit(25).exec();
    const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
    const clients = await AgencyClient.find({ _id: { $in: clientIds } }).select('name code').exec();
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return {
      withinDays,
      count: items.length,
      items: items.map((a) => {
        const client = clientMap.get(String(a.clientId));
        return {
          id: a.id,
          code: a.code,
          planName: a.planName,
          status: a.status,
          endDate: a.endDate?.toISOString(),
          renewalDate: a.renewalDate?.toISOString(),
          recurringChargeMinor: a.recurringChargeMinor,
          currency: a.currency,
          clientId: String(a.clientId),
          clientName: client?.name,
          projectId: a.projectId ? String(a.projectId) : null,
        };
      }),
    };
  }

  async exportExecutiveDashboardCsv(filters: ReportFilters) {
    const dash = await this.executiveDashboard(filters);
    const csv = this.toCsv(
      ['section', 'metric', 'value', 'unit', 'notes'],
      [
        ['operations', 'active_clients', dash.operations.activeClients, 'count', 'status=active'],
        ['operations', 'projects_active', dash.operations.projectsActive, 'count', ''],
        ['operations', 'projects_completed', dash.operations.projectsCompleted, 'count', ''],
        [
          'operations',
          'projects_overdue',
          dash.operations.projectsOverdue,
          'count',
          dash.operations.definitions.overdueProjects,
        ],
        [
          'operations',
          'quotations_awaiting_decision',
          dash.operations.quotationsAwaitingDecision,
          'count',
          'status=issued',
        ],
        [
          'finance',
          'invoiced_revenue_net',
          dash.finance.invoicedRevenueMinor,
          dash.currency,
          'invoice − credit notes',
        ],
        [
          'finance',
          'confirmed_payments_received',
          dash.finance.confirmedPaymentsReceivedMinor,
          dash.currency,
          'excludes pending/failed/refunds',
        ],
        ['finance', 'refunds', dash.finance.refundsMinor, dash.currency, 'confirmed refunds'],
        [
          'finance',
          'net_cash_received',
          dash.finance.netCashReceivedMinor,
          dash.currency,
          'payments − refunds',
        ],
        [
          'finance',
          'outstanding_receivables',
          dash.finance.outstandingReceivablesMinor,
          dash.currency,
          'balanceDueMinor',
        ],
        [
          'finance',
          'overdue_balance',
          dash.finance.overdueBalanceMinor,
          dash.currency,
          `${dash.finance.overdueInvoiceCount} invoices`,
        ],
        [
          'finance',
          'recorded_expenses',
          dash.finance.recordedExpensesMinor,
          dash.currency,
          'recorded+finalized',
        ],
        [
          'finance',
          'gross_margin_invoice_basis',
          dash.finance.grossMarginInvoiceBasisMinor,
          dash.currency,
          'not cash profit',
        ],
        ...dash.monthlyTrends.months.map((m) => [
          'trend',
          m.month,
          m.invoicedRevenueMinor,
          dash.currency,
          `expenses=${m.expensesMinor}; payments=${m.confirmedPaymentsMinor}`,
        ]),
        ...dash.revenueByServiceCategory.items.map((r) => [
          'service_category',
          r.serviceCategory,
          r.netMinor,
          dash.currency,
          `gross=${r.invoicedGrossMinor}; credits=${r.creditNotesMinor}`,
        ]),
      ],
    );
    return { filename: `agency-executive-dashboard-${Date.now()}.csv`, csv };
  }

  async exportExecutiveDashboardPdf(filters: ReportFilters): Promise<{ filename: string; buffer: Buffer }> {
    const dash = await this.executiveDashboard(filters);
    const buffer = await buildExecutiveDashboardPdfBuffer({
      currency: dash.currency as CurrencyCode,
      generatedAt: dash.generatedAt,
      filters: dash.filters,
      operations: {
        activeClients: dash.operations.activeClients,
        projectsActive: dash.operations.projectsActive,
        projectsCompleted: dash.operations.projectsCompleted,
        projectsOverdue: dash.operations.projectsOverdue,
        quotationsAwaitingDecision: dash.operations.quotationsAwaitingDecision,
      },
      finance: {
        invoicedRevenueMinor: dash.finance.invoicedRevenueMinor,
        confirmedPaymentsReceivedMinor: dash.finance.confirmedPaymentsReceivedMinor,
        netCashReceivedMinor: dash.finance.netCashReceivedMinor,
        outstandingReceivablesMinor: dash.finance.outstandingReceivablesMinor,
        overdueBalanceMinor: dash.finance.overdueBalanceMinor,
        recordedExpensesMinor: dash.finance.recordedExpensesMinor,
        grossMarginInvoiceBasisMinor: dash.finance.grossMarginInvoiceBasisMinor,
        refundsMinor: dash.finance.refundsMinor,
      },
      methodologyNote: dash.methodologyNote,
    });
    return { filename: `agency-executive-dashboard-${Date.now()}.pdf`, buffer };
  }
}

export const reportsService = new ReportsService();
