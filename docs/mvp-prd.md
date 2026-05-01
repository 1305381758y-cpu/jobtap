# JobTap MVP PRD

## 1. Product Summary

Build JobTap, a lightweight global part-time jobs product focused on job browsing and external contact.

Product name:

- Global app name: `JobTap`
- Internal Chinese reference name: `点职`

The job seeker mobile app shows only jobs available in the user's detected country. Users do not create accounts, upload resumes, apply in-app, or chat in-app. The core flow is:

1. Open app.
2. View part-time jobs for the user's country.
3. Open a job detail page.
4. Tap the contact button.
5. The app opens the employer-provided external contact link.

Employers submit jobs through a standalone web form. Platform operators review submitted jobs in an admin console before they become visible in the app. Admin users can also publish jobs directly from the admin console.

## 2. Confirmed MVP Decisions

- Platform: native iOS and native Android.
- iOS: Swift / SwiftUI.
- Android: Kotlin / Jetpack Compose.
- Job seeker side is the primary product.
- Employer side is a standalone web submission form.
- Admin side is a web console.
- Jobs are visible only after manual approval.
- Users cannot manually switch countries.
- The app shows only jobs for the user's detected country.
- No user login in MVP.
- No resume upload.
- No in-app application flow.
- No in-app chat.
- No job categories.
- No tags.
- No language requirement field.
- No employer profile or employer description.
- No user-facing risk reminder before opening contact links.
- No job images in MVP.

## 3. MVP Modules

This PRD is designed so work can be split across separate conversations in the same workspace.

### Module A: Native Mobile Apps

Owner scope:

- iOS app.
- Android app.
- Country detection.
- Job list.
- Job detail.
- External contact link opening.
- Analytics event submission.
- Basic settings page.

Module A depends on backend APIs from Module C.

### Module B: Employer Web Submission Page

Owner scope:

- Public web form for employers to submit jobs.
- Client-side validation.
- Submit job to backend as `pending`.
- Basic success and failure states.

Module B depends on backend APIs from Module C.

### Module C: Backend, Admin Console, And Analytics

Owner scope:

- API service.
- Database schema.
- Employer-submitted job intake.
- Admin login.
- Admin job review.
- Admin job publishing.
- Admin job management.
- Admin statistics page.
- Analytics ingestion and aggregation.

Module C is the shared foundation for Modules A and B.

## 4. Job Seeker Mobile App

### 4.1 First Launch

The app detects the user's country without requiring account creation.

Country detection priority:

1. Device/system region.
2. IP country from backend request metadata or IP lookup.
3. Location permission only if the first two methods are unavailable or unreliable.

MVP should avoid requesting location permission unless necessary.

If country cannot be detected, show a blocking empty state. The user does not get a manual country selector in MVP.

### 4.2 Job List Page

The job list is the app's first screen.

Behavior:

- Fetch approved jobs for the detected `countryCode`.
- Show only jobs available in that country.
- Support pull-to-refresh.
- Support pagination or infinite scroll.
- Show an empty state if there are no approved jobs.
- Send analytics events for app/list activity.

List item fields:

- Job title.
- Country.
- City, if provided.
- Remote/local indicator.
- Salary.
- Work time.
- Employer name.
- Posted date.

Do not show:

- Tags.
- Categories.
- Language requirements.
- Employer description.
- Apply button.
- Resume prompt.

### 4.3 Job Detail Page

Fields:

- Job title.
- Employer name.
- Country.
- City, optional.
- Remote/local indicator.
- Salary.
- Work time.
- Job description.
- Posted date.

Primary action:

- Fixed bottom button: `Contact Employer`.

Behavior:

- Opening the detail page sends `job_detail_view`.
- Tapping `Contact Employer` sends `contact_click`.
- After event submission is triggered, the app opens `contactUrl`.
- The link may open another app or a browser depending on OS behavior and installed apps.

### 4.4 External Contact Link

The app should attempt to open the employer-provided `contactUrl` using native OS link handling.

Supported examples:

- `https://...`
- `mailto:...`
- `tel:...`
- Common app deep links where supported by OS configuration.

If the link cannot be opened, show a simple failure message.

No extra user-facing warning or safety reminder is required in MVP.

### 4.5 Settings Page

Minimal settings:

- Language.
- Privacy policy.
- Terms.
- App version.

## 5. Employer Web Submission Page

### 5.1 Purpose

