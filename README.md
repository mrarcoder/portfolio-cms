# Portfolio CMS

A small, self-hosted portfolio CMS for people who want to update career content without editing source code or rebuilding their site. It combines a Next.js frontend on Vercel with a Cloudflare Worker, D1 database, and private R2 bucket.

## Features

- One protected administrator account and one-time setup flow
- Profile, portrait, résumé, experience, education, categorized skills, projects, achievements, certifications, and social links
- Create, edit, delete, show/hide, and reorder content
- Inline JPEG, PNG, WebP, and PDF uploads with a 3 MiB limit
- Public contact form with rate limiting and a private inbox
- One responsive theme with primary-color and light/dark settings
- Dynamic metadata, canonical URL, Open Graph data, Person JSON-LD, sitemap, and robots rules
- Fresh server rendering: published changes appear without a Git commit or frontend rebuild

## Architecture

```text
Browser
   │
   ▼
Next.js on Vercel ── same-origin /api proxy ──▶ Cloudflare Worker
                                                       │
                                            ┌──────────┴──────────┐
                                            ▼                     ▼
                                       Cloudflare D1         Cloudflare R2
```

Next.js renders the public site and admin interface. The Worker is the only authority for authentication, validation, database access, and file storage. The R2 bucket stays private; files are served through validated Worker routes.

## Requirements

- Node.js 22.13 or newer, or Node.js 24+
- npm
- For production: Cloudflare and Vercel accounts

## Local setup

### 1. Install the project

```bash
git clone https://github.com/mrarcoder/portfolio-cms.git
cd portfolio-cms
npm ci
```

### 2. Create local configuration

```bash
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars
```

`.env.local` should contain the local Worker origin:

```env
WORKER_API_URL=http://127.0.0.1:8787
```

Generate two different random values. Run this command twice:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Put the results in `worker/.dev.vars`:

```env
SETUP_TOKEN=paste-the-first-random-value
AUTH_PEPPER=paste-the-second-random-value
```

Both values must contain at least 32 characters. `AUTH_PEPPER` must remain stable after account creation; losing or changing it prevents existing password verification. These files are ignored by Git.

### 3. Create the local database

```bash
npm run db:migrate
```

Wrangler creates local D1 and R2 state under `worker/.wrangler/`.

### 4. Start the application

```bash
npm run dev
```

This starts:

- Portfolio: `http://127.0.0.1:3000`
- Setup: `http://127.0.0.1:3000/setup`
- Login: `http://127.0.0.1:3000/login`
- Worker: `http://127.0.0.1:8787`

Use `127.0.0.1`, because the Worker validates the browser origin exactly. Open `/setup`, enter the `SETUP_TOKEN`, and choose the owner username and password. Setup permanently locks after the first owner is created.

### Reset local data

Stop the development server first. The following removes the local account, content, messages, and uploaded files:

```bash
rm -rf worker/.wrangler/state
npm run db:migrate
```

Then open `/setup` again. This command affects local Wrangler data only.

## Using the CMS

Sign in at `/login` and use the admin navigation to manage:

1. **Profile** — identity, biography, contact details, portrait, and résumé.
2. **Experience and education** — dated career and study history.
3. **Skill categories and skills** — create categories before assigning skills.
4. **Projects** — descriptions, technology names, links, dates, progress, and one image.
5. **Achievements and certifications** — credentials and optional certificate PDFs.
6. **Social links** — arbitrary public profile links.
7. **Messages** — read or delete contact submissions.
8. **Settings** — site identity, public URL, SEO defaults, enabled sections, color, and light/dark mode.

New list content starts hidden unless **Visible** is selected. Up/down controls define public display order. A fresh public request reflects saved changes immediately.

## Production deployment

### 1. Authenticate Wrangler

```bash
npx wrangler login
```

