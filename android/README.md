# JobTap Android

Native Android first-pass UI for JobTap Module A.

## Scope

- Kotlin + Jetpack Compose
- Backend integration through `MobileApiClient`
- Debug build: local emulator backend `http://10.0.2.2:3000`
- Release build: production HTTPS URL via Gradle BuildConfig
- Calm blue light-mode visual direction

Implemented screens and states:

- Jobs home with large job cards, no search, no filter
- Job detail loaded from the backend
- External contact link opening (Intent-based, supports https/mailto/tel/sms/deep links)
- Analytics events for app open, list view, detail view, and contact click
- Report Job bottom sheet with three reasons
- Report submitted snackbar with `View`
- Help tab
- Report Results list
- Settings tab
- Country detection blocking state component

## Run

Open `android/` in Android Studio and run the `app` configuration.

Command-line build:

```bash
cd android
ANDROID_HOME=/Users/laosan/Library/Android/sdk ./gradlew :app:assembleDebug
```

Unit tests:

```bash
cd android
ANDROID_HOME=/Users/laosan/Library/Android/sdk ./gradlew testDebugUnitTest
```

## API URL Configuration

The API base URL is provided at build time via `BuildConfig.API_BASE_URL`.

### Debug builds

Debug builds automatically use the Android emulator loopback:

```
http://10.0.2.2:3000
```

The debug manifest (`src/debug/AndroidManifest.xml`) enables cleartext HTTP traffic for local development.

### Release builds

Release builds default to:

```
https://api.jobtap.app
```

Override the release URL with a Gradle property:

```bash
./gradlew :app:assembleRelease -PreleaseApiUrl=https://your-production-api.com
```

Or set either `org.gradle.project.releaseApiUrl=https://your-production-api.com` in `gradle.properties` or `JOBTAP_RELEASE_API_BASE_URL=https://your-production-api.com` in the build environment.

**Safety validation**: Release builds reject unsafe URLs that are blank, use `http://`, or point to `localhost`, `127.0.0.1`, or `10.0.2.2`. If validation fails, the build fails with a clear error message.

### Cleartext HTTP

The debug manifest enables `android:usesCleartextTraffic` for local development. Release builds should not include this flag (the main manifest does not set it).

## Release Build & Signing

### Version codes and names

Set via Gradle properties (command line or `gradle.properties`):

```bash
./gradlew :app:assembleRelease -PversionCode=2 -PversionName="1.1.0"
```

Environment variable alternatives are `JOBTAP_VERSION_CODE` and `JOBTAP_VERSION_NAME`. Defaults: `versionCode=1`, `versionName=1.0.0`.

### Signing configuration

Release signing is configured via these Gradle properties:

| Property | Description |
|---|---|
| `releaseStoreFile` | Path to the keystore file |
| `releaseStorePassword` | Keystore password |
| `releaseKeyAlias` | Key alias |
| `releaseKeyPassword` | Key password |

The same values can also be supplied with `JOBTAP_RELEASE_STORE_FILE`, `JOBTAP_RELEASE_STORE_PASSWORD`, `JOBTAP_RELEASE_KEY_ALIAS`, and `JOBTAP_RELEASE_KEY_PASSWORD`.

Example:

```bash
./gradlew :app:assembleRelease \
  -PreleaseStoreFile=/path/to/keystore.jks \
  -PreleaseStorePassword=storepass \
  -PreleaseKeyAlias=mykey \
  -PreleaseKeyPassword=keypass
```

If signing secrets are absent, the release build falls back to debug signing so that `assembleRelease` works in CI and local development without a production keystore.

## Local Backend Integration

For emulator integration, start the JobTap backend on the host machine at port `3000`.
The Android emulator reaches the host through `10.0.2.2`, so the debug build uses:

```text
http://10.0.2.2:3000
```

The debug manifest allows cleartext HTTP for local integration.
