# Sekhon Marathon 2026 · Desert Braves

**Air Force Station Suratgarh — The land of Sun and Sand.**

Mobile-first event web app with a station-focused identity, original canal-community canvas artwork, source-checked Sekhon biography and historical running photographs, 5/10/21 KM selection, registration, participant race desk and protected organiser/timing/certificate modules. Built for GitHub Pages, with Supabase Auth/database/private screenshots and a private Google Drive organiser register.

## Current launch state

The public website is an event preview. Registration and payments are closed until the new Supabase project, mail delivery and Suratgarh payment details are configured. Preview mode does not submit records or upload screenshots. There are no real participants or payments in this repository.

Date: 4 October 2026, 05:00–10:00 IST. Registration deadline: 27 September 2026, 23:59:59 IST. Planned fees: 5 KM ₹600; 10 KM ₹700; 21 KM ₹800, subject to procurement confirmation before payments open. Organiser-managed clocks and finish recording replace RFID/chip timing. No caps. Audience: airwarriors and families, gated by verified email and a station invitation code.

## Local development and publication

Use Node 24 and pnpm 11. `pnpm install`, `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm build`. The production frontend is a Vite static build in `dist/`, with the repository subpath configured in `vite.pages.config.ts`. Publish only `dist/` to the `gh-pages` branch, with `.nojekyll`, and configure GitHub Pages to deploy that branch's root.

`app/page.tsx` holds public event content; `app/station-theme.css` the current design; `app/mobile-polish.css` retains shared registration styles; `components/registration.tsx` the registration flow. Update Suratgarh routes in the Race day section after finalisation. Original starter modules are retained; the production entry is `app/client.tsx` and the build uses `vite.pages.config.ts`.

Public environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copy `.env.example` to `.env.local` after creating the database. These are browser-safe values. Service-role, SMTP and integration secrets must never use a public prefix or enter this repository.

## Connect the new Supabase project

1. Create the project in your Supabase account. Run all numbered files in `supabase/migrations` in order as the project owner. The new event-day migrations deliberately keep registration and payment flags closed. They create event/race configuration, private membership and invitation records, private registrations and a private `payment-receipts` bucket.
2. Enable email sign-up and confirmation; disable anonymous sign-ins. Configure your SMTP provider. In the sign-in email template, include `{{ .Token }}` for the numeric email code. Configure the site URL and redirect URL to the GitHub Pages event address. Supabase's default email service is restricted and is not a production mail service.
3. Deploy `submit-registration`. `verify_jwt=false` is deliberate: the function explicitly verifies every caller using Supabase Auth `getUser`, then checks station membership. It does not accept unauthenticated registrations. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are backend runtime values; set `SITE_ORIGIN=https://sportsofficer-sys.github.io`.
4. Generate the station code using the commented owner-only setup command in migration 2. Distribute it through station channels. Only the hash is stored; no code is embedded in the website. Revoke or rotate codes and memberships through the private administration tables.
5. Add Suratgarh's QR URL, payee name, UPI ID and event contact details to `event_config`. Set `payment_configured=true` and `registration_open=true` only when these are correct. The database enforces the deadline independently of the browser.
6. Set the two public frontend configuration values, rebuild and republish. Test live email sign-in, invalid/valid station code, a real test screenshot in the new test environment, duplicate submission, separate account privacy, and the Drive import before inviting participants.

Payment submission always begins as `pending_review`. A screenshot is supporting evidence, not an automatic payment confirmation. Database triggers calculate the trusted fee, canonicalise the email/transaction reference and prevent clients from assigning approval. Receipt paths are private. Retry IDs persist for the browser tab without saving personal details; signed-in users can see their own submitted entries.

## Private Google Drive register

The prepared workbook contains `Participants!A:X`, Summary and Read me. It supports 5,000 entries and includes race/fee summaries, verified T-shirt size totals, payment review, BIB numbers and BIB/T-shirt distribution tracking. No sample runners are included. Drive import/authentication must be completed before live synchronization.

To connect a native Google Sheet:

