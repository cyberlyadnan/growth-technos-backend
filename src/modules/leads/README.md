/**
 * Lead Generation Module — Entity Map
 *
 * Phase 1–8: complete
 * Phase 9: Testing (complete)
 *
 * Tests
 * - backend/src/tests/lead-display-rules.test.ts
 * - backend/src/tests/lead-validation.test.ts
 * - backend/src/tests/lead-events.test.ts
 * - backend/src/tests/leads.integration.test.ts
 * - frontend: display-context / frequency / analytics track
 *
 * Run: `npm test` in backend (filter lead*) and `npx vitest run src/lib/leads src/lib/analytics` in frontend
 *
 * After lead submit, dispatchLeadSubmittedEvents fans out to:
 * - email   (SMTP + LEAD_NOTIFY_EMAIL)
 * - whatsapp (LEAD_WHATSAPP_WEBHOOK_URL)
 * - crm     (LEAD_CRM_WEBHOOK_URL)
 * - analytics (always logged; optional LEAD_ANALYTICS_WEBHOOK_URL)
 *
 * Successful handlers are stored on Lead.eventsTriggered.
 * Submit response includes analytics payload for client dataLayer/gtag.
 *
 * Frontend: lib/analytics/track.ts → lead_submit, cta_click, popup_view, offer_impression
 */