See the official [Wrangler authentication documentation](https://developers.cloudflare.com/workers/wrangler/commands/#authentication).

### 2. Create D1 and R2 resources

```bash
npx wrangler d1 create portfolio-cms
npx wrangler r2 bucket create portfolio-cms-media
```

Copy the D1 database UUID returned by Wrangler. R2 bucket names must be valid lowercase names, so choose another name if `portfolio-cms-media` is unavailable. See Cloudflare's [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/) and [R2 bucket guide](https://developers.cloudflare.com/r2/buckets/create-buckets/).

### 3. Configure Worker bindings

Edit `worker/wrangler.jsonc`:

```jsonc
{
  "vars": {
    "FRONTEND_ORIGIN": "https://your-project.vercel.app"
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "portfolio-cms",
    "database_id": "paste-your-d1-database-uuid",
    "migrations_dir": "../database/migrations"
  }],
  "r2_buckets": [{
    "binding": "MEDIA",
    "bucket_name": "portfolio-cms-media"
  }]
}
```

Keep the binding names `DB` and `MEDIA`. Set `FRONTEND_ORIGIN` to one exact HTTPS origin without a trailing slash. Preview domains need separate Worker configuration; the V1 setup expects one frontend origin.

If the final Vercel URL is not known yet, use the planned URL temporarily and update it after the first Vercel deployment, before opening `/setup`.

### 4. Apply remote migrations

```bash
npx wrangler d1 migrations apply DB --remote --config worker/wrangler.jsonc
```

Review `database/migrations/` before applying changes to an existing database. Cloudflare documents migration behavior in its [D1 migrations guide](https://developers.cloudflare.com/d1/reference/migrations/).

### 5. Configure Worker secrets

Generate two different random values as shown in the local setup, then run:

```bash
npx wrangler secret put SETUP_TOKEN --config worker/wrangler.jsonc
npx wrangler secret put AUTH_PEPPER --config worker/wrangler.jsonc
```

Enter each value interactively. Keep `AUTH_PEPPER` in a secure password manager or secret vault. Never commit it. Cloudflare documents this flow in [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

### 6. Deploy the Worker

```bash
npx wrangler deploy --config worker/wrangler.jsonc
```

Record the HTTPS `workers.dev` URL printed by Wrangler, for example:

```text
https://portfolio-cms-api.your-subdomain.workers.dev
```

Check the Worker directly:

```bash
curl https://portfolio-cms-api.your-subdomain.workers.dev/api/health
```

The response should report `status: ready`.

### 7. Deploy Next.js to Vercel

1. In Vercel, create a project from `mrarcoder/portfolio-cms`.
2. Keep the repository root as the project root and select the Next.js framework preset.
3. Add `WORKER_API_URL` to Production with the Worker HTTPS origin. Do not add `/api` or a trailing path.
4. Deploy the project.

Vercel automatically deploys future pushes from the connected Git repository. Environment changes apply only to new deployments, so redeploy after changing `WORKER_API_URL`. See [Vercel's GitHub deployment guide](https://vercel.com/docs/git/vercel-for-github) and [environment-variable documentation](https://vercel.com/docs/environment-variables/managing-environment-variables).

### 8. Finalize the production origin

Copy the exact production Vercel or custom-domain origin into `FRONTEND_ORIGIN` in `worker/wrangler.jsonc`, then deploy the Worker again:

```bash
npx wrangler deploy --config worker/wrangler.jsonc
```

This step is required for setup, login, content changes, uploads, and contact submissions.

### 9. Create the production owner

1. Open `https://your-frontend.example/setup`.
2. Enter the production `SETUP_TOKEN`.
3. Choose a unique username and strong password.
4. Sign in at `/login`.
5. Open **Settings** and set **Site URL** to the exact public frontend origin.
6. Add profile content and confirm it appears on the public page.

After setup, you may remove `SETUP_TOKEN` from the deployed Worker. The database singleton still prevents a second owner:

```bash
npx wrangler secret delete SETUP_TOKEN --config worker/wrangler.jsonc
```

Do not delete or rotate `AUTH_PEPPER` while the account is in use.

## Production verification

- `/api/health` through the frontend reports `ready`.
- `/admin` redirects anonymous visitors to `/login`.
- Login sets an HttpOnly, Secure, SameSite=Lax session cookie.
- A saved profile or project appears after a fresh public request.
- Hidden projects and their media return 404 publicly.
- `sitemap.xml` contains only visible projects.
- `robots.txt` excludes `/admin`, `/setup`, and `/login`.
- Contact messages appear only in the authenticated inbox.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js and the local Worker together |
| `npm run dev:web` | Start only Next.js on port 3000 |
| `npm run dev:worker` | Start only the Worker on port 8787 |
| `npm run db:migrate` | Apply pending migrations to local D1 |
| `npm run lint` | Run ESLint |
| `npm test` | Run focused authentication and schema tests |
| `npm run build` | Create the optimized Next.js production build |
| `npm run worker:check` | Bundle the Worker without deploying it |

## Troubleshooting

### Login shows `Failed to fetch`

- Open `http://127.0.0.1:3000`, not `http://localhost:3000`.
- Confirm both processes from `npm run dev` are still running.
- Open `http://127.0.0.1:3000/api/health`; it should return a successful JSON response.
- Confirm `.env.local` points to `http://127.0.0.1:8787`.
- Confirm `FRONTEND_ORIGIN` exactly matches the browser origin.

### Setup is unavailable

- Confirm `worker/.dev.vars` exists beside `worker/wrangler.jsonc`.
- Ensure both secrets are different and at least 32 characters long.
- Run `npm run db:migrate` before starting the app.

### Login always fails after changing secrets

`AUTH_PEPPER` participates in password verification. Restore the original value. For a disposable local installation, reset local data and create the owner again. Production recovery requires a deliberate password-reset migration or restoring the secret.

### Upload fails

Only JPEG, PNG, WebP, and PDF files up to 3 MiB are accepted. The server checks both the declared type and file signature. Media cannot be deleted while referenced by profile or content records.

### Port already in use

Stop the other service using port 3000 or 8787, then run `npm run dev` again. The combined command stops its sibling process if either server fails.

## Security notes

- The browser derives a 600,000-round PBKDF2-SHA-256 verifier; the Worker stores only its peppered HMAC.
- Production requires HTTPS because the submitted verifier functions as the login credential.
- Session tokens are random, stored as hashes in D1, and sent in HttpOnly cookies.
- Browser mutations require the configured exact origin.
- Login and contact submissions use persistent D1 rate limits.
- Stored content is rendered as plain text, and uploaded SVG/HTML content is rejected.
- `SETUP_TOKEN`, `AUTH_PEPPER`, Cloudflare tokens, `.env.local`, and `.dev.vars` must never be committed.

## Project structure

```text
app/                       Next.js pages, layouts, metadata, and API proxy
components/admin/          Admin navigation, editors, inbox, and settings UI
components/auth/           Setup and sign-in UI
components/portfolio/      Public portfolio and contact UI
components/ui/             UI shared across feature areas
database/migrations/       Ordered D1 migrations
docs/                      AI references and project documentation
lib/admin/                 Admin resource definitions and payload helpers
lib/auth/                  Browser-side password derivation
lib/api.js                 Server-side Worker API client
scripts/                   Local development and route smoke-test scripts
styles/                    Base, admin, auth, portfolio, and responsive CSS
tests/                     Focused Node integration and security tests
worker/src/                Worker routing, auth, content, and media logic
worker/wrangler.jsonc      Cloudflare bindings and deployment configuration
```

The accepted V1 boundary is documented in [docs/SCOPE.yml](docs/SCOPE.yml). Implementation and security decisions are in [docs/ARCHITECTURE.yml](docs/ARCHITECTURE.yml) and [docs/DATA_API.yml](docs/DATA_API.yml). See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) before submitting changes.

## License

[MIT](LICENSE)
