# Export + Share Plan

This captures the agreed requirements and pending details for implementing export/share.

## Requirements
- Export scenes to unique public URLs.
- Public view-only page for anyone.
- Editable only for the creator.
- Auth: use Neon Auth (simplest flow acceptable).
- Storage: Vercel Blob for PNGs.
- Database: Neon Postgres for scene metadata.
- Upload limits: 10 MB per PNG.

## Planned Work
- Define Neon schema for scenes/layers and add DB client + migrations.
- Configure Neon Auth for creator login and session handling.
- Add Blob upload + scene export API with size limits and access checks.
- Build share route `/s/[id]` in read-only mode.
- Add export button to create the share URL.
- Add env/config docs for Neon + Blob + Auth.

## Pending Inputs
- Neon connection string (DATABASE_URL).
- Vercel Blob token/config (BLOB_READ_WRITE_TOKEN).
- Neon Auth configuration details (provider settings).
- Site URL for auth callbacks.