1. Bind `integrations/google-drive/Code.gs` to the organiser Sheet using Extensions → Apps Script; use the accompanying manifest. Set script properties `SPREADSHEET_ID`, `RECEIPTS_FOLDER_ID`, `SUPABASE_DRIVE_ENDPOINT`, `DRIVE_SYNC_TOKEN`.
2. Deploy the `drive-register` Edge Function. Generate a long random dedicated `DRIVE_SYNC_TOKEN` (32+ random characters) and store the same secret in Supabase function secrets and Apps Script properties. It grants the integration access to participant records, screenshot copies and review publication; never expose it in the frontend, Sheet cells, or logs.
3. Sign the organiser into Supabase once, assign the verified Auth UUID in the private organizer table, and configure `DRIVE_ORGANIZER_USER_ID` as the function secret. This server-managed identity is required to publish payment reviews.
4. Authorise the Apps Script scopes in your Google account. The private receipts folder must have no link-wide sharing. Run **Desert Braves → Import new registrations**. It copies screenshots to Drive and inserts new participant rows. Existing Q:X review/distribution fields are preserved.
5. After checking the bank/UPI record, set Payment status to `verified` or `rejected`, enter Verified by, and optionally Review note. Leave Verified at empty. Use **Publish reviewed payments** to send those decisions to the app; the backend stamps Verified at. Merely editing the Sheet does not change the website until publication succeeds.
6. Optionally enable 10-minute imports through the menu. New entries then import automatically; payment decisions remain an explicit organiser action. No scheduled sync has been enabled by this repository.

The integration neutralises spreadsheet-formula injection in user-supplied text, paginates exports, stores screenshots in a private folder, uses short-lived download URLs, and never publishes participant details in GitHub Pages. Keep register editing access restricted to authorised organisers.

## Verification

- TypeScript check and production static build.
- `pnpm test` covers participant/receipt validation, availability/deadline boundaries, timing parsing/provenance, real PostgreSQL/RLS/RPC lifecycle tests, private certificate approval/versioning and PDF rendering with Latin/Devanagari fonts. Fixtures use synthetic records and signatures only; this is not a deployed Auth/Storage end-to-end test.
- Twenty-three local PostgreSQL/PGlite schema/RLS/RPC checks (report in `docs/database-validation.json`). Auth/Storage service tables were stubbed for these checks; live integration remains to be verified after account setup.
- Original artwork sources in `docs/asset-sources.md`.

Do not delete uploaded receipt objects in the request path after an uncertain database response: another concurrent request may reference the file. Any later cleanup must examine old unreferenced objects through the Storage API, with no in-progress submissions.

## Race desk, organiser console and certificates

The new lazy-loaded `components/event-portal.tsx` exposes participant entries/results/certificates, organiser payment review, category clocks, finish capture, result review and public minimal certificate verification. See [event-day setup and operating limits](docs/event-day-platform.md). Database authority and private assets remain on Supabase; the static page cannot act as an administrator.

Official times take precedence over participant submissions. Self-reported times cannot determine prizes. Reviews require the expected result revision, certificate holds persist until explicitly released, and signature approvals are versioned. Generated PDFs use a visual signature facsimile, not a cryptographic digital signature; no AOC identity or signature has been invented.

## Mobile installation and later Android release

The manifest and production worker provide home-screen installation metadata and a public offline information page. Private records, authentication, receipts, certificates and registration pages are never cached by that worker. Read [the mobile roadmap](docs/mobile-app-roadmap.md) for Android/iPhone installation and the later signed Android/store release. Physical device and store-release checks are still required.

## Design and procurement

The station brief supersedes earlier caps/chip-timing and ₹399/₹899 package assumptions. The latest design follows a navy/ivory/canal-green palette with measured text contrast. Historical photographs have year/location/source captions; the painting is a fictional impression of a thriving station community. Asset provenance is in [asset-sources](docs/asset-sources.md).

The separate organiser budget calculator models 100–500 runners, planned ₹600/₹700/₹800 fees, ₹300 shirts, ₹150 medals, food alternatives and 5/10/15% contingency. These are planning allowances, not supplier commitments. The ₹20,000 seed is kept separate from earned registration revenue. Confirm supplier lead times early; the seven days between registration close and race day are not sufficient for many custom orders.
