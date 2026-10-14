# Third-party notices

Kinetik UI is MIT licensed (see [LICENSE](LICENSE)). Every component, shader and effect was written for this project. The only third-party material inside components is a handful of MIT-licensed icon paths, listed under [Icon paths](#icon-paths).

Kinetik code **depends on** the packages below. They are not copied into your app by the CLI. You install them yourself (`npx expo install`), and they arrive under their own licenses.

## Runtime dependencies of copied components

These are installed into your app when you add a component that uses them.

| Package                                                                                                                                    | License | Used by                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------ |
| [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated)                                                     | MIT     | Every animated component                                                             |
| [react-native-worklets](https://github.com/software-mansion/react-native-reanimated)                                                       | MIT     | Peer of Reanimated 4                                                                 |
| [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler)                                           | MIT     | Gesture-driven components                                                            |
| [@shopify/react-native-skia](https://github.com/Shopify/react-native-skia)                                                                 | MIT     | Shaders, Glint Card, Aperture Card, Liquid Tabs, Shine Text, Confetti Burst          |
| [react-native-svg](https://github.com/software-mansion/react-native-svg)                                                                   | MIT     | Small icons in Boarding Pass, Peek Folder, Now Playing, Vinyl Player and Agenda Card |
| [react-native-svg](https://github.com/software-mansion/react-native-svg)                                                                   | MIT     | Small icons in Boarding Pass, Peek Folder, Now Playing, Vinyl Player and Agenda Card |
| [expo-haptics](https://github.com/expo/expo/tree/main/packages/expo-haptics)                                                               | MIT     | `useHaptic`                                                                          |
| [expo-blur](https://github.com/expo/expo/tree/main/packages/expo-blur)                                                                     | MIT     | Morph Sheet, Book Pocket                                                             |
| [react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context)                                             | MIT     | Toast Stack, Parallax Header, screen templates                                       |
| [react](https://github.com/facebook/react), [react-native](https://github.com/facebook/react-native), [expo](https://github.com/expo/expo) | MIT     | Platform                                                                             |

## Icon paths

A few components draw small icons from [Tabler Icons](https://github.com/tabler/tabler-icons) (MIT, Copyright (c) 2020-2024 Paweł Kuna), found through [iconstack.io](https://iconstack.io). The SVG path data is embedded in the component source with a comment that names Tabler:

| Component     | Icons                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Flight Track  | plane                                                                             |
| Seat Picker   | armchair                                                                          |
| Boarding Pass | plane                                                                             |
| Peek Folder   | arrow-up-right                                                                    |
| Now Playing   | player-play, player-pause, player-track-prev, player-track-next                   |
| Vinyl Player  | player-play, player-pause, player-track-prev, player-track-next, volume, volume-3 |
| Agenda Card   | plus                                                                              |

## CLI and MCP server (`kinetik-ui`)

| Package                                                                             | License |
| ----------------------------------------------------------------------------------- | ------- |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) | MIT     |
| [zod](https://github.com/colinhacks/zod)                                            | MIT     |

## Docs site and playground (not shipped to users' apps)

| Package                                                                                                                                                               | License      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| [next](https://github.com/vercel/next.js)                                                                                                                             | MIT          |
| [react-native-web](https://github.com/necolas/react-native-web)                                                                                                       | MIT          |
| [canvaskit-wasm](https://github.com/google/skia/tree/main/modules/canvaskit) (served as `canvaskit.wasm`)                                                             | BSD-3-Clause |
| [shiki](https://github.com/shikijs/shiki)                                                                                                                             | MIT          |
| [Tabler Icons](https://github.com/tabler/tabler-icons) (SVG paths embedded in `apps/docs/components/icons.tsx` and the demos' `packages/registry/demo-kit/icons.tsx`) | MIT          |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) (draws the demo icons)                                                                       | MIT          |
| [Geist and Geist Mono](https://github.com/vercel/geist-font) (via `@fontsource-variable`), served as web fonts                                                        | OFL-1.1      |
| [marked](https://github.com/markedjs/marked)                                                                                                                          | MIT          |
| [expo-router](https://github.com/expo/expo/tree/main/packages/expo-router)                                                                                            | MIT          |

The CanvasKit BSD-3-Clause license requires its copyright notice to accompany redistributed binaries. The docs site serves the unmodified `canvaskit.wasm` together with its license at `/canvaskit-LICENSE.txt` (copied by `scripts/build-docs.ts`) and credits it in the site footer. The CDN copy at `cdn.kinetik-ui.dev` sits next to its `LICENSE` (copied by `scripts/build-cdn.ts`).

Versions are pinned by the Expo SDK through `npx expo install`. Run `pnpm licenses list` for the complete transitive list.

## Demo images (docs site and playground)

The landscape photos in the demos (`apps/docs/public/photos`, 500 px wide) are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license): free to use, no permission needed. Credit is not required, but here it is. They are used only by the demos and are never copied into your app.

| File                | Demo name     | Photographer                   | Source                                                                     |
| ------------------- | ------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `still-water.jpg`   | Still Water   | thugbong                       | [unsplash.com/photos/d11u-qXfsF8](https://unsplash.com/photos/d11u-qXfsF8) |
| `cloud-forest.jpg`  | Cloud Forest  | Hiep Tong                      | [unsplash.com/photos/TN5MFeu0JSQ](https://unsplash.com/photos/TN5MFeu0JSQ) |
| `last-light.jpg`    | Last Light    | Artem Bryzgalov                | [unsplash.com/photos/phmgfNIITL8](https://unsplash.com/photos/phmgfNIITL8) |
| `white-sands.jpg`   | White Sands   | John Fowler                    | [unsplash.com/photos/RsRTIofe0HE](https://unsplash.com/photos/RsRTIofe0HE) |
| `morning-haze.jpg`  | Morning Haze  | abednego s g                   | [unsplash.com/photos/h7FysA92Jww](https://unsplash.com/photos/h7FysA92Jww) |
| `lone-palm.jpg`     | Lone Palm     | Faisal Sultan                  | [unsplash.com/photos/2FshIx29IIs](https://unsplash.com/photos/2FshIx29IIs) |
| `night-peak.jpg`    | Night Peak    | Aleks Dahlberg                 | [unsplash.com/photos/4j78jV5bd2M](https://unsplash.com/photos/4j78jV5bd2M) |
| `huacachina.jpg`    | Huacachina    | Willian Justen de Vasconcellos | [unsplash.com/photos/jOF2TFSNxQI](https://unsplash.com/photos/jOF2TFSNxQI) |
| `pastel-tide.jpg`   | Pastel Tide   | Harli Marten                   | [unsplash.com/photos/n7a2OJDSZns](https://unsplash.com/photos/n7a2OJDSZns) |
| `mist-lake.jpg`     | Mist Lake     | Kalen Emsley                   | [unsplash.com/photos/_LuLiJc1cdo](https://unsplash.com/photos/_LuLiJc1cdo) |
| `highland-lake.jpg` | Highland Lake | Fahrul Razi                    | [unsplash.com/photos/A6XkWCQssrs](https://unsplash.com/photos/A6XkWCQssrs) |
| `snow-ridge.jpg`    | Snow Ridge    | shelby monnette                | [unsplash.com/photos/tfF3T9hQot8](https://unsplash.com/photos/tfF3T9hQot8) |
| `blue-hour.jpg`     | Blue Hour     | Nidheesh Kavalan               | [unsplash.com/photos/Ha501MB_XE8](https://unsplash.com/photos/Ha501MB_XE8) |
