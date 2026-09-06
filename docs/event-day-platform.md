# Event-day platform: implementation and activation

The code extends the existing GitHub Pages frontend and Supabase proposal. It does not create a Supabase project, deploy functions, start a race, approve a real payment or issue a real certificate. Planned fees are ₹600 / ₹700 / ₹800. Migration 004 deliberately leaves registration and payment configuration closed.

## Implemented flow

- **Participant:** verified email → own registrations → confirmed registration number → review HH:MM:SS → submit self-reported finish → certificate preparation/download when approved signing is configured.
- **Organiser:** verified email and active database organiser role → private registration/payment queue → private proof → confirm/reject payment → category clock → capture finish timestamp → associate confirmed participant → review/correct/lock result → reviewed leading times and CSV.
- **Verification:** QR token → public certificate verification, showing only name, category, event date, completion time/source, certificate number and validity. No phone, email, payment proof, raw signature or PDF download URL is exposed.

`components/event-portal.tsx` exports `EventPortal({ onClose?, initialView?: 'participant' | 'organiser' | 'verify' })` and imports its scoped stylesheet. The frontend must open verification view when its URL contains `?certificate=<UUID token>`. It does not retain participant data in localStorage. Existing Auth configuration keeps sessions in memory. Portal data is not an offline cache.

## Database and authority

Apply migrations 001–005 in order in a new/test project first. Keep `marathon_private` outside exposed Data API schemas. Only the small public RPC wrappers are exposed:

| RPC/action | Authority and behavior |
|---|---|
| `event_day('snapshot', {})` | Verified account; owner records only, or event-wide records for an active organiser. Private receipt paths only for organisers. |
| `start_clock` | Organiser; one irreversible start per category through the portal. Request UUID makes a retry idempotent. Requires owner-enabled timing. |
| `capture_finish` | Organiser; request UUID captures server receipt timestamp and elapsed milliseconds before any participant association. Client timestamp is diagnostic only. |
| `associate_finish` | Organiser; confirmed participant and matching category. One finish per registration. Can supersede self-report; cannot overwrite an official/locked result. Existing certificate holds remain. |
| `self_time` | Owner, confirmed payment, started category, open self-submission. Same-time retry is idempotent. Different duplicate submissions require organiser correction permission. Official and locked times cannot be overwritten. |
| `review_payment` | Organiser; pending → verified/rejected only. The existing payment trigger validates reviewer identity. Same decision retries are idempotent. Drive approvals remain supported. |
| `review_result` | Organiser; explicit evidence note and `expected_revision` required. Stale concurrent edits fail. Hold is preserved unless explicitly changed. Locked results cannot be edited through this RPC. |
| `prepare_certificate_backend` / `complete_certificate_backend` | Service-role only. The Edge function supplies an Auth-verified actor; database independently checks ownership or organiser role. |
| `verify_certificate` | Public token lookup; unguessable verification UUID, no registry listing or predictable-number search. |

Human IDs (`SEKO26-00001`) are assigned by a database sequence after payment confirmation. Existing UUIDs remain the durable joins and Drive identifiers; names and BIBs are never used as keys. Human IDs are available in the race desk and organiser export.

Result precedence is recorded explicitly: participant-submitted, organiser-recorded, organiser-verified or organiser-corrected. `prize_eligible` requires organiser provenance and verified/locked status. The UI lists leading reviewed times for the six proposed overall divisions, without awarding prizes or resolving ties automatically. Existing result revisions and private audit rows preserve review evidence. All result changes revoke previously generated certificate records for that result.

The initial self-time sanity floors are 300s / 600s / 1200s, with a 24-hour maximum and rejection of times exceeding the running clock by more than 60s. These are configurable technical checks, **not approved race eligibility rules or age limits**. Organisers must validate them for the event. A certificate hold survives participant correction and official capture association.

## Clock and finish-line operation

These are server-clock-assisted manual records, not chip timing. The displayed clock estimates server offset from a request round trip and refreshes every 30 seconds. The saved finish is timed when the server receives the request, so network delay affects it. Do not claim millisecond timing accuracy from the stored milliseconds. Keep a visible physical/master display, an independent stopwatch and a paper/manual finish order as backup, especially for leading runners and disputes.

