/**
 * Agency Management System — module registry & relationship blueprint.
 * CRUD for these modules is intentionally deferred to later phases.
 */

export type AgencyModulePhase = 'foundation' | 'planned' | 'next';

export type AgencyModuleId =
  | 'agency'
  | 'clients'
  | 'projects'
  | 'quotations'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'assets'
  | 'maintenance'
  | 'documents'
  | 'reports';

export type AgencyModuleDefinition = {
  id: AgencyModuleId;
  slug: string;
  title: string;
  description: string;
  phase: AgencyModulePhase;
  /** Permission required to enter the module UI / future APIs */
  readPermission: string;
};

export const AGENCY_MODULES: AgencyModuleDefinition[] = [
  {
    id: 'agency',
    slug: 'agency',
    title: 'Agency Overview',
    description: 'Hub for internal agency operations at Growth Technos.',
    phase: 'foundation',
    readPermission: 'agency:read',
  },
  {
    id: 'clients',
    slug: 'clients',
    title: 'Clients',
    description: 'Client accounts converted from leads or created directly.',
    phase: 'foundation',
    readPermission: 'clients:read',
  },
  {
    id: 'projects',
    slug: 'projects',
    title: 'Projects',
    description: 'Delivery projects linked to clients (separate from portfolio CMS).',
    phase: 'foundation',
    readPermission: 'projects:read',
  },
  {
    id: 'quotations',
    slug: 'quotations',
    title: 'Quotations',
    description: 'Commercial proposals before invoicing.',
    phase: 'foundation',
    readPermission: 'quotations:read',
  },
  {
    id: 'invoices',
    slug: 'invoices',
    title: 'Invoices',
    description: 'Client billing documents and balances.',
    phase: 'foundation',
    readPermission: 'invoices:read',
  },
  {
    id: 'payments',
    slug: 'payments',
    title: 'Payments & Receipts',
    description: 'Payment records and receipts against invoices.',
    phase: 'foundation',
    readPermission: 'payments:read',
  },
  {
    id: 'expenses',
    slug: 'expenses',
    title: 'Expenses',
    description: 'Agency and project expense tracking.',
    phase: 'planned',
    readPermission: 'expenses:read',
  },
  {
    id: 'assets',
    slug: 'assets',
    title: 'Assets & Credentials',
    description: 'Hosting accounts and encrypted credentials vault.',
    phase: 'planned',
    readPermission: 'assets:read',
  },
  {
    id: 'maintenance',
    slug: 'maintenance',
    title: 'Maintenance',
    description: 'Retainer and maintenance schedules for clients.',
    phase: 'planned',
    readPermission: 'maintenance:read',
  },
  {
    id: 'documents',
    slug: 'documents',
    title: 'Documents',
    description: 'Client and project document library.',
    phase: 'planned',
    readPermission: 'documents:read',
  },
  {
    id: 'reports',
    slug: 'reports',
    title: 'Reports',
    description: 'Operational and financial summaries.',
    phase: 'planned',
    readPermission: 'reports:read',
  },
];

/**
 * Canonical relationship graph (documentation for implementers).
 * Ops Project ≠ PortfolioProject CMS entity.
 */
export const AGENCY_RELATIONSHIP_GRAPH = {
  Lead: { optionalConvertedClient: 'Client' },
  Client: {
    sourceLead: 'Lead?',
    projects: 'AgencyProject[]',
    quotations: 'Quotation[]',
    invoices: 'Invoice[]',
    expenses: 'Expense[]',
    documents: 'AgencyDocument[]',
    hostingAccounts: 'HostingAccount[]',
    credentials: 'Credential[]',
    maintenance: 'MaintenanceRecord[]',
  },
  AgencyProject: {
    client: 'Client',
    optionalPortfolioLink: 'PortfolioProject?',
    quotations: 'Quotation[]',
    invoices: 'Invoice[]',
    expenses: 'Expense[]',
    documents: 'AgencyDocument[]',
    handover: 'Handover?',
    maintenance: 'MaintenanceRecord[]',
  },
  Quotation: { client: 'Client', project: 'AgencyProject?' },
  Invoice: { client: 'Client', project: 'AgencyProject?', quotation: 'Quotation?' },
  Payment: { invoice: 'Invoice', receipt: 'Receipt?' },
  Receipt: { payment: 'Payment' },
  Expense: { client: 'Client?', project: 'AgencyProject?' },
  HostingAccount: { client: 'Client', project: 'AgencyProject?' },
  Credential: {
    owner: 'Client | AgencyProject | HostingAccount',
    encryptedPayload: true,
  },
  AgencyDocument: { owner: 'Client | AgencyProject | Invoice | Quotation' },
  MaintenanceRecord: { client: 'Client', project: 'AgencyProject?', hosting: 'HostingAccount?' },
  Handover: { project: 'AgencyProject', documents: 'AgencyDocument[]' },
  AgencyActivity: { actor: 'User', entity: 'polymorphic' },
} as const;
