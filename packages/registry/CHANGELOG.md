# @kinetik/registry

## 1.0.0

### Major Changes

- Kinetik UI 1.0: motion and effect components for Expo, copied into your project as source.

  **Components (24).** Backgrounds: Aurora Veil, Grain Drift, Ripple Field. Cards: Aperture Card, Deckfall, Flip Ledger, Glint Card, Tilt Deck. Interaction: Elastic Slider, Hold to Confirm, Liquid Tabs, Magnet Button, Press Jelly, Pulse Toggle. Text: Odometer, Scramble Text, Shine Text, Word Cascade. Navigation: Dock Bar, Morph Sheet, Parallax Header. Feedback: Confetti Burst, Skeleton Sweep, Toast Stack.

  **Screen templates (4).** Onboarding Flow, Paywall, Profile Hero and Player Sheet, built only from Kinetik components and tokens. They install into `components/kinetik/screens/`.

  **Design system.** Shared tokens (monochrome dark and light palettes, spacing, radius, type, shadows) and three springs and three durations. `<KinetikProvider>` brands colours, forces a scheme, forces reduced motion or turns off haptics.

  **Accessibility.** Every component has a reduced-motion version, roles and labels, and 44 pt touch targets, checked by an automated audit and on an Android accessibility tree.

  **CLI (`kinetik-ui`).** `init`, `add`, `list`, `search`, `diff`, `doctor`, `agents` and `mcp`. Dependencies are installed with `npx expo install` so native versions match your SDK. The registry is shadcn-compatible.

  **For AI agents.** An MCP server (`npx kinetik-ui mcp`) with `list_components`, `search_components`, `get_component`, `get_install_plan` and `get_tokens`; `/llms.txt` and a markdown version of every docs page; an `AGENTS.md` section and an Agent Skill for your project.

  Requires the React Native New Architecture (Reanimated 4) and Expo SDK 54 or newer.
