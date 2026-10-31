# prllx

prllx turns a stack of PNG layers into a 3D parallax scene. You orbit the camera, adjust spacing and rotation per layer, and optionally add an HDR or LDR environment. Accounts on the export allow-list can publish a read-only share page and an embeddable frame.

## Requirements

- Node.js 20.9 or newer
- pnpm 10.33.4 (`packageManager` in `package.json`)

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a GitHub OAuth app whose callback URL is `http://localhost:3000/api/auth/callback/github`, and put the client id and secret in `.env.local`. `EXPORT_ALLOWED_EMAILS` is the comma-separated list of GitHub account emails that may export. Blob storage is only required for export and sharing; the local viewer works without it.

## Scripts

- `pnpm dev` starts the Next.js dev server
- `pnpm lint` runs ESLint
- `pnpm typecheck` runs `tsc --noEmit`
- `pnpm build` creates a production build
- `pnpm start` serves that build

## Environment variables

| Name | Purpose |
| --- | --- |
| `GITHUB_CLIENT_ID` | GitHub OAuth client id |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `BETTER_AUTH_SECRET` | Secret used to sign sessions |
| `BETTER_AUTH_URL` | Public origin used by the auth server |
| `NEXT_PUBLIC_APP_URL` | Public origin used in share and embed URLs |
| `EXPORT_ALLOWED_EMAILS` | Emails allowed to export, comma-separated |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
| `CRON_SECRET` | Bearer token for the expired-scene cleanup route |

See `.env.example` for the same list.

## Deploy

Deploy on Vercel with the environment variables above set for Production (and Preview, if previews should be able to sign in and export).

1. Connect a Blob store so Vercel provides `BLOB_READ_WRITE_TOKEN`.
2. Set the GitHub OAuth callback to `https://<your-domain>/api/auth/callback/github`.
3. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that same origin, without a trailing slash.
4. Set `CRON_SECRET` to a long random string. The name must be exactly `CRON_SECRET`. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`.
5. `vercel.json` schedules `GET /api/cron/cleanup-scenes` once a day. Cron jobs run on production deployments only. After the first deploy, you can invoke that URL once with the bearer token to move existing scene metadata into private storage and delete scenes that are already expired.

Scene images stay on public blob URLs so the browser can render them. Scene metadata, including the owner id, is a private blob. The viewer API returns the scene fields the page needs and does not include the owner id or email. This app has no database, so it does not keep a view counter: counting a view used to rewrite the metadata blob on every request.

The owner of a scene can delete it with `DELETE /api/scenes/<id>` while signed in. Anyone else gets a 404.