Employers submit jobs through a public standalone web form. Submitted jobs are not shown immediately. They enter the admin review queue.

### 5.2 Fields

Required:

- Job title.
- Employer name.
- Country.
- Remote/local indicator.
- Salary.
- Work time.
- Job description.
- Contact link.

Optional:

- City.

System-generated:

- Job ID.
- Source: `employer_submitted`.
- Status: `pending`.
- Created time.
- Updated time.

### 5.3 Validation

Client-side and server-side validation:

- Required fields cannot be empty.
- Country must be a supported country code.
- Contact link must be parseable as a URL or supported URI.
- Salary and work time are stored as display text in MVP to support global formats.

Contact link validation should prevent clearly invalid or dangerous input, but MVP does not need complex link reputation scoring.

### 5.4 Submission Result

After successful submission:

- Show a success page/message.
- Explain that the job will be reviewed before publishing.

No employer account or submission tracking is required in MVP.

## 6. Admin Console

### 6.1 Login

Admin console requires authenticated operator access.

MVP can start with simple admin authentication, but it must not be public.

### 6.2 Job Review

Admin users can review employer-submitted jobs.

Functions:

- View pending jobs.
- View job details.
- Open/test contact link.
- Approve job.
- Reject job.
- Add optional rejection reason.

Approved jobs become visible in the mobile app for the selected country.

### 6.3 Admin Job Publishing

Admin users can create jobs directly in the console.

Fields are the same as employer submission:

- Job title.
- Employer name.
- Country.
- City, optional.
- Remote/local indicator.
- Salary.
- Work time.
- Job description.
- Contact link.

Admin-created jobs:

- Source: `admin_created`.
- Can be published directly as `approved`.
- Can be saved as draft if draft status is implemented.

### 6.4 Job Management

Admin users can:

- View all jobs.
- Filter by country.
- Filter by status.
- Filter by source.
- Search by job ID, title, or employer name.
- Edit jobs.
- Approve pending jobs.
- Reject pending jobs.
- Remove/downlist published jobs.
- Delete jobs if hard delete is allowed.

Recommended statuses:

- `draft`
- `pending`
- `approved`
- `rejected`
- `removed`

### 6.5 Statistics Page

The statistics page is a country and job performance table.

Default time range:

- All time.

Filters:

- All time.
- Today.
- Last 7 days.
- Last 30 days.
- Custom date range.
- Country.
- Job ID.

Table fields:

- Country.
- Active users.
- Job ID.
- Detail views.
- Contact clicks.
- Contact click rate.

Metric definitions:

- Active users: distinct devices active in the country, deduplicated by `countryCode + deviceId`.
- Detail views: distinct devices that viewed the specific job detail page, deduplicated by `countryCode + jobId + deviceId`.
- Contact clicks: distinct devices that clicked contact for the same job, deduplicated by `countryCode + jobId + deviceId`.
- Contact click rate: `contact clicks / detail views`.

Important counting rules:

- The statistics table is grouped by `country + jobId`.
- A single device viewing the same job multiple times counts as 1 detail view for that job.
- A single device clicking contact for the same job multiple times counts as 1 contact click for that job.
- A single device viewing or clicking different jobs counts once for each job.
- Contact clicks should be counted for the job whose contact button was clicked.
- Contact clicks should be interpreted as a subset of devices that viewed that same job detail.
- If detail views are 0, contact click rate displays `-`.

Example:

| Country | Active users | Job ID | Detail views | Contact clicks | Contact click rate |
| --- | ---: | --- | ---: | ---: | ---: |
| US | 1200 | job_001 | 300 | 80 | 26.7% |
| US | 1200 | job_002 | 180 | 45 | 25.0% |
| JP | 640 | job_021 | 90 | 20 | 22.2% |

The same country's active user count may repeat across multiple job rows because the table is grouped by country and job.

## 7. Analytics Events

### 7.1 Required Events

`app_open`

- Sent when the app opens.
- Used for active user metrics.

`job_list_view`

- Sent when the job list is loaded or refreshed.
- Can also contribute to active user metrics.

`job_detail_view`

- Sent when a user opens a job detail page.
- Required for detail view metrics.

`contact_click`

- Sent when a user taps the contact button.
- Required for contact click metrics.

### 7.2 Event Fields

Required:

- `eventType`
- `deviceId`
- `countryCode`
- `createdAt`
- `platform`

Conditional:

- `jobId` for `job_detail_view` and `contact_click`.

