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
| Custom app deep link | Scheme-specific part must be non-empty | `whatsapp://send?phone=123` |

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
3. Input that cannot be parsed as a URI is invalid.
4. Missing scheme is invalid.
5. `http` / `https` without a host (e.g. `http:`, `https:///path`) is invalid.
6. `mailto` / `tel` / `sms` with an empty scheme-specific part (e.g. `mailto:`) is invalid.
7. Custom deep link with an empty scheme-specific part is invalid.
8. Any scheme in the blocked list is invalid.

## Implementation Status

| Platform | File | Status |
|----------|------|--------|
| Android | `ContactLinkValidator.kt` | Applies full ruleset |
| Backend | `jobs.service.ts` — `assertAllowedContactUrl()` | Applies full ruleset |
| Frontend | `contactLinkPolicy.ts` — `validateContactLink()` | Applies full ruleset |
