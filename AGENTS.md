# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages, layouts, and metadata routes (e.g., `src/app/page.tsx`, `src/app/icon.tsx`).
- `src/components`: Reusable UI and scene components (e.g., `src/components/ParallaxScene.tsx`).
- `public`: Static assets served at the site root.
- Root configs: `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`.
- Project overview and current feature set: `PROJECT_OVERVIEW.md`.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server.
- `npm run build`: Production build.
- `npm run start`: Run the production server (after build).
- `npm run lint`: Run ESLint.

## Coding Style & Naming Conventions
- TypeScript + React (App Router). Use `.tsx` for files with JSX.
- Indentation: 2 spaces (default Prettier-style). Keep components functional and hooks at top-level.
- Naming: `PascalCase` for components, `camelCase` for functions/variables, `kebab-case` for routes.
- Styling: Tailwind utility classes in JSX; avoid inline styles except for `next/og` image generation.

## Testing Guidelines
- No automated test framework configured yet.
- If adding tests, prefer co-locating under `src` and follow `*.test.ts(x)` naming.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and scoped to the change (e.g., `tweak ui`, `Add three types for build`).
- PRs should include: a concise summary, screenshots for UI changes, and linked issues if applicable.

## Security & Configuration Tips
- Store secrets in `.env*` (never commit). Required values will be documented in `INTEGRATION_NOTES.md` when export/share is implemented.
