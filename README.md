# Scale Content HQ

Offline-first editing planner for scripts, visual references, B-roll, timeline planning, and team comments.

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
