# Project Overview

prllx is a Next.js web app for exploring layered PNG artwork as a 3D parallax stack. Users upload multiple PNG files, which are sorted by filename (e.g., `1.png`, `2.png`, `3.png`) and rendered as transparent planes in a three.js scene. The viewer supports orbiting the camera for a parallax effect, with configurable orbit limits and zoom lock.

## Key Features
- Multi‑file PNG upload (local only).
- Automatic layer ordering by filename number.
- 3D scene with lighting and orbit controls.
- Per‑layer controls for visibility, depth spacing, and rotation (X/Y/Z).
- Export/share workflow planned (see `INTEGRATION_NOTES.md`).

## Current Status
- UI and scene controls are fully local and client‑side.
- Authentication, persistence, and shareable URLs are not implemented yet.
