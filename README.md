<p align="center">
  <a href="https://kinetik-ui.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/hero-light.jpg" />
      <img alt="Kinetik UI: motion parts for Expo" src=".github/assets/hero-dark.jpg" width="100%" />
    </picture>
  </a>
</p>

<h1 align="center">Kinetik UI</h1>

<p align="center">
  <strong>Motion parts for Expo.</strong><br />
  80 animated components and 4 screen templates for React Native, copied into your app as source.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kinetik-ui"><img alt="npm" src="https://img.shields.io/npm/v/kinetik-ui?style=flat-square&color=000" /></a>
  <img alt="Expo SDK 54+" src="https://img.shields.io/badge/Expo-SDK_54+-000?style=flat-square&logo=expo&logoColor=white" />
  <img alt="React Native New Architecture" src="https://img.shields.io/badge/React_Native-New_Architecture-000?style=flat-square&logo=react&logoColor=61DAFB" />
  <img alt="Reanimated 4" src="https://img.shields.io/badge/Reanimated-4-000?style=flat-square" />
  <img alt="Skia" src="https://img.shields.io/badge/Skia-2-000?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-000?style=flat-square&logo=typescript&logoColor=3178C6" />
  <img alt="shadcn registry" src="https://img.shields.io/badge/shadcn-registry-000?style=flat-square" />
  <img alt="MCP server" src="https://img.shields.io/badge/MCP-server-000?style=flat-square" />
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-000?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://kinetik-ui.dev"><strong>kinetik-ui.dev</strong></a> ·
  <a href="https://kinetik-ui.dev/components">Components</a> ·
  <a href="https://kinetik-ui.dev/docs/getting-started">Documentation</a> ·
  <a href="https://kinetik-ui.dev/registry">Registry</a> ·
  <a href="https://www.npmjs.com/package/kinetik-ui">npm</a>
</p>

---

> **Requires the React Native New Architecture** (Reanimated 4). The legacy architecture is not supported.

Motion and effect components for Expo and React Native, built on Reanimated, Gesture Handler and Skia. Components are copied into your project as TypeScript source (the shadcn model), so you own the code and can change anything.

```bash
npx kinetik-ui init
npx kinetik-ui add glint-card
```

`add` copies the component and the shared tokens it needs, then installs native dependencies with `npx expo install`, so their versions always match your Expo SDK.

## What you get

- **80 components and 4 screen templates**, each with a live demo, a props table and notes on when _not_ to use it.
- **Runs on the UI thread.** Gestures, springs and shaders are worklets; a busy JavaScript thread does not drop frames.
- **Accessible by default.** Every component has a reduced-motion version, screen-reader labels and roles, and 44 pt touch targets. See the [checklist](docs/accessibility.md).
- **One design language.** Colours, spacing, type, shadows and three springs come from shared tokens; nothing hard-codes a colour. Brand it with `<KinetikProvider colors={{ ember: '#7C5CFF' }}>`.
- **Agent-ready.** An MCP server (`npx kinetik-ui mcp`), `/llms.txt`, a markdown version of every docs page and an `AGENTS.md` section for your project (`npx kinetik-ui agents`).

## Components

