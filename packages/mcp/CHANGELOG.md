# @kinetik/mcp

## 1.4.2

### Patch Changes

- The MCP server is listed in the official MCP Registry as `io.github.NURULLAHTURGUT/kinetik-ui`, so MCP clients and directories can find it. Nothing changes in how it runs: `npx kinetik-ui mcp`.

## 1.4.1

### Patch Changes

- Now Playing and Vinyl Player can follow a real audio engine. Pass `playing`, `position` and `trackId` from your player and they stop keeping their own clock; `onSeek` reports the seconds to jump to when the bar is tapped, stepped or Previous restarts the track. Without these props they work as before.

## 1.4.0

### Minor Changes

- 25 new components.

  **Card.** Boarding Pass, Book Pocket, Now Playing, Question Deck, Streak Card, Vinyl Player, Wallet Stack.

  **Inputs.** Aspect Picker, Gradient Slider, Intensity Slider, Palette Strip, Plan Picker, Rotation Ruler, Seat Picker, Segment Bar, Step Slider, Topic Picker.

  **Data.** Agenda Card, Credit Score, Expense Card, Flight Track, Score Matrix, Vital Arcs. **Feedback.** Scan Progress. **Interaction.** Peek Folder.

  Boarding Pass, Peek Folder, Now Playing, Vinyl Player and Agenda Card draw their small icons with `react-native-svg`, installed with them through `npx expo install`.

## 1.3.0

### Minor Changes

- **Five new screen templates.** Onboarding, Paywall, Login, Auth and Profile replace the earlier screens: simpler layouts with animated illustrations, a self-advancing feature carousel with swipeable plan cards, email and password sign-in, passwordless sign-in with a one-time code, and a profile with grouped settings. They install into `components/kinetik/screens/`.

  **Removed:** the Onboarding Flow, Player Sheet and Profile Hero templates, and the old Paywall layout (`paywall` now installs the new design).

## 1.2.0

### Minor Changes

- 31 new components and a new Overlays category.

  **Inputs.** Float Field, Glide Radio, Grow Area, Inline Edit, Money Field, Month Calendar, Morph Select, Reveal Field, Signature Pad, Swatch Picker, Tag Field, Time Wheel.

  **Overlays.** Action Sheet, Pop Dialog, Side Drawer.

  **Disclosure.** Fade Scroll, Split Pane, Tree View. **Navigation.** Pager, Scroll Tabs. **Feedback.** Count Badge, Countdown, Progress Bar. **Data.** Avatar Stack, Brush Chart, Chat Thread, Ridgeline, Sort Table, Stream Graph. **Interaction.** Theme Switch. **Text.** Slot Text.

## 1.1.0

### Minor Changes

- 31 new components and two new categories.

  **Inputs.** Choice Cards, Code Field, Filter Chips, Ink Check, Password Meter, Plan Toggle, Range Slider, Roll Stepper, Search Morph, Star Rating.

  **Disclosure.** Lift Menu, Pop Menu, Read More, Tip Bubble.

  **Interaction.** Copy Chip, Expand Toolbar, Split Button, Swipe Row. **Feedback.** Dot Loader, Empty State, Notice Bar, Ring Spinner, Step Tracker. **Data.** Slope Chart, Timeline, Treemap, Usage Meter, Waffle Chart. **Navigation.** Page Dots. **Text.** Letter Morph. **Card.** Compare Slider.

## 1.0.0

### Major Changes

- Kinetik UI 1.0: motion and effect components for Expo, copied into your project as source.

  **Components (49).** Backgrounds: Aurora Veil, Grain Drift, Ripple Field. Cards: Aperture Card, Deckfall, Drift Marquee, Expand Card, Fan Stack, Flip Ledger, Fold Panel, Glint Card, Parallax Carousel, Scroll Stack, Story Card, Tilt Deck. Interaction: Beam Button, Bloom Menu, Elastic Slider, Hold to Confirm, Like Burst, Liquid Tabs, Magnet Button, Morph Icon, Press Jelly, Pulse Toggle, Slide to Confirm, Status Button, Two-Step Button. Text: Marker Highlight, Odometer, Scramble Text, Shine Text, Typewriter, Word Cascade, Word Rotator. Navigation: Dock Bar, Morph Sheet, Parallax Header. Feedback: Confetti Burst, Skeleton Sweep, Toast Stack. Data: Activity Rings, Bar Chart, Donut Chart, Gauge Meter, Heat Grid, Line Chart, Radar Chart, Stat Card.

  **Screen templates (4).** Onboarding Flow, Paywall, Profile Hero and Player Sheet, built only from Kinetik components and tokens. They install into `components/kinetik/screens/`.

  **Design system.** Shared tokens (monochrome dark and light palettes, spacing, radius, type, shadows) and three springs and three durations. `<KinetikProvider>` brands colours, forces a scheme, forces reduced motion or turns off haptics.

  **Accessibility.** Every component has a reduced-motion version, roles and labels, and 44 pt touch targets, checked by an automated audit and on an Android accessibility tree.

  **CLI (`kinetik-ui`).** `init`, `add`, `list`, `search`, `diff`, `doctor`, `agents` and `mcp`. Dependencies are installed with `npx expo install` so native versions match your SDK. The registry is shadcn-compatible.

  **For AI agents.** An MCP server (`npx kinetik-ui mcp`) with `list_components`, `search_components`, `get_component`, `get_install_plan` and `get_tokens`; `/llms.txt` and a markdown version of every docs page; an `AGENTS.md` section and an Agent Skill for your project.

  Requires the React Native New Architecture (Reanimated 4) and Expo SDK 54 or newer.
