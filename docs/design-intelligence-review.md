# Website design intelligence review

Reviewed 6 September 2026 for the Desert Braves’ Sekhon IAF Marathon website at Air Force Station Suratgarh.

## Product brief

The site serves airwarriors and families who usually arrive from a station message on a phone. Its first job is to identify the official event, show the current registration state, help a visitor choose 5 KM, 10 KM or 21 KM, and let a returning participant check an entry. The experience must remain concise, work at narrow widths, and avoid presenting preview functions as live services.

The chosen design direction is **station-first operational clarity**: a restrained navy, ivory, canal-green and warm-sand system; one strong station image; short task-based pages; visible status; and progressive disclosure for race, tribute, gallery and organiser detail.

## Reference evidence

Thirteen supplied references were triaged from their live public HTML, JavaScript and CSS. Their strongest transferable patterns were tested against this event journey; distinctive layouts, copy and brand identities were not copied.

| Reference group | Transferable principle | Decision for Suratgarh |
| --- | --- | --- |
| [RAUM](https://raum-studio-landing-page-b13e8bd4.lovable.app/), [ModFii](https://modfii.com/), [Event Spark](https://event-spark-2.lovable.app/) | Clear choices, staged forms, back controls and accurate progress | Keep race → participant → payment → review, with My entry as the return destination |
| [AfterImage](https://afterimagefilmfestival.com/), [Editorial portfolio](https://editorial-portfolio-9d8e325b.lovable.app/) | Separate current status, past archive and selected detail | Keep the 2026 event and 2025 memories distinct; avoid a long editorial home page |
| [Jukebox Burgers](https://jukeboxburgers.com/), [RevCrew](https://revcrew.ai/) | Persistent mobile action and simple process explanation | Keep the four-item bottom navigation; explain status in plain language |
| [Scandi Haven](https://scandi-haven-shop.lovable.app/), [architecture studio](https://architecture-and-interior-design-ed798653.lovable.app/) | Restrained warm surfaces and consistent image metadata | Retain the current palette, authentic archive captions and one lead painting |
| [Artist portfolio](https://parallax-artist-portfolio-037d6adf.lovable.app/), [Jordan Studio](https://lovable-prompt-frame.lovable.app/), [Rivonix](https://rivonix.com/), [Revio](https://revio-landing-page-9f7ffd26.lovable.app/) | Strong identity and overview-to-detail navigation | Use one confident station headline; avoid scroll spectacle, hidden navigation, continuous motion and generic claims |

The [national marathon site](https://sekhoniafmarathon.in/) remains an ideas-only event reference. Delhi-specific routes, claims and operational details are not reused.

## Changes shipped from this review

- Added canonical, Open Graph, Twitter and SportsEvent metadata for recognisable station-message link previews and search discovery.
- Added an event-guide action that downloads both the 3 October T-shirt collection and 4 October race day to a calendar.
- Added native sharing with a clipboard fallback and truthful feedback.
- Added installed-app shortcuts for Races, Event guide and My entry.
- Prepared same-phone payment tools—Copy UPI ID, Copy amount and Save QR—that remain hidden until a complete, non-placeholder payment configuration is live.
- Added regression tests for the current public URL, event facts, app shortcuts and standards-compliant calendar output.

## Next priorities

### Must before registration opens

- Configure and verify the new Supabase project, email delivery, station invitation code, payment payee/UPI/QR, private receipt storage and Drive synchronisation in the live environment.
- Test a complete real-device journey: sign in, code validation, registration, same-phone payment, screenshot upload, organiser review and participant status.
- Protect an unfinished participant form from accidental dismissal with a clear discard choice; do not persist personal details on a shared device without a deliberate policy.

### Should

- Provide a labelled sample registration walkthrough if preview testing shows that visitors are entering personal details only to inspect later steps.
- Replace the social preview artwork only if an approved 1200 × 630 station/event image becomes available.

### Could

- Add a three-state entry explanation—payment under review, verified or needs attention—if participant queries show that the existing status language is insufficient.

## Validation

- Production build and TypeScript check pass.
- All 49 automated tests pass.
- Home, races, registration preview and event guide pass scripted browser checks at 320, 390, 768 and 1440 pixels, including navigation state, dialog bounds, calendar delivery, sharing feedback and horizontal overflow.
- The full repository lint command still reports pre-existing warnings in generated UI components and older registration/event modules. The files added for this review pass their focused lint check.

No live payment, registration, database or Drive integration is claimed by this review.
