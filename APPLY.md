# Apply TypeScript module-resolution fix

From the project root, either copy `apps/server/tsconfig.json` from this patch into the same path in your project, or on macOS run:

```bash
ditto ~/Downloads/wordhunt_tsconfig_fix ~/Downloads/wordhunt_local_ready-2
cd ~/Downloads/wordhunt_local_ready-2
npm run typecheck
```

Docker/PostgreSQL does not need to be running for `npm run typecheck`.
