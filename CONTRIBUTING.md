# Contributing to Scale Content HQ

Thanks for helping build a faster, open editing-planning workflow. Contributions of code, design, documentation, testing, and product feedback are welcome.

## Before you start

- Check the [issues](https://github.com/OsirisMedici/scale-content-hq/issues) for existing work.
- Use [Discussions](https://github.com/OsirisMedici/scale-content-hq/discussions) for broad ideas or questions.
- For a larger change, open an issue first so the direction can be agreed before significant work begins.

## Local setup

```bash
git clone git@github.com:OsirisMedici/scale-content-hq.git && cd scale-content-hq && npm install && npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open `http://127.0.0.1:3000`.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Keep the change scoped to one problem or feature.
3. Do not commit `data/`, uploaded media, credentials, or personal project content.
4. Run `npm run lint` and `npm run build`.
5. Open a pull request using the repository template.

## Product principles

- Keep the application offline-first and self-hostable.
- Preserve the transcript, timeline, and tagged-media workspace as the primary experience.
- Prefer quiet, practical editing controls over marketing surfaces.
- Keep data portable: SQLite and local files must remain easy to back up.
- Add focused tests or verification notes when behavior changes.

## Good first contributions

- Timeline keyboard controls and accessibility improvements
- Drag-and-drop polish and clip resizing
- Import support for SRT, VTT, and common editing formats
- Multi-project workspace organization
- Automated database backups and restore tools
- Documentation, translations, and deployment recipes

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
