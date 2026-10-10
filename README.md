# Kinetik UI

> **Requires the React Native New Architecture** (Reanimated 4). The legacy architecture is not supported.
>
> **Status: pre-release.** The CLI is not on npm yet and the docs domain is not live. Until then, run the CLI from this repository with `--registry ./public/r` (see [Contributing](CONTRIBUTING.md)).

Motion and effect components for Expo and React Native, built on Reanimated, Gesture Handler and Skia. Components are copied into your project as TypeScript source (the shadcn model), so you own the code and can change anything.

```bash
npx kinetik-ui init
npx kinetik-ui add glint-card
```

`add` copies the component and the shared tokens it needs, then installs native dependencies with `npx expo install`, so their versions always match your Expo SDK.

## What you get

- **24 components and 4 screen templates**, each with a live demo, a props table and notes on when _not_ to use it.
- **Runs on the UI thread.** Gestures, springs and shaders are worklets; a busy JavaScript thread does not drop frames.
- **Accessible by default.** Every component has a reduced-motion version, screen-reader labels and roles, and 44 pt touch targets. See the [checklist](docs/accessibility.md).
- **One design language.** Colours, spacing, type, shadows and three springs come from shared tokens; nothing hard-codes a colour. Brand it with `<KinetikProvider colors={{ ember: '#7C5CFF' }}>`.
- **Agent-ready.** An MCP server (`npx kinetik-ui mcp`), `/llms.txt`, a markdown version of every docs page and an `AGENTS.md` section for your project (`npx kinetik-ui agents`).

## Components

| Category    | Component       | What it does                                                                        |
| ----------- | --------------- | ----------------------------------------------------------------------------------- |
| Background  | Aurora Veil     | A slow, flowing aurora drawn by a fragment shader, for screen and hero backgrounds. |
|             | Grain Drift     | A drifting four-colour mesh gradient under moving film grain.                       |
|             | Ripple Field    | A dot grid that ripples outward from every touch.                                   |
| Card        | Aperture Card   | A card closed by a camera-like iris whose blades turn open to reveal the content.   |
|             | Deckfall        | A stack of cards swiped away one at a time, the cards behind rising into place.     |
|             | Flip Ledger     | A two-sided card that turns over in 3D, sized to the taller face.                   |
|             | Glint Card      | A card with a specular glint that follows the finger or the tilt of the phone.      |
|             | Tilt Deck       | A card that tilts in 3D under the finger, with parallax layers.                     |
| Interaction | Elastic Slider  | A slider that stretches like rubber past its ends and springs back.                 |
|             | Hold to Confirm | Press and hold: a ring fills and turns into a check mark.                           |
|             | Liquid Tabs     | A tab bar whose indicator flows like liquid between tabs.                           |
|             | Magnet Button   | A button that leans toward the finger before it is touched.                         |
|             | Press Jelly     | A primary button that squashes like jelly and wobbles back.                         |
|             | Pulse Toggle    | A switch whose thumb stretches mid-flight and pulses when it turns on.              |
| Text        | Odometer        | Digits that roll like a mechanical counter.                                         |
|             | Scramble Text   | Characters cycle through glyphs and lock in from left to right.                     |
|             | Shine Text      | A band of light sweeping across a line of text.                                     |
|             | Word Cascade    | A paragraph that arrives word by word.                                              |
| Navigation  | Dock Bar        | A floating bottom bar whose items swell under the finger.                           |
|             | Morph Sheet     | A bottom sheet with snap points that blurs the screen behind it.                    |
|             | Parallax Header | A header that scrolls at half speed and hands off to a compact bar.                 |
| Feedback    | Confetti Burst  | Confetti drawn in a single Skia draw call, physics on the UI thread.                |
|             | Skeleton Sweep  | Loading placeholders with one light band across the whole layout.                   |
|             | Toast Stack     | Notifications that stack like cards, fan out and swipe away.                        |
| Screens     | Onboarding Flow | A paged welcome flow over an aurora with cascading titles.                          |
|             | Paywall         | Plans with rolling prices and confetti on purchase.                                 |
|             | Player Sheet    | A music library whose mini player opens into a full player.                         |
|             | Profile Hero    | A profile with a parallax cover, a rolling follower count and liquid tabs.          |

Screen templates install into `components/kinetik/screens/` and bring the components they use.

## Requirements

- Expo SDK 54 or newer with the New Architecture on (the default since SDK 53). Developed and tested on SDK 57.
- A [development build](https://docs.expo.dev/develop/development-builds/introduction/). Skia and sensors need native code.
- Wrap your app in `<GestureHandlerRootView style={{ flex: 1 }}>` for gesture-driven components.

## CLI

| Command                  | What it does                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| `init`                   | Writes `kinetik.json`, copies tokens and motion presets, installs Reanimated |
| `add <name...>`          | Copies components (and their dependencies) and runs `expo install`           |
| `list`, `search <query>` | Browse the registry (`--json` for scripts)                                   |
| `diff [name...]`         | Show how your copies differ from the registry                                |
| `doctor`                 | Check the SDK, New Architecture, Babel config, dependencies and files        |
| `agents [--skill]`       | Add Kinetik guidance for AI agents to `AGENTS.md` (and an Agent Skill)       |
| `mcp`                    | Serve the registry to AI agents over the Model Context Protocol              |

The registry is also shadcn-compatible: `npx shadcn@latest add <registry>/r/glint-card.json` copies the files, but installs dependencies with npm rather than `expo install`, so prefer the Kinetik CLI.

## Repository

| Path                | What                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/registry` | Source of truth: components, screen templates, tests, demos, docs, tokens, motion presets, hooks      |
| `packages/cli`      | The `kinetik-ui` CLI                                                                                  |
| `packages/mcp`      | MCP server used by `kinetik-ui mcp`                                                                   |
| `apps/playground`   | Expo app running every component and screen on a device                                               |
| `apps/docs`         | Docs site (Next.js + react-native-web): live previews, `/llms.txt`, markdown endpoints, `/r` registry |
| `scripts/`          | Registry and docs builds, perf and accessibility audits                                               |
| `tests/`            | Registry integrity tests                                                                              |

```bash
pnpm install
pnpm build:registry   # regenerate the published registry files
pnpm verify           # registry freshness, format, lint, typecheck, tests, integrity
```

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Dependencies keep their own licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
