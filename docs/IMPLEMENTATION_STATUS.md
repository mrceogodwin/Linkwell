# Linkwell implementation status

**Last audited:** 2026-10-29

## Implemented in GitHub main

- Responsive public site and informational/legal pages.
- Neon PostgreSQL schema and server-side database helper.
- Public opportunity search and opportunity detail pages, with public API queries restricted to published and non-expired listings.
- Registration, email verification, email-link sign-in, resend verification, sign-out, hashed one-time tokens, expiring sessions, and server-side role checks.
- Talent profile editing, profile visibility controls, public talent directory, saved opportunities, application submission and application history.
- Employer job/listing management, applicant review/status updates, private employer notes, listing archive controls.
- Admin moderation queue/actions and employer verification review/search.
- Application tracker keyword search and status filters.
- GitHub Actions CI currently runs dependency installation, TypeScript checks and a production build. Main commit `aeaea326babcce754891f802b1cd62b31e0994a8` passed CI run [40856154440](https://github.com/mrceogodwin/Linkwell/actions/runs/40856154440).

## Verified deployment and database observations

- The canonical Vercel project is `linkwell` under the existing account; do not create a duplicate project.
- The latest confirmed READY production deployment is commit `c396f6aff28bf5a7be89366456ff8cfddcca8f97`, older than current main.
- The live `/api/health` endpoint returned HTTP 503 with `database: not_configured` when checked on 2026-10-29. That check was served by the older deployment, before the current deployment could be made.
- A deployment attempt for current main failed with Vercel `git_info_fail`. Inspecting the Vercel account's Git deployment context showed the Linkwell project is not listed among linked GitHub projects. Attempting to link it returned: **"You need to add a Login Connection to your GitHub account first."** This is the immediate deployment blocker; reconnecting the repository requires the account owner to add/authorize the GitHub Login Connection in Vercel.
- Vercel environment listing includes `DATABASE_URL`, but the production runtime has not yet been verified against it.
- The intended Neon project `Linkwell` has a ready default branch and a database named `linkwell`. Read-only table inspection confirmed the application tables exist: `users`, `talent_profiles`, `employer_profiles`, `jobs`, `applications`, `saved_jobs`, `auth_email_tokens`, `auth_sessions`, `admin_audit_logs`, `payments`, and `subscriptions`, plus Neon Auth tables. This verifies table presence only; it does not prove that the Vercel connection string targets this database or that all current application queries work.
- `BREVO_API_KEY` and `LINKWELL_FROM_EMAIL` were not present in the visible Vercel environment-variable listing, so current Brevo email delivery is not configured until those values are added. Never put credentials in GitHub.
- A Neon Auth endpoint and related variables exist in Vercel, but the currently merged code uses Brevo email links and database sessions. The draft PR #1 migrating to Neon Auth remains unmerged and must not be represented as live.

## Launch blockers and remaining work

1. **Vercel Git connection:** in the existing Vercel account, add/authorize the GitHub Login Connection, then reconnect `mrceogodwin/Linkwell` to the existing `linkwell` project. Do not create another project. After the connection is fixed, deploy current main and verify the production alias.
2. **Database:** confirm production `DATABASE_URL` points to the Neon `linkwell` database; after deployment, check `/api/health` and run authenticated read/write smoke tests.
3. **Email and authentication:** configure Brevo sender/API credentials; test registration, verification, sign-in, resend, expiry, one-time token behavior, logout, role-specific redirects, and disabled accounts end to end.
4. **End-to-end permissions:** test talent, employer, and admin routes with separate accounts; verify cross-employer applicant access is denied and public talent/job data contains only intended fields.
5. **CV/attachments:** private object storage and secure upload/download authorization are not complete.
6. **Billing:** payment provider, signed webhook verification, idempotency, receipts, and paid entitlement enforcement are not complete. Do not simulate successful payments.
7. **Operational quality:** add/verify automated integration tests, error monitoring, rate limiting strategy, backup/restore, retention/deletion, and support contact.
8. **Legal and launch checks:** review privacy/terms, accessibility and mobile flows, seed only clearly identified test data, and run a final production smoke test.

## Important distinction

A passing CI build proves the code compiles and the framework can build it. It does **not** prove that database-backed features, email delivery, permissions, billing, or production deployment work. Do not call Linkwell launched until the blockers above are resolved and tested.