# Airavut Education Ventures website

A production-ready Next.js application for Airavut Education Ventures. It preserves the supplied six-page content and visual design, uses crawlable routes, and includes a PostgreSQL/Prisma applicant inquiry and administration workflow.

## Local setup

1. Copy `.env.example` to `.env.local` and provide the required values.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Apply `prisma/migrations/20261015000000_initial/migration.sql` through your normal database migration process. This repository does not run or apply migrations automatically.
5. Generate an admin password hash with `npm run admin:hash -- "a-long-private-password"` and place the output in `ADMIN_PASSWORD_HASH`.
6. Start the project with `npm run dev`.

The public website is available at `/`, and authorized administration is at `/admin/login`.

## External configuration

- PostgreSQL is required for inquiries, private portfolio files, audit logs and login rate limiting.
- Cloudflare Turnstile is required in production. The development-only bypass is disabled when `NODE_ENV=production`.
- Resend credentials enable administrator and applicant email notifications. An accepted inquiry is stored before email is attempted; delivery errors are recorded on the inquiry and in the audit log.

## Data and security notes

- Portfolio files are limited to 10 MB, checked by extension, MIME type and file signature, and stored as private PostgreSQL `bytea` records.
- Admin sessions are signed, HTTP-only, same-site cookies with an eight-hour lifetime.
- CSV and Excel exports use server-side authorization, honor active filters and neutralize spreadsheet formulas.
- Raw visitor IP addresses are never stored; keyed hashes are used for rate limiting.
- Define and enforce an organizational retention schedule for applicant records before production launch.

## Validation

Run `npm run prisma:validate`, `npm run typecheck`, `npm run lint`, and `npm run build`. These commands do not apply migrations or deploy the site.
