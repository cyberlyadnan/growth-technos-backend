/**
 * Security requirements for future AMS financial records, files, and credentials.
 * These are enforceable contracts for later phases — not runtime crypto yet.
 */

export const AGENCY_SECURITY_REQUIREMENTS = {
  version: 1,
  financialRecords: [
    'All create/update/delete of quotations, invoices, payments, and expenses must be permission-gated server-side.',
    'Monetary values must be stored as integer minor units (see money utils); never trust client-formatted strings.',
    'Document numbers must be allocated server-side via a monotonic sequence; clients must not invent invoice numbers.',
    'Soft-delete is allowed for drafts; posted invoices/payments require void/credit-note workflows (future), not silent hard delete.',
    'Every financial mutation must write an AgencyActivity / AuditLog entry with actor, entity, and before/after summary.',
  ],
  uploadedFiles: [
    'Agency documents must not reuse public marketing CDN URLs without access checks.',
    'Uploads must validate MIME type and size server-side; prefer private storage with signed URLs for download.',
    'Documents are scoped to Client/Project and inherited permissions of the parent entity.',
    'Virus scanning and retention policies are recommended before production credential/doc vaults go live.',
  ],
  credentials: [
    'Never store credential secrets in plaintext fields or application logs.',
    'Encrypt secrets at rest with a server-side key (env or KMS); only ciphertext + metadata in MongoDB.',
    'Reveal/decrypt requires ASSETS_REVEAL permission and must emit an audit event.',
    'Frontend must never receive raw secrets in list endpoints; detail reveal is an explicit authenticated action.',
    'Rotate encryption keys with a documented re-encryption procedure before enabling the vault.',
  ],
  transportAndAuth: [
    'All AMS routes require authenticate + authorize(Permission.*); no public agency endpoints.',
    'Admin UI is not a security boundary — API enforcement is mandatory.',
    'Refresh existing admin sessions after permission set changes so JWT payloads include AMS scopes.',
  ],
} as const;

export type AgencySecurityRequirements = typeof AGENCY_SECURITY_REQUIREMENTS;
