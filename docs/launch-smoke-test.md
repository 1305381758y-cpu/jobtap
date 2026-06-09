# JobTap Launch Smoke Test Checklist

Run this checklist against the final production or release-candidate environment before Google Play submission and again before production rollout.

## Environment

- [ ] Production API domain resolves publicly.
- [ ] Production API uses valid HTTPS certificate.
- [ ] Backend has production env configured: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FRONTEND_ORIGINS`, `TYPEORM_SYNCHRONIZE=false`.
- [ ] Database migration has been run successfully.
- [ ] Final Android AAB was built with the production API URL and approved upload key.

## Backend Health

- [ ] `GET /health` returns HTTP 200.
- [ ] Health response includes database status `ok`.
- [ ] Invalid database connection returns failure in staging test, if feasible.

## Admin Login

- [ ] Admin console loads from production admin URL.
- [ ] Owner admin can log in with production credentials.
- [ ] Invalid password is rejected.
- [ ] Disabled admin cannot log in, if a disabled test account exists.

## Employer Submit Job

- [ ] Employer submission page loads.
- [ ] Valid job can be submitted.
- [ ] Submitted job is pending and not visible in mobile app before approval.
- [ ] Invalid contact link is rejected.
- [ ] Honeypot field rejects bot-like submission in staging test.

## Approve Job

- [ ] Pending job appears in admin review queue.
- [ ] Admin can open full job detail before approval.
- [ ] Contact URL is visible for review.
- [ ] Admin can approve the job.
- [ ] Approved job receives `publishedAt`.

## Mobile List

- [ ] Fresh install opens without login.
- [ ] App detects country or receives backend country fallback.
- [ ] Job list returns only approved jobs for the detected country.
- [ ] Jobs from other countries are not shown.
- [ ] Empty country state is understandable if no jobs exist.

## Mobile Detail

- [ ] Tapping a job opens job detail.
- [ ] Salary, work time, employer, description, and contact button are visible.
- [ ] Detail analytics event is sent once per job/device for reporting purposes.

## Contact Click

- [ ] Contact button opens `https` link.
- [ ] Contact button opens `mailto` link.
- [ ] Contact button opens `tel` link.
- [ ] Contact button opens `sms` link.
- [ ] Contact button opens WhatsApp/Telegram links when installed.
- [ ] Unsupported external link shows an error and does not crash.
- [ ] Contact click analytics event is sent after detail view.

## Statistics Dedupe

- [ ] Multiple detail views by the same device for the same job count as 1 detail viewer.
- [ ] Multiple contact clicks by the same device for the same job count as 1 contact clicker.
- [ ] Contact click count only includes devices that viewed the same job detail.
- [ ] Country active users count distinct devices at the country level.
- [ ] Contact click rate equals `contactClicks / detailViews`.

## Store Submission Evidence

- [ ] AAB path and SHA-256 recorded.
- [ ] Upload key certificate fingerprint recorded.
- [ ] Screenshots and store copy approved.
- [ ] Privacy policy URL live.
- [ ] Data Safety answers approved.
- [ ] Known issues and accepted risks recorded.
