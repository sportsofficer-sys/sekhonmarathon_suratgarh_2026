# Suratgarh station identity and event platform

## Gap review before implementation

The working September build already has a responsive public site, a guarded registration preview, schema/RLS for private payment proofs, organiser verification and a prepared private Google Sheet integration. The live backend has not been provisioned. Preserve these controls and the existing public URL.

The new brief identifies five gaps:

1. Air Force Station Suratgarh is too subordinate to the generic Desert Braves slogan. The canvas depicts barren dunes instead of the station's green, inhabited desert environment.
2. The page relies on repeated cards and generic slogans. It needs a clearer event identity, authentic heritage and useful participation content.
3. The new participant package removes caps, goodie-bag promises and RFID/chip timing. Planned fees are now ₹600/₹700/₹800, subject to procurement validation before payments open.
4. Event-day clocks, finish capture, result provenance, private certificate generation and verification are absent. These must use protected backend authority, not browser state as proof.
5. The web app needs an installable mobile foundation, then a separately tested Android release later. The user has asked for the web app first; no app-store release is part of this deployment.

## Implementation decisions

- Use Air Force Station Suratgarh as the primary host identity; keep Sekhon IAF Marathon, Desert Braves, 4 October 2026 and the restricted audience explicit.
- Build an editorial page with ivory reading surfaces, navy type, canal-green actions and restrained terracotta. Use self-hosted Public Sans for reading and Barlow Condensed for the event headline.
- Create original canvas illustrations of a thriving desert station: canal/tree line, maintained housing/sports landscape, runners and recognisable Indian Air Force aircraft. Label the art as an impression, not the actual route or base map.
- Use a small official archival portrait of Fg Offr Sekhon with a source-checked biography, and a genuine credited AP Singh running photograph from the 2025 Delhi event. Use Instagram only for research ideas unless specific reuse is supported.
- Offer planned pricing and an honest registration-opening state. Revise all package/timing copy consistently, including registration and policy screens.
- Add participant/organiser views, role-checked timing and payment operations, certificate eligibility and protected generation, public minimal verification and meaningful database tests. Fail closed when backend/signature configuration is missing.
- Add a web manifest and an offline information page. Do not cache private records, receipts, certificates or credentials. Keep event-day operations online until a separate offline reconciliation design is validated.
- Prepare transparent budget scenarios and an Android follow-up plan. Publish the verified static build to the current GitHub Pages URL; do not claim account services are connected when they are not.
