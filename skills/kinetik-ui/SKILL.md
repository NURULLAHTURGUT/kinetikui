---
name: kinetik-ui
description: Add or edit Kinetik UI motion components (animated cards, buttons, sliders, text effects, shader backgrounds, sheets, toasts) in an Expo / React Native app. Use when the user wants animation, gestures, haptics or Skia effects, or touches files in components/kinetik/.
---

# Kinetik UI

Kinetik components are TypeScript source copied into this project, not a package. They live in `components/kinetik/`; shared tokens, motion presets and hooks live in `lib/kinetik/`. `kinetik.json` records what is installed.

## Adding components

- Find one: `npx kinetik-ui search <words>` or `npx kinetik-ui list`. Docs for any component: `https://kinetik-ui.dev/components/<name>.md`.
- Install with `npx kinetik-ui add <name>`. It copies the files and runs `npx expo install` for dependencies so native versions match the Expo SDK. Do not copy files by hand or `npm install` Reanimated, Gesture Handler or Skia directly.
- Before changing a copied component, run `npx kinetik-ui diff <name>` to see local edits; `add <name> --overwrite` replaces them with the registry version.
- `npx kinetik-ui doctor` checks the SDK, New Architecture, dependencies and files.

## Using them

- Gesture-driven components need the app root wrapped in `<GestureHandlerRootView style={{ flex: 1 }}>`.
- Take colours, spacing, radius and type from `useKinetikTheme()`; never hard-code colours in or around Kinetik components. `<KinetikProvider>` sets the scheme, brand colours and haptics.
- Animate with the presets in `lib/kinetik/motion/motion.ts` (`spring('snappy' | 'smooth' | 'bouncy', reduced)`, `timing('quick' | 'base' | 'slow', reduced)`) instead of ad-hoc springs.
- Keep reduced-motion support: every component reads `useReduceMotion()` and has a still or cross-fade fallback. Do not remove it when editing.
- Give interactive components an `accessibilityLabel`; keep touch targets at least 44 pt.
- Read shared values with `.get()` / `.set()` and keep `collapsable={false}` on views that `GestureDetector` wraps (Fabric flattens them otherwise).
- One expressive component per screen is plenty; motion should explain a change, not decorate.

## MCP

Agents that speak the Model Context Protocol can use `npx -y kinetik-ui mcp` (tools: list_components, search_components, get_component, get_install_plan, get_tokens).
