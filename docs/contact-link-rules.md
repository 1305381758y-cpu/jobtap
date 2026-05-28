# Contact Link Validation Rules

This document is the single authoritative source for contact link validation across all JobTap surfaces (Android app, admin frontend, backend API).

## Allowed Schemes

| Scheme | Condition | Example |
|--------|-----------|---------|
| `http` | Host must be present and non-empty | `http://example.com/contact` |
| `https` | Host must be present and non-empty | `https://jobs.example.com` |
| `mailto` | Scheme-specific part must be non-empty | `mailto:hr@example.com` |
| `tel` | Scheme-specific part must be non-empty | `tel:+1234567890` |
| `sms` | Scheme-specific part must be non-empty | `sms:+1234567890` |
| WhatsApp deep link | Scheme-specific part must be non-empty | `whatsapp://send?phone=123` |
| WhatsApp HTTPS link | Host must be present and non-empty | `https://wa.me/1234567890` |
| Telegram deep link | Scheme-specific part must be non-empty | `tg://resolve?domain=jobtap` |
| Telegram HTTPS link | Host must be present and non-empty | `https://t.me/jobtap` |
| Custom app deep link | Scheme-specific part must be non-empty | `myapp://open/support` |

Custom app deep links (any scheme not explicitly blocked) are allowed as long as the scheme-specific part is non-empty.

## Blocked Schemes

The following schemes are explicitly forbidden:

- `javascript` — XSS / code injection
- `data` — arbitrary content injection
- `vbscript` — legacy IE code execution (Internet Explorer)
- `file` — local filesystem access
- `content` — Android content provider access
- `about` — browser internal pages
- `ftp` — unsupported protocol

## Validation Rules

1. Input is trimmed of leading/trailing whitespace before processing.
2. Blank or null input is invalid.
3. Whitespace or ASCII control characters inside the link are invalid.
4. Input that cannot be parsed as a URI is invalid.
5. Missing scheme is invalid.
6. `http` / `https` without a host (e.g. `http:`, `https:///path`) is invalid.
7. `mailto` / `tel` / `sms` with an empty scheme-specific part (e.g. `mailto:`) is invalid.
8. Custom deep link with an empty scheme-specific part is invalid.
9. Any scheme in the blocked list is invalid.

## Android Launch QA Matrix

Before a production release, verify native Android `ACTION_VIEW` handling on real devices for:

- `http://example.com/contact`
- `https://jobs.example.com`
- `mailto:hr@example.com`
- `tel:+1234567890`
- `sms:+1234567890`
- `whatsapp://send?phone=123`
- `https://wa.me/1234567890`
- `tg://resolve?domain=jobtap`
- `https://t.me/jobtap`
- One product-approved custom deep link

For WhatsApp and Telegram, test both installed and not-installed states. If no app can handle the link, Android must show the JobTap failure snackbar instead of crashing.

Record each real-device result with device model, Android version, app `versionName`, app `versionCode`, network type, protocol, installed/not-installed state for optional apps, observed target app, and pass/fail notes.

## Implementation Status

| Platform | File | Status |
|----------|------|--------|
| Android | `ContactLinkValidator.kt` | Applies full ruleset |
| Backend | `jobs.service.ts` — `assertAllowedContactUrl()` | Applies full ruleset |
| Frontend | `contactLinkPolicy.ts` — `validateContactLink()` | Applies full ruleset |