| Category    | Component         | What it does                                                                        |
| ----------- | ----------------- | ----------------------------------------------------------------------------------- |
| Background  | Aurora Veil       | A slow, flowing aurora drawn by a fragment shader, for screen and hero backgrounds. |
|             | Grain Drift       | A drifting four-colour mesh gradient under moving film grain.                       |
|             | Ripple Field      | A dot grid that ripples outward from every touch.                                   |
| Card        | Aperture Card     | A card closed by a camera-like iris whose blades turn open to reveal the content.   |
|             | Compare Slider    | Two versions of a picture with a divider you drag across.                           |
|             | Deckfall          | A stack of cards swiped away one at a time, the cards behind rising into place.     |
|             | Drift Marquee     | An endless row that drifts on its own, can be flung, and leans into the speed.      |
|             | Expand Card       | A row that opens into a card, its thumbnail growing into a wide picture.            |
|             | Fan Stack         | A loose pile of pictures that fans out like a hand of cards.                        |
|             | Flip Ledger       | A two-sided card that turns over in 3D, sized to the taller face.                   |
|             | Fold Panel        | A panel that unfolds in place, its body springing to its height.                    |
|             | Glint Card        | A card with a specular glint that follows the finger or the tilt of the phone.      |
|             | Parallax Carousel | A paging carousel whose pictures drift inside their cards.                          |
|             | Scroll Stack      | Cards that pin to the top and pile up as you scroll.                                |
|             | Story Card        | Full-bleed stories with progress bars: tap to step, hold to pause.                  |
|             | Tilt Deck         | A card that tilts in 3D under the finger, with parallax layers.                     |
| Interaction | Beam Button       | A button with a beam of light running around its edge.                              |
|             | Bloom Menu        | A floating button whose actions spring out one after another.                       |
|             | Copy Chip         | A copy button whose two pages fold into a check.                                    |
|             | Elastic Slider    | A slider that stretches like rubber past its ends and springs back.                 |
|             | Expand Toolbar    | Icon buttons where the picked one grows to show its name.                           |
|             | Hold to Confirm   | Press and hold: a ring fills and turns into a check mark.                           |
|             | Like Burst        | A heart that pops with a ring and sparks while the count rolls.                     |
|             | Liquid Tabs       | A tab bar whose indicator flows like liquid between tabs.                           |
|             | Magnet Button     | A button that leans toward the finger before it is touched.                         |
|             | Morph Icon        | An icon whose glyph reshapes: menu to close, play to pause.                         |
|             | Press Jelly       | A primary button that squashes like jelly and wobbles back.                         |
|             | Pulse Toggle      | A switch whose thumb stretches mid-flight and pulses when it turns on.              |
|             | Slide to Confirm  | Drag the knob across to confirm; it lands as a check.                               |
|             | Split Button      | A primary action with alternatives behind a chevron.                                |
|             | Status Button     | Folds into a spinner while it works, then opens with a check or shakes.             |
|             | Swipe Row         | A list row with actions behind it; a long swipe runs the edge one.                  |
|             | Two-Step Button   | Splits into Cancel and Confirm before a destructive action.                         |
| Inputs      | Choice Cards      | Option cards with one selection ring that glides between them.                      |
|             | Code Field        | A one-time-code field: digits pop in, wrong codes shake.                            |
|             | Filter Chips      | Chips that grow a check and turn to a tint when picked.                             |
|             | Ink Check         | A checkbox whose tick is inked in one stroke.                                       |
|             | Password Meter    | A new-password field with a meter and rules that tick off.                          |
|             | Plan Toggle       | A billing-period toggle with a popping badge and rolling price.                     |
|             | Range Slider      | A two-ended slider over an optional histogram.                                      |
|             | Roll Stepper      | A number stepper whose figure rolls and speeds up while held.                       |
|             | Search Morph      | A search button that stretches into a search field.                                 |
|             | Star Rating       | Stars you tap or drag across, swelling as they fill.                                |
| Disclosure  | Lift Menu         | Hold to lift the content above a dimmed screen with its actions.                    |
|             | Pop Menu          | A menu that unfolds from its trigger, rows sliding in.                              |
|             | Read More         | Long text folded to a few lines that fade, let out on a spring.                     |
|             | Tip Bubble        | A short tip that grows out of its anchor and closes by itself.                      |
| Text        | Letter Morph      | A label that morphs letter by letter: Save to Saved.                                |
|             | Marker Highlight  | Key phrases marked as if with a highlighter, one after another.                     |
|             | Odometer          | Digits that roll like a mechanical counter.                                         |
|             | Scramble Text     | Characters cycle through glyphs and lock in from left to right.                     |
|             | Shine Text        | A band of light sweeping across a line of text.                                     |
|             | Typewriter        | Text typed out with a human rhythm, phrase after phrase.                            |
|             | Word Cascade      | A paragraph that arrives word by word.                                              |
|             | Word Rotator      | One word in a line that rolls to the next, letter by letter.                        |
| Navigation  | Dock Bar          | A floating bottom bar whose items swell under the finger.                           |
|             | Morph Sheet       | A bottom sheet with snap points that blurs the screen behind it.                    |
|             | Page Dots         | Page dots that follow the scroll as a worm or a pill.                               |
|             | Parallax Header   | A header that scrolls at half speed and hands off to a compact bar.                 |
| Feedback    | Confetti Burst    | Confetti drawn in a single Skia draw call, physics on the UI thread.                |
|             | Dot Loader        | Dots that hop, breathe or sit in a typing bubble.                                   |
|             | Empty State       | Three cards fan out above the next step on an empty screen.                         |
|             | Notice Bar        | An announcement bar whose messages take turns rolling in.                           |
|             | Ring Spinner      | An arc that stretches as it turns and closes into a check.                          |
|             | Skeleton Sweep    | Loading placeholders with one light band across the whole layout.                   |
|             | Step Tracker      | Progress through steps: the line fills and steps take a check.                      |
|             | Toast Stack       | Notifications that stack like cards, fan out and swipe away.                        |
| Data        | Activity Rings    | Concentric progress rings that wind up; past the goal they lap.                     |
|             | Bar Chart         | Bars that spring up in a wave and light up under the finger.                        |
|             | Donut Chart       | A ring of rounded slices that sweeps in; tap one to bring it forward.               |
|             | Gauge Meter       | A dial that swings to its value while the figure counts up.                         |
|             | Heat Grid         | Days shaded by activity, popping in as a wave; drag to read.                        |
|             | Line Chart        | A smooth line that draws itself in, with a scrubbing guide and label.               |
|             | Radar Chart       | Shapes that grow from the centre and morph to new values.                           |
|             | Slope Chart       | Before and after on two axes, rises in blue.                                        |
|             | Stat Card         | A figure that counts up, with a change pill and a sparkline.                        |
|             | Timeline          | Events along a rail that pop in and draw down in turn.                              |
|             | Treemap           | Nested, near-square tiles; tap a group to zoom into it.                             |
|             | Usage Meter       | What fills an allowance, segment by segment.                                        |
|             | Waffle Chart      | A ten-by-ten grid where each cell is one percent.                                   |
| Screens     | Onboarding Flow   | A paged welcome flow over an aurora with cascading titles.                          |
|             | Paywall           | Plans with rolling prices and confetti on purchase.                                 |
|             | Player Sheet      | A music library whose mini player opens into a full player.                         |
|             | Profile Hero      | A profile with a parallax cover, a rolling follower count and liquid tabs.          |

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
