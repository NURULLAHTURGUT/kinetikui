## Requirements

- Expo SDK 54 or newer with the **New Architecture** on (the default since SDK 53). Reanimated 4 does not support the legacy architecture.
- A development build. Components that use Skia or sensors need native code that Expo Go may not include.

## Set up

```bash
npx kinetik-ui init
```

`init` checks your Expo SDK and architecture, writes `kinetik.json`, copies the shared tokens and motion presets, and installs `react-native-reanimated` and `react-native-worklets` with `expo install`. Projects with a `src/` folder get `src/components/kinetik` and `src/lib/kinetik`; others get `components/kinetik` and `lib/kinetik`.

## Add a component

```bash
npx kinetik-ui add glint-card
```

The source is copied into your project and every dependency is installed with `npx expo install`, so native versions match your SDK. Run `add` again with `--overwrite` to take an updated version, or `npx kinetik-ui diff` first to see what changed.

## Wrap the app once

Gesture-driven components need a `GestureHandlerRootView` at the root. `KinetikProvider` is optional: without it components follow the system appearance with the default tokens.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KinetikProvider } from '@/lib/kinetik/tokens/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KinetikProvider scheme="system">
        <Stack />
      </KinetikProvider>
    </GestureHandlerRootView>
  );
}
```

## Theme and brand

`KinetikProvider` takes `scheme` (`system`, `dark` or `light`) and partial `colors` to brand the palette:

```tsx
<KinetikProvider colors={{ ember: '#7C5CFF', onEmber: '#FFFFFF' }}>
```

Components read colours, spacing, radius, type and shadows from `useKinetikTheme()`; none of them hard-code a colour.

## Motion and accessibility

Every animation picks one of three springs (snappy, smooth, bouncy) and three durations from `lib/kinetik/motion/motion.ts`. When the system's reduce-motion setting is on, each component switches to a static or minimal version. Force it while designing:

```tsx
<KinetikProvider reduceMotion="always">
```

Haptics are used only where they carry meaning and can be turned off app-wide with `haptics={false}`.

## Check your setup

```bash
npx kinetik-ui doctor
```

`doctor` checks the Expo SDK, the New Architecture, your Babel config, the dependencies of installed components (through `expo install --check`) and whether your copies still match the registry.

## Working with AI agents

```bash
npx kinetik-ui agents --skill
```

`agents` adds a Kinetik section to your `AGENTS.md` (updated in place on later runs) telling coding agents how to install components and keep theming, motion presets and reduced motion intact. `--skill` also writes it as an Agent Skill in `.claude/skills/kinetik-ui/`.

Agents that support the Model Context Protocol can query the registry directly. Add this server to your agent's MCP config:

```json
{ "mcpServers": { "kinetik-ui": { "command": "npx", "args": ["-y", "kinetik-ui", "mcp"] } } }
```

It offers `list_components`, `search_components`, `get_component`, `get_install_plan` and `get_tokens`. Every docs page also has a markdown version (add `.md` to the URL, or send `Accept: text/markdown`), and [/llms.txt](/llms.txt) indexes them.
