import { Types } from 'mongoose';
import { AgencyClient } from '@modules/agency/clients/model/client.model';
import { AgencyInvoice } from '@modules/agency/billing/model/invoice.model';
import { AgencyPayment } from '@modules/agency/billing/model/payment.model';
import { AgencyExpense } from '@modules/agency/expenses/model/expense.model';
import { AgencyProject } from '@modules/agency/projects/model/project.model';
import { DEFAULT_AGENCY_CURRENCY, type CurrencyCode } from '@core/utils/money';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta, PaginationQuery } from '@core/types';

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
}

export const reportsService = new ReportsService();
