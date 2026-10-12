# Changesets

Release notes and versions are managed with [Changesets](https://github.com/changesets/changesets).

- After a change users will notice, run `pnpm changeset` and describe it from the user's side.
- `kinetik-ui` (the CLI), `@kinetik/registry` and `@kinetik/mcp` always share one version.
- `pnpm changeset version` applies pending changesets: bumps versions and writes `CHANGELOG.md`.
- Publishing is deliberately not scripted. Nothing goes to npm until the maintainer decides; `kinetik-ui` stays `"private": true` until then.

Each component also has its own `version` in `item.json`, which `kinetik-ui diff` and `kinetik.json` use. Bump it when the component's source changes.
