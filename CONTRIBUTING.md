# Contributing to Kinetik UI

Thanks for helping. This file covers setup and the workflow for adding or changing a component. Read the [rules](#rules) first; every change must follow them.

## Setup

```bash
pnpm install        # pnpm 12, Node 20.19+
pnpm build:registry # regenerate public/r, registry.json and the demo index
pnpm verify         # what CI runs: registry freshness, format, lint, typecheck, tests, integrity
```

Run the playground on a device or emulator (it needs a development build, not Expo Go):

```bash
cd apps/playground
npx expo run:android   # or run:ios on macOS
```

Run the docs site:

```bash
pnpm --filter @kinetik/docs dev   # http://localhost:3100
```

## Rules

### Source of truth

- Components live in `packages/registry/items/<name>/`: `<name>.tsx`, `<name>.test.tsx`, `demo.tsx`, `item.json`, `docs.mdx`. All five are required.
- Shared code lives in `packages/registry/shared/` and is published through the items in `shared/items.json`.
- `public/r/`, `registry.json` and `packages/registry/demos.generated.ts` are generated. Run `pnpm build:registry`; never edit them by hand.

### Components

- Import only from `shared/` and the component's own folder, with relative paths. Another component is a `registryDependencies` entry, not an import.
- Every package a file imports must be listed in `item.json` `dependencies` (except `react` and `react-native`). The build fails otherwise.
- No literal colours. Read colours, spacing, radius, type and shadows from `useKinetikTheme()`.
- Pick motion from `shared/motion/motion.ts` (`spring('snappy' | 'smooth' | 'bouncy', reduced)`, `timing(...)`). Never invent spring constants.
- Call `useReduceMotion()` and give reduced-motion users a static or minimal version.
- Per-frame work runs as worklets on the UI thread. No `setState` per frame; Skia props are fed from shared values.
- Use `sharedValue.get()` / `.set()` rather than `.value` (React Compiler compatible).
- Haptics only where they carry meaning, through `useHaptic()`.
- Touch targets are at least 44 pt. Interactive parts expose an accessibility role, label and state.
- Write every effect from scratch. Do not copy code, names, copy text or visuals from other libraries.

## Adding a component

1. Create `packages/registry/items/<name>/` with five files:
   - `<name>.tsx`: the component. Exported props are documented with JSDoc; the docs site reads the types.
   - `<name>.test.tsx`: behaviour tests (React Native Testing Library). Cover the reduced-motion path.
   - `demo.tsx`: the playground and docs demo. Export `controls = defineControls({...})` and a default component.
   - `item.json`: metadata, dependencies, `registryDependencies`, perf budget and accessibility notes.
   - `docs.mdx`: `## Usage`, `## When to use`, `## When not to use`, `## Notes`.
2. Add native dependencies with `npx expo install <pkg>` inside `apps/playground`, then mirror the version in `packages/registry/package.json`.
3. Run `pnpm build:registry` and `pnpm verify`. The registry build rejects undeclared imports and unused dependencies; the integrity test enforces the folder contract, the colour rule, reduced motion and gesture roots.
4. Check it on a device (see below). Jest cannot catch native crashes, Fabric view flattening or rendering bugs, and most bugs this project has found were device-only.
5. Add the component to the table in `README.md` (a test checks it) and add a changeset (`pnpm changeset`).

Screen templates live in `packages/registry/templates/<name>/` with the same five files and `"category": "screen"`. They may import components (declare them in `registryDependencies`) and install into `components/kinetik/screens/`.

## Quality gates

A change is ready when:

- `pnpm verify` passes with zero lint warnings.
- The demo works on Android (emulator is fine), including with reduced motion on (the playground's Motion chip, or the system setting).
- Interactive parts have a role, a label and a target of at least 44 pt. The accessibility audit (`packages/registry/a11y/a11y.test.tsx`) runs in `pnpm verify`; the device audit is `python scripts/a11y/device-audit.py` with the playground running.
- Per-frame work runs on the UI thread, and the component draws nothing at rest unless animating is its purpose. Measure with `scripts/perf/measure-android.sh` on a release build; record results with `scripts/perf/record.ts`.
- Anything you could not verify (iOS, a real device, 120 Hz) is noted in the pull request.

## Testing the CLI against your local registry

```bash
pnpm --filter "kinetik-ui..." build   # the CLI and the MCP package it uses
node packages/cli/dist/index.js add glint-card --registry ./public/r --cwd ../my-expo-app
```

## Commits and pull requests

- Keep commits focused; describe what changed and why.
- Generated files (`public/r`, `registry.json`, `packages/registry/demos.generated.ts`) are committed: rebuild them in the same commit as the source change.
- Never copy code, names, copy text or visuals from other libraries. Every effect here is original.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).