Recommended:

- `appVersion`
- `locale`
- `sourceScreen`

### 7.3 Device ID

The app should generate or retrieve a stable anonymous device ID.

Requirements:

- No login required.
- No personally identifying user profile required.
- Device ID should persist across normal app restarts.
- If the app is uninstalled and reinstalled, a new device ID is acceptable for MVP.

## 8. Suggested Data Model

### 8.1 Jobs

`jobs`

- `id`
- `title`
- `employerName`
- `countryCode`
- `city`
- `isRemote`
- `salaryText`
- `workTimeText`
- `description`
- `contactUrl`
- `status`
- `source`
- `createdByAdminId`
- `reviewedByAdminId`
- `rejectionReason`
- `createdAt`
- `updatedAt`
- `reviewedAt`
- `publishedAt`

### 8.2 Analytics Events

`analytics_events`

- `id`
- `eventType`
- `deviceId`
- `countryCode`
- `jobId`
- `platform`
- `appVersion`
- `locale`
- `sourceScreen`
- `createdAt`

Recommended indexes:

- `(eventType, countryCode, createdAt)`
- `(eventType, countryCode, jobId, createdAt)`
- `(countryCode, deviceId, createdAt)`
- `(countryCode, jobId, deviceId, eventType)`

### 8.3 Admin Users

`admin_users`

- `id`
- `email`
- `passwordHash`
- `role`
- `createdAt`
- `updatedAt`

## 9. API Surface

### Mobile App APIs

- `GET /api/mobile/bootstrap`
  - Returns detected country, supported locales, and app config.

- `GET /api/mobile/jobs?countryCode=US&page=1`
  - Returns approved jobs for the country.

- `GET /api/mobile/jobs/:id`
  - Returns approved job detail if visible in the user's country.

- `POST /api/mobile/analytics/events`
  - Ingests analytics events.

### Employer Submission APIs

- `POST /api/employer/jobs`
  - Creates a pending employer-submitted job.

### Admin APIs

- `POST /api/admin/login`
- `GET /api/admin/jobs`
- `POST /api/admin/jobs`
- `GET /api/admin/jobs/:id`
- `PATCH /api/admin/jobs/:id`
- `POST /api/admin/jobs/:id/approve`
- `POST /api/admin/jobs/:id/reject`
- `POST /api/admin/jobs/:id/remove`
- `GET /api/admin/statistics`

## 10. Localization

MVP supports UI localization for 10 languages:

- English
- Chinese
- Spanish
- French
- German
- Portuguese
- Japanese
- Korean
- Arabic
- Hindi

Job content is shown in the original employer/admin submitted language in MVP.

Automatic job translation is deferred to V1.

## 11. MVP Exclusions

Do not build in MVP:

- Job seeker accounts.
- Employer accounts.
- Resume upload.
- In-app applications.
- In-app chat.
- Job categories.
- Tags.
- Language requirement fields.
- Employer profiles.
- Employer descriptions.
- Maps.
- Manual country switching.
- Saved jobs.
- Browsing history.
- Push notifications.
- Payments.
- Paid promotion.
- AI matching.
- Auto translation of job content.

## 12. Version Roadmap

### MVP

Goal: validate whether users browse local-country part-time jobs and click external contact links.

Includes:

- Native iOS and Android browsing flow.
- Employer web submission.
- Admin review and admin publishing.
- Analytics events.
- Admin statistics by country and job.

### V1

Goal: improve content quality and operational control.

Possible additions:

- Job reporting.
- Auto translation of job content.
- Employer submission status lookup.
- Better link validation.
- Basic fraud moderation tools.
- More detailed statistics.

### V2

Goal: improve retention.

Possible additions:

- Saved jobs.
- Browsing history.
- Job alerts.
- Push notifications.

### V3

Goal: monetize.

Possible additions:

- Employer accounts.
- Paid job boosting.
- Country targeting.
- City targeting.
- Employer verification.

## 13. Execution Notes For Separate Conversations

When splitting implementation into separate conversations, use these module boundaries:

- Conversation 1: `Module C` first, because API contracts and database schema unblock the other modules.
- Conversation 2: `Module A` native mobile apps, using the API contracts from Module C.
- Conversation 3: `Module B` employer web form and admin console, or split admin console into its own conversation if the web scope grows.

If the project starts from an empty repository, create the backend/API project first, then add mobile clients after the API schema is stable.
