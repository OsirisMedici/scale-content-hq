# Scale Content HQ

Open-source, offline-first editing planner for scripts, visual references, B-roll, timeline planning, and team comments.

[![MIT License](https://img.shields.io/badge/license-MIT-limegreen.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

The goal is simple: let a content team plan the edit in one shared workspace before an editor opens the NLE. The transcript follows the playhead, media stays tagged and previewable, and the complete project remains on infrastructure you control.

## Current MVP

- Editable transcript linked to a 60-second playhead
- VO, B-roll, and graphics timeline tracks
- Tagged image and video library with previews
- Editor notes and comments
- SQLite workspace database and local file storage
- Local-network collaboration with no required cloud service

## Run locally

```bash
npm install && npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open `http://127.0.0.1:3000` on the host machine, or use the host machine's local IP from another device on the same network.

## Self-hosted storage

The application does not require a cloud database. It stores everything under `data/` by default:

- `data/scale-content-hq.sqlite3` contains the workspace, timeline, tags, notes, and comments.
- `data/uploads/` contains uploaded scripts, images, and B-roll.

Set `SCALE_CONTENT_DATA_DIR=/absolute/path` to keep the database and uploads somewhere else. Back up or move the complete data directory to preserve the workspace.

For production-style self-hosting:

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

## Join the project

Contributions are welcome from editors, developers, designers, and content operators.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and contribution guidelines.
- Pick up an [open issue](https://github.com/OsirisMedici/scale-content-hq/issues).
- Share workflows and larger ideas in [GitHub Discussions](https://github.com/OsirisMedici/scale-content-hq/discussions).
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

Useful contribution areas include timeline interactions, editing-format imports, accessibility, multi-project organization, backup tools, documentation, and translations.

## License

Scale Content HQ is available under the [MIT License](LICENSE).
