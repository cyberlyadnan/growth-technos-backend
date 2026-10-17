/**
 * Security requirements for AMS financial records, files, and credentials.
 */

export const AGENCY_SECURITY_REQUIREMENTS = {
  version: 2,
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
    'Encrypt secrets at rest with AES-256-GCM (Node crypto). Keys live only in AGENCY_VAULT_* env — never MongoDB or source.',
    'If vault keys are missing, create/reveal/update-secret refuse with an error. There is no plaintext fallback.',
    'Reveal/decrypt requires ASSETS_REVEAL, password reauthentication, rate limiting, and an audit event (no secret in audit).',
    'List/detail responses expose maskedHint only. Plaintext is returned solely from POST .../reveal.',
    'Key rotation: add new version to AGENCY_VAULT_KEYS_JSON, set AGENCY_VAULT_ACTIVE_KEY_VERSION, rewrap records via POST .../rewrap, then retire old keys.',
  ],
  renewals: [
    'Renewal reminders support in_app and email channels.',
    'Email is sent only when SMTP is configured; otherwise status is email_skipped_unconfigured and delivery is not claimed.',
    'In-process scheduler runs when AGENCY_RENEWAL_REMINDER_ENABLED=true; otherwise use POST /agency/assets/renewals/process-due.',
  ],
  transportAndAuth: [
    'All AMS routes require authenticate + authorize(Permission.*); no public agency endpoints.',
    'Admin UI is not a security boundary — API enforcement is mandatory.',
    'Refresh existing admin sessions after permission set changes so JWT payloads include AMS scopes.',
  ],
} as const;

export type AgencySecurityRequirements = typeof AGENCY_SECURITY_REQUIREMENTS;
