# JobTap Android

Native Android first-pass UI for JobTap Module A.

## Scope

- Kotlin + Jetpack Compose
- Backend integration through `MobileApiClient`
- Default local backend URL: `http://10.0.2.2:3000`
- English UI only
- Calm blue light-mode visual direction

Implemented screens and states:

- Jobs home with large job cards, no search, no filter
- Job detail loaded from the backend
- External contact link opening
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

## Local Backend Integration

For emulator integration, start the JobTap backend on the host machine at port `3000`.
The Android emulator reaches the host through `10.0.2.2`, so the app uses:

```text
http://10.0.2.2:3000
```

The debug manifest allows cleartext HTTP for local integration.
