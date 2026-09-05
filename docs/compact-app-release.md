# Compact mobile app: plan and verification

5 September 2026 · Air Force Station Suratgarh · Desert Braves

## Implemented plan

1. Keep Home focused on station identity, the event date, race choices and two useful shortcuts. Move the longer tribute and practical information to separate views.
2. Use persistent phone navigation for Home, Races, Event guide and My entry. Preserve direct links, including old links to contact information and race categories.
3. Present races as expandable choices. Show the selected distance and planned fee throughout registration; shorten instructions while preserving required fields, consent and validation.
4. Remove FAQs and the marked artwork, timing and refreshment explanations. Keep both organiser telephone numbers directly available in the Event guide.
5. Feature T-shirt collection on Saturday, 3 October 2026, 09:00–13:30, in front of SBI Bank inside the station. This does not announce bib collection. Route/reporting details remain pending.
6. Use consistent Public Sans body text and Barlow Condensed display type. Correct grammar and punctuation, capitalise “Supreme” at the start of the citation and “Sacrifice” as requested.

The painting remains a view of runners on a landscaped station road, with the canal only in the distant surrounding region. Its long visible explanatory caption has been removed. Image alternatives and historical photo credits remain.

## Browser checks

Tests used the production build in a Chromium-based browser with emulated viewport sizes. These are responsive browser checks, not tests on physical phones.

| Check | Result |
| --- | --- |
| Home at 320 × 740 and 390 × 844 | No horizontal overflow. Page heights 1,351 and 1,406 px respectively. |
| Home length compared with previous 390 × 844 layout | Reduced from 8,070 to 1,406 px, approximately 83% shorter. Longer information remains reachable on separate views. |
| Laptop at 1366 × 768 | Home, Races, Event guide and Why we run fit; no horizontal overflow. Images loaded. |
| 5 / 10 / 21 KM actions | Correct preview distance and ₹600 / ₹700 / ₹800 planned fees. Changing the race inside registration updates the selection. |
| Required participant fields | An empty form stays on the participant step. Synthetic valid details progress to Payment preview and Review. |
| Registration at 320 px | Found and fixed intrinsic grid-width clipping. Final dialog content width equals scroll width; all four progress labels fit. |
| Laptop registration | Centred 680 px dialog, fully within 1366 × 768 viewport. |
| Preview protection | Submit for verification remains disabled. No entry, payment, receipt or consent was submitted during testing. |
| Contact and collection links | Both telephone destinations correct. Collection date/time/place present. Old #faqs opens contact information; #guide-kit focuses collection heading. |
| Navigation focus | Repeated Home navigation focuses the heading; direct guide anchors focus the appropriate heading. |
| My entry and policies | Open and return actions work. Terms include collection details; Escape closes the policy dialog. |
| Copy review | FAQs and marked notes absent. “Supreme” and “Sacrifice” correct. Policy punctuation cleaned without changing substantive terms. |

Automated checks: 40 tests, TypeScript checking and production build pass. Navigation tests include canonical links, legacy aliases, malformed hashes and certificate-query precedence. Existing tests cover registration validation, availability, database lifecycle and certificate generation. The build retains the known non-blocking shared-Supabase-import warning.

## Limits and launch state

Physical iPhone Safari/Android testing, native browser Back and live email/payment/storage/Drive flows are not fully verified. The backend still needs production credentials and activation. Registration remains closed, and the sample QR cannot receive payment. No participant records or Google Drive sharing changed in this release.

## Publication

Target: https://sportsofficer-sys.github.io/sekhonmarathon_suratgarh_2026/

Production build assets: `index-B8XNYg2u.js` and `index-BkgpkLMt.css`.
