# Export + Share Plan

This captures the agreed requirements and pending details for implementing export/share.

## Requirements
- Export scenes to unique public URLs.
- Public view-only page for anyone.
- Editable only for the creator.
- Auth: provider TBD (Neon Auth was discussed, now deferred).
- Storage: Vercel Blob for PNGs.
- Database: provider TBD (Neon Postgres was discussed, now deferred).
- Upload limits: 10 MB per PNG.

## Planned Work
- Define DB schema for scenes/layers and add DB client + migrations (provider TBD).
- Configure auth for creator login and session handling (provider TBD).
- Add Blob upload + scene export API with size limits and access checks.
- Build share route `/s/[id]` in read-only mode.
- Add export button to create the share URL.
- Add env/config docs for DB + Blob + Auth.

## Pending Inputs
- Vercel Blob token/config (BLOB_READ_WRITE_TOKEN).
- Auth configuration details (provider TBD).
- Database connection details (provider TBD).
- Site URL for auth callbacks.
