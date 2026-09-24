# Repair instructions

This bundle contains the complete source tree after the visual/dictionary update. It is intended to restore files that may have been removed when a partial patch was copied with Finder's Replace behavior.

## Safe merge on macOS

1. Stop `npm run dev` with Ctrl+C.
2. Keep Docker/PostgreSQL running; this repair does not touch the Docker volume or database rows.
3. Extract this bundle somewhere separate from your existing project.
4. Merge it into the existing project with `ditto` (do not use Finder Replace):

```bash
ditto "/path/to/extracted/wordhunt_repair_bundle" "$HOME/Downloads/wordhunt_local_ready-2"
```

5. From the existing project:

```bash
cd "$HOME/Downloads/wordhunt_local_ready-2"
npm install
npm run words:setup
npm run dev
```

6. Verify:

- http://localhost:3001/health
- http://localhost:3000

`ditto` merges folders and leaves extra files (including a previously generated full dictionary) in place.