On an uncertain capture response, the page retains the same request UUID in memory and labels the button **Retry finish capture**. Retrying does not create a second mark. Reloading loses unsent in-memory requests; already received marks remain in the private unassigned list. There is no offline finish-write queue. Rehearse with separate test accounts/devices in a staging project, never start rehearsal clocks in production. Use explicit lanes/roles for multiple officials to reduce duplicate physical captures. Unassigned surplus marks remain available for reconciliation; no delete/void UI is provided in this edition.

Before race day, the database owner enables `event_day_settings.timing_enabled`; before accepting self-times, enable `self_submission_open`. Starting a clock requires a deliberate organiser confirmation. There is no client reset or role self-enrolment. Locked-result correction requires a documented administrator procedure and certificate reissue, outside normal portal actions.

## Approved certificate setup

1. Obtain the actual approved signer name, designation, visual signature and approval reference. Do not use a synthetic example as approval.
2. Upload a versioned PNG signature to private `certificate-signatures` (maximum 2 MiB). Never put the raw file in `public/`, GitHub, a public Drive link or browser code.
3. Upload tested static TTF/OTF fonts to private `certificate-fonts` (maximum 10 MiB each). Use Latin primary and Devanagari fallback where needed. The OFL Noto test fixtures demonstrate both scripts; keep their license. Unsupported characters fail generation rather than silently replacing a participant's name. The site's variable WOFF2 font is not suitable for this certificate renderer.
4. Set the owner-only `certificate_settings` fields: signer name/designation, versioned signature path, `font_object_path`, optional `fallback_font_object_path`, approval reference/date and the canonical HTTPS frontend base URL **without a fragment**. Then explicitly enable signing.
5. Deploy `supabase/functions/certificate` using its pinned `deno.json`. Set `ALLOWED_ORIGIN=https://reds-aviation.github.io`. Set the certificate configuration's `verification_base_url` to `https://reds-aviation.github.io/sekhonmarathon_suratgarh_2026/` without a fragment. The function verifies every bearer token with Auth `getUser()`; private issuance RPCs are service-role-only even with gateway JWT verification disabled. Never expose a service key in frontend variables.
6. Exercise owner vs other-owner vs organiser access, PDF rendering/download, QR scanning and revoke/reissue using synthetic staging records on actual phones before opening production.

The backend freezes signer/assets/verification URL against an automatic approval revision. If configuration changes during generation, the old pending certificate cannot complete; a new approval revision receives a new certificate record. Use a new storage object path when changing a signature or font; do not overwrite approved files in place. Result changes also invalidate older certificate verification records. PDFs upload without overwrite and receive SHA-256 records. Concurrent upload retries reuse the stored file; private download links expire after 120 seconds.

The signature is an approved **visual facsimile**, not a cryptographically digitally signed PDF. The PDF and verification page state that distinction. Raw assets are backend-only, but a recipient can still copy a visible facsimile from a delivered PDF; technical access controls cannot prevent that. PDF signing with a certificate/private key or HSM is a separate future integration.

The completion certificate UI triggers preparation immediately after a valid self-time when signing is configured. Self-reported provenance stays visible on the PDF and does not confer prize eligibility. Participation certificates are supported by the backend `kind` parameter and currently also require a recorded valid completion. The current participant UI exposes completion downloads. An organiser hold or correction state prevents issuance.

## Deployment, backups and limits

Backend activation still requires the actual project, Auth/OTP setup, organiser accounts, real payment configuration and approved signature. No seeded users, participants, clocks or certificates are included. The preview is honest about unavailable services.

Retain the private Drive organiser register for full participant/payment analysis and distribution fields. The portal CSV is a smaller event-day export; it is not a database backup. Configure provider backups for the database and a separate private backup for receipt/signature/certificate storage, verify restoration in staging, and retain an off-device private export around event day. Backups and schedules have not been activated by this code. Do not copy participant files or signing assets into the public Pages checkout.

Tests execute real PostgreSQL through PGlite with Auth/Storage table stubs. They cover role denials, owner isolation, payment/ID changes, clocks/idempotency, time bounds, capture association, stale review rejection, hold preservation, approval revision mismatches, certificate invalidation and locks. Renderer tests create genuine PDFs using synthetic names/signatures, including mixed Latin/Devanagari. These are not live Supabase Auth/Storage/Edge, concurrent network, physical Android/iPhone or Safari acceptance tests. Production activation requires those integrations and a finish-line rehearsal.

References: [Supabase Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [private signed storage URLs](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl), [PDF-LIB custom fonts](https://pdf-lib.js.org/), [Noto fonts and OFL source](https://github.com/notofonts/noto-fonts).
