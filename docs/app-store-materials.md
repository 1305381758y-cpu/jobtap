# JobTap Google Play Materials Checklist

This document tracks the non-code materials required to publish JobTap on Google Play. Do not mark an item complete until the final asset, URL, or Play Console answer is verified by the release owner.

## Current Release Scope

- App name: `JobTap`
- Official domain: `jobtap.work`
- Privacy policy URL: `https://jobtap.work/privacy`
- Platform in this repository: Android only
- Mobile user login: none
- Resume submission: none
- Core user flow: open app -> browse country-matched job list -> open job detail -> tap contact -> leave app through an external link or messaging app
- Production-quality store languages for first release: English and Chinese only
- Other Android locale files currently use English fallback copy and should not be advertised as localized store listings without product approval

## Current Release Evidence

Last agent verification: `2026-06-02 17:07 Asia/Shanghai`

| Item | Current Value |
|---|---|
| Production API base URL | `https://api.jobtap.work` |
| Production API health | `GET /health` returned HTTP 200 with `database:"ok"` |
| Mobile bootstrap | `GET /api/mobile/bootstrap` returned HTTP 200 |
| Final local AAB path | `android/app/build/outputs/bundle/release/app-release.aab` |
| Final local AAB SHA-256 | `9ce6a9dddd990d2f0aca149afbd708e2639b0f9f24bd221158230ab41a62fc95` |
| Generated release API config | `BuildConfig.API_BASE_URL="https://api.jobtap.work"` |
| Upload certificate subject | `CN=JobTap Upload, OU=Mobile, O=JobTap, L=Shanghai, ST=Shanghai, C=CN` |
| Local signing verification | `jarsigner` returned `jar verified`; warnings are for self-signed upload certificate and missing timestamp |

This evidence does not replace Play Console upload, store-account review, privacy
policy publication, or final real-device smoke testing.

## Google Play Materials Still Missing

| Required Item | Status | Must Be Provided By Human |
|---|---|---|
| App icon | Missing | 512x512 PNG Play listing icon and Android adaptive icon source/layers |
| Feature graphic | Missing | 1024x500 PNG |
| Phone screenshots | Missing | At least 2, recommended 4-6, using approved real/demo jobs |
| Short description | Draft available | Final approval |
| Full description | Draft available | Final approval |
| Privacy policy URL | Planned | Publish and verify `https://jobtap.work/privacy` |
| Support email | Missing | Public support/privacy contact inbox |
| Content rating | Missing | Complete Google Play questionnaire |
| Target countries | Missing | Countries/regions where the app should be available |
| Data Safety | Draft guidance available | Submit final Play Console answers |
| Reviewer notes | Draft available | Confirm no mobile login/test credentials required |
| Release notes | Draft available | Confirm final `versionCode` and `versionName` |

Optional but recommended:

- Tablet screenshots if tablet distribution is enabled.
- Support URL if a help/contact page exists.
- Marketing URL if `https://jobtap.work` has a public landing page.
- Closed testing track before production rollout.

## Store Listing Copy

### Short Description

Preferred:

```text
Find part-time jobs fast and contact employers directly.
```

Alternative:

```text
Browse part-time jobs and contact employers directly.
```

### Full Description

```text
JobTap helps job seekers browse part-time job opportunities for their country and contact employers directly.

With JobTap, you can:
- Browse available jobs matched to your country
- View job details including salary, work time, employer, and location information
- Contact employers through external links such as phone, email, WhatsApp, Telegram, SMS, or web links
- Use the app without creating an account or submitting a resume
- Read privacy and terms information inside the app

JobTap does not process job applications inside the app. When you tap a contact link, communication happens outside JobTap through the selected external service, messaging app, phone app, email app, or website.

Permissions:
- Internet access is required to load job listings and send basic analytics events.
```

### Initial Release Notes

```text
Initial release with country-matched job browsing, job details, and direct employer contact links.
```

## Store Listing Languages

For the first release, enable only:

- English
- Chinese

Do not enable Spanish, French, German, Portuguese, Japanese, Korean, Arabic, or Hindi store listings yet unless product supplies production-quality translations and screenshots for those languages.

