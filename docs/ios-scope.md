# JobTap iOS Scope

## Current Status

This repository is Android-only. There is no iOS app in this codebase.

Current mobile implementation:

- Android native app under `android/`
- Backend mobile APIs under `/api/mobile/*`
- Admin console and employer submission page under `frontend/`

## Launch Implication

For the current release, do not claim iOS availability in:

- Google Play listing copy
- Website copy
- Release notes
- Support macros
- Marketing screenshots

If product wants iOS in the same public launch, a separate iOS app must be built and released through App Store Connect.

## Future iOS Requirements

If iOS enters scope later:

- Build a native iOS app or a cross-platform app in a separate repository or app module.
- Reuse the same backend APIs: `/api/mobile/bootstrap`, `/api/mobile/jobs`, `/api/mobile/jobs/:id`, and `/api/mobile/analytics/events`.
- Replicate contact link validation from `docs/contact-link-rules.md`.
- Implement external link opening with iOS-safe URL handling.
- Configure App Store signing, bundle ID, privacy nutrition labels, screenshots, and App Store Connect metadata separately from Google Play.
- Make analytics dashboards distinguish Android-only versus iOS traffic.

## iOS Contact Link Notes

When iOS is implemented, expected schemes include:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>whatsapp</string>
    <string>tg</string>
    <string>tel</string>
    <string>sms</string>
    <string>mailto</string>
</array>
```
