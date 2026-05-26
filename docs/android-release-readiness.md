# Android Release Readiness Checklist

This document tracks release preparation only. It must not contain production
secrets, keystore passwords, API tokens, or claims that an item is complete
unless the responsible owner has verified it.

Status legend:

- `[ ]` Not started or not verified.
- `[~]` In progress.
- `[x]` Verified complete by the responsible owner.
- `Product input` requires product decision, copy, acceptance criteria, or scope confirmation.
- `Ops input` requires operations, release, account, signing, store, backend, or deployment support.

## Release Metadata

- Release target: `TBD` (Product input)
- Android package/application id: `TBD` (Ops input)
- Target store/channel: `TBD` (Product input, Ops input)
- Planned release date/time: `TBD` (Product input, Ops input)
- Release owner: `TBD` (Ops input)
- Product owner: `TBD` (Product input)
- QA owner: `TBD`
- Backend/API owner: `TBD` (Ops input)
- Rollback decision owner: `TBD` (Product input, Ops input)

## P0 Release Blockers

These items must be resolved before any production release candidate is
submitted or distributed.

### Formal Production Signing

- [ ] Confirm the final production signing strategy: Play App Signing, local signing, or other approved release process. (Ops input)
- [ ] Confirm the production keystore/key alias exists in the approved secret store or release system. Do not add secrets to this repository. (Ops input)
- [ ] Confirm signing credentials are accessible only to approved release operators. (Ops input)
- [ ] Document the signing runbook location or release-system job name using non-secret references only. (Ops input)
- [ ] Verify that the generated release artifact is signed with the approved production certificate fingerprint. (Ops input)
- [ ] Record the verification evidence location without embedding certificates or private material. (Ops input)

### Production API Domain

- [ ] Confirm the final production API base domain and scheme. Use a placeholder here, not a secret or private endpoint. (Product input, Ops input)
- [ ] Confirm the production API domain is reachable from external mobile networks. (Ops input)
- [ ] Confirm TLS certificate validity, hostname matching, and certificate-chain compatibility on supported Android versions. (Ops input)
- [ ] Confirm environment separation between development, staging, and production API domains. (Ops input)
- [ ] Confirm no staging, localhost, debug, or mock API endpoint is present in the release artifact. (Ops input)
- [ ] Confirm backend rate limits, auth settings, CORS-equivalent mobile policies, and monitoring are production-ready. (Ops input)

### Real-Device Multi-Protocol Integration

- [ ] Define the required protocol matrix for the release. Examples: HTTPS, WebSocket, deep links, push notifications, file upload/download, OAuth redirects, SMS/email handoff, and third-party SDK callbacks. (Product input, Ops input)
- [ ] Test the protocol matrix on physical Android devices, not only emulators.
- [ ] Include at least one low-end supported Android device and one current Android device in the test matrix.
- [ ] Test on Wi-Fi, cellular, airplane-mode recovery, weak network, and network switching scenarios.
- [ ] Verify login, logout, token refresh, session expiry, and account recovery across all required protocols. (Product input for expected behavior)
- [ ] Verify deep links and app links against the production domain or approved release-domain equivalent. (Ops input)
- [ ] Verify push notification registration, delivery, tap-through, and opt-out behavior if push is in scope. (Product input, Ops input)
- [ ] Verify any payment, subscription, or store billing flows on real devices if included in the release scope. (Product input, Ops input)
- [ ] Capture device model, OS version, app version, network type, protocol, result, and issue link for each run.

### Versioning, Release Notes, and Rollback Package

- [ ] Confirm the final `versionCode` for this release is higher than every previously shipped Android artifact. (Ops input)
- [ ] Confirm the final `versionName` matches the product release plan. (Product input)
- [ ] Confirm version metadata is visible in the app or support diagnostics if required. (Product input)
- [ ] Draft release notes for store listing and in-app/support channels. (Product input)
- [ ] Review release notes for accuracy, unsupported claims, regulatory wording, and localization needs. (Product input, Ops input if compliance review is required)
- [ ] Save the exact release APK/AAB artifact in the approved artifact repository. (Ops input)
- [ ] Save symbol files, mapping files, ProGuard/R8 outputs, native debug symbols, and build logs if generated. (Ops input)
- [ ] Save the previous known-good production artifact and metadata for rollback reference. (Ops input)
- [ ] Define rollback criteria, decision owner, communication path, and expected rollback time. (Product input, Ops input)
- [ ] Confirm the release can be halted, staged, or rolled back through the selected store/channel. (Ops input)

