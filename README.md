# Linkwell

**Great talent. Wider possibilities.**

Linkwell is a talent marketplace being built to connect African professionals with employers around the world.

## Product requirements

See [docs/PRD.md](docs/PRD.md) for the product scope, roles, listing approval lifecycle, monetization, planned architecture, security requirements and launch gates.

## Current implementation status

The repository contains a Next.js App Router + TypeScript public-site foundation, responsive brand styling, informational pages, a database-backed approved-opportunities API, a health endpoint, a Neon schema migration, environment-variable template, and a CI workflow intended to run TypeScript and production-build checks.

**This is not yet a functioning marketplace.** No live vacancies or database are connected yet; signup/sign-in are not active; CV storage, application workflow, employer dashboard, administrator moderation actions, and billing integration are not implemented. The jobs API returns an unavailable response until DATABASE_URL is configured and db/schema.sql is applied. Do not treat this site as launched or collect real user data until these are implemented and tested.

## Stack

- Next.js 15 App Router + React 19 + TypeScript
- Intended hosting: Vercel
- Planned database: Neon PostgreSQL
- Planned: one established authentication provider, private object storage for CVs, and a verified payment provider

## Local development

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run typecheck
npm run build
```

The CI workflow installs dependencies and runs both commands on pushes and pull requests. A passing CI result must be checked in GitHub before claiming the build passes.

## Brand

- Forest green: `#123D2B`
- Soft mint: `#D7FBE8`
- Warm white: `#FAFAF7`
- Charcoal: `#171A18`

## Security requirements

Never expose CVs publicly, grant admin rights based only on an email address, publish listings before moderation approval, or grant paid entitlements without verified payment webhooks. Keep secrets server-side and out of source control.
