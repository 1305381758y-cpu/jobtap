# Localization Strategy

## Current State

### Android App
- All user-facing strings in `MainActivity.kt` have been moved to `res/values/strings.xml` and accessed via `stringResource(R.string.xyz)`.
- Base English strings are defined in `res/values/strings.xml`.
- Resource directory skeletons exist for all PRD languages but contain only `app_name` and a locale marker; untranslated strings fall back to the base English values via Android resource resolution.

### Admin Frontend
- A lightweight i18n catalog (`frontend/src/i18n.ts`) defines `SUPPORTED_LOCALES`, `DEFAULT_ADMIN_LOCALE`, and an admin message catalog in Chinese (the current default).
- The `roleLabel`, `adminStatusLabel`, and `jobStatusLabel` records in `App.tsx` use the catalog via a `t()` helper.
- Other hardcoded Chinese strings throughout the UI remain as-is; the catalog structure is in place for incremental migration.

## PRD Target Languages (10)

| Code | Language | Android Resource Dir | Frontend Catalog |
|------|----------|---------------------|-----------------|
| `en`  | English  | `values/` (base)    | Base fallback    |
| `zh`  | Chinese  | `values-zh/`        | Default catalog  |
| `es`  | Spanish  | `values-es/`        | Skeleton         |
| `fr`  | French   | `values-fr/`        | Skeleton         |
| `de`  | German   | `values-de/`        | Skeleton         |
| `pt`  | Portuguese | `values-pt/`      | Skeleton         |
| `ja`  | Japanese | `values-ja/`        | Skeleton         |
| `ko`  | Korean   | `values-ko/`        | Skeleton         |
| `ar`  | Arabic   | `values-ar/`        | Skeleton         |
| `hi`  | Hindi    | `values-hi/`        | Skeleton         |

## Fallback Behavior

### Android
Android resource resolution automatically falls back to `values/` (English) when a string is not defined in a locale-specific `values-*/strings.xml`. No custom fallback logic is needed.

### Frontend
The i18n helper `t(key)` looks up the key in the current locale's catalog. If not found, it falls back to `DEFAULT_ADMIN_LOCALE` (Chinese). If still not found, it returns the key itself.

## Remaining Work

1. **Android**: Translate `strings.xml` for each of the 9 non-English locales (zh, es, fr, de, pt, ja, ko, ar, hi).
2. **Frontend**: Populate message catalogs for each supported locale in `i18n.ts`.
3. **Frontend**: Replace remaining hardcoded Chinese strings in `App.tsx` (login page, employer submission form, navigation, etc.) with `t()` calls.
4. **Android**: Add locale picker in Settings screen (currently shows "Language: English" as a hardcoded row).
5. **Frontend**: Add locale switcher UI in admin console.
6. **Backend**: The bootstrap endpoint returns `supportedLocales` — ensure it reflects the final locale list.