## Screenshot Plan

Prepare screenshots with approved demo jobs, not placeholder text.

| Screenshot | Required Content |
|---|---|
| 1. Job list | Country-matched job cards visible |
| 2. Job detail | Salary, work time, employer, description |
| 3. Contact flow | Contact Employer button and external contact behavior |
| 4. Settings/legal | Privacy Policy and Terms access |
| 5. Empty or loading state | Optional, only if visually useful |
| 6. Chinese UI | Required only if Chinese store listing is enabled |

## Privacy Policy URL

Use this URL in Google Play:

```text
https://jobtap.work/privacy
```

Before submission, verify:

- The URL is public and reachable without login.
- The page is served over HTTPS.
- The page content matches the final app behavior.
- The page includes a support/privacy contact email.

## Google Play Data Safety Recommendation

These answers must be reviewed in Play Console against the final production behavior.

### Data Collected

| Play Category | JobTap Data | Collected? | Shared? | Purpose | Required? |
|---|---|---|---|---|---|
| Device or other IDs | Anonymous deviceId | Yes | No sale or advertising sharing | Analytics, app functionality, fraud/abuse prevention | Required |
| Approximate location | countryCode only | Yes | No sale or advertising sharing | Country-matched jobs, analytics | Required |
| App activity / app interactions | app_open, job_list_view, job_detail_view, contact_click | Yes | No sale or advertising sharing | Analytics, app improvement | Required |
| Personal info | Name, email, phone for mobile job seekers | No | No | Not collected by mobile app | N/A |
| Files and docs | Resume/CV uploads | No | No | Not collected | N/A |
| User messages | Messages with employers | No | No | Happens outside JobTap | N/A |
| Financial info | Payments/subscriptions | No | No | Not collected | N/A |

### Security Practices

Recommended Play Console answers:

- Data is encrypted in transit: Yes, after production API and privacy site are served over HTTPS.
- Users can request data deletion: Yes, through support/privacy email listed in the privacy policy.
- App has account creation: No.
- App has user login: No.
- Data is shared with third parties: No for sale/ads. Infrastructure processors may handle data only to operate the service.

### Notes For Data Safety Review

- `deviceId` is anonymous and generated for analytics/deduplication.
- `countryCode` is coarse country-level routing data, not GPS location.
- `contact_click` records that a contact button was tapped, not the content of any external conversation.
- The app does not collect resumes, applications, profiles, or job seeker accounts.

## Content Rating Inputs

Human must complete the questionnaire in Play Console. Suggested product facts:

- App category: job listing / business / productivity style app.
- User-generated job submissions exist through employer web form, but jobs are moderated before publication.
- No in-app chat between users.
- No in-app purchases, gambling, or financial transactions.
- External links may open employer websites or communication apps.

## Reviewer Notes Draft

```text
JobTap is a job listing app. Mobile users do not need to log in, create an account, or submit a resume. Users browse jobs matched to their country, open job details, and tap Contact Employer to open an external link such as phone, email, WhatsApp, Telegram, SMS, or a web page.

Admin functionality is separate from the public mobile app and is not required to test the mobile user flow.

The app does not run background services and does not process payments. Analytics events are sent only when users interact with the app.

Privacy policy: https://jobtap.work/privacy
```

## Pre-Submission Checklist

- [ ] `https://jobtap.work/privacy` is live and reviewed.
- [ ] Production API domain is reachable over HTTPS from mobile networks.
- [ ] Final AAB is signed with the approved upload key.
- [ ] App icon uploaded and visually approved.
- [ ] Feature graphic uploaded.
- [ ] At least 2 phone screenshots uploaded; 4-6 preferred.
- [ ] Short and full descriptions approved.
- [ ] Support email is live and monitored.
- [ ] Data Safety form completed and reviewed.
- [ ] Content rating questionnaire completed.
- [ ] Target countries selected.
- [ ] Store listing languages limited to English and Chinese.
- [ ] Reviewer notes added.
- [ ] Internal or closed testing track used before production rollout.
- [ ] Real-device smoke test completed with the final AAB.