## P1 Release Readiness

These items should be complete before broad rollout. Any exception needs explicit
approval from the release owner and product owner.

### Multilingual Quality

- [ ] Confirm the required locale list for this release. (Product input)
- [ ] Confirm fallback behavior for unsupported locales. (Product input)
- [ ] Review all user-visible strings for each supported language. (Product input)
- [ ] Validate truncation, line wrapping, pluralization, date/time, number, currency, and RTL behavior where applicable.
- [ ] Validate store listing title, short description, full description, screenshots, and release notes in each supported language. (Product input)
- [ ] Confirm legal, privacy, consent, and permission copy is approved for each supported language. (Product input, Ops input if legal/compliance owner is outside product)
- [ ] Run smoke tests in each supported locale on a physical Android device.
- [ ] Record screenshots or QA evidence for each release locale.

### App Store Materials

- [ ] Confirm target distribution channel: Google Play production, Google Play internal/closed/open test, direct APK, enterprise MDM, or another channel. (Product input, Ops input)
- [ ] Prepare app title, short description, full description, category, contact email, privacy-policy URL, support URL, and marketing URL. (Product input)
- [ ] Prepare screenshots for every required device class and locale. (Product input)
- [ ] Prepare app icon, feature graphic, promo video, and other store assets if required. (Product input)
- [ ] Confirm data safety, permissions declaration, content rating, ads declaration, target audience, and policy forms. (Product input, Ops input)
- [ ] Confirm privacy policy and terms links are live, accurate, and match app behavior. (Product input, Ops input)
- [ ] Confirm store account permissions and release-track access for release operators. (Ops input)
- [ ] Confirm staged rollout percentage, country availability, and rollout schedule. (Product input, Ops input)
- [ ] Confirm store review notes, demo credentials, reviewer instructions, or test account setup if required. (Product input, Ops input)

### iOS Scope Alignment

- [ ] Confirm whether iOS is in scope for the same public launch, later launch, or explicitly out of scope. (Product input)
- [ ] If iOS is in scope, confirm feature parity expectations and accepted platform differences. (Product input)
- [ ] If iOS is not in scope, confirm customer-support messaging and release notes do not imply iOS availability. (Product input)
- [ ] Confirm shared backend/API changes are compatible with current or planned iOS clients. (Ops input)
- [ ] Confirm analytics, attribution, support, and incident dashboards distinguish Android-only versus cross-platform release impact. (Product input, Ops input)

## P2 Operational Follow-Ups

These items improve supportability and should be tracked before or immediately
after launch.

### Monitoring and Support

- [ ] Confirm crash reporting, ANR monitoring, backend error monitoring, and alert routing are enabled for production. (Ops input)
- [ ] Confirm dashboards include app version, version code, Android OS version, device model, locale, and API domain.
- [ ] Confirm support runbook links for known issues, rollback, account recovery, and escalation. (Product input, Ops input)
- [ ] Prepare customer support macros for launch questions, known limitations, and rollback communication. (Product input)
- [ ] Confirm analytics events needed for launch success criteria are present and reviewed. (Product input)

### Final Evidence Pack

- [ ] Store release artifact location. (Ops input)
- [ ] Signing verification evidence location. (Ops input)
- [ ] Real-device protocol test report location.
- [ ] Localization QA evidence location. (Product input)
- [ ] Store material review/approval location. (Product input)
- [ ] Release notes approval location. (Product input)
- [ ] Rollback package location. (Ops input)
- [ ] Known issues and accepted risks location. (Product input, Ops input)

## Open Inputs Needed

- Product input: release scope, launch date, locale list, store copy, screenshots/assets, release notes, iOS scope, rollout countries, rollout percentage, success criteria, support messaging, accepted risks.
- Ops input: production signing process, API production domain, release artifact storage, store account access, backend readiness, monitoring/alerting, rollback mechanism, certificate/TLS verification, previous known-good artifact retention.

## Completion Rule

Do not mark this release ready until every P0 item is verified, every P1
exception has written approval, and the final evidence pack points to approved
locations. This document is a readiness checklist, not proof that release work
has already been completed.
