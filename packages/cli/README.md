# kinetik-ui

The CLI for [Kinetik UI](https://kinetik-ui.dev): motion and effect components for Expo, built on Reanimated 4, Gesture Handler and Skia.

> Requires the React Native **New Architecture**. Expo SDK 54 or newer.

```bash
npx kinetik-ui init
npx kinetik-ui add glint-card deckfall
```

Components are copied into your project as TypeScript source, so you own them. Dependencies are installed with `npx expo install`, so native versions match your Expo SDK.

## Commands

| Command            | What it does                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| `init`             | Writes `kinetik.json`, copies tokens and motion presets, installs Reanimated   |
| `add <name...>`    | Copies components and the shared code they need, then runs `expo install`      |
| `list`             | Every component and screen template (`●` marks installed ones)                 |
| `search <query>`   | Find components by name, category or description                               |
| `diff [name...]`   | How your copies differ from the registry                                       |
| `doctor`           | Checks the Expo SDK, New Architecture, Babel config, dependencies and files    |
| `agents [--skill]` | Adds Kinetik guidance for AI coding agents to `AGENTS.md` (and an Agent Skill) |
| `mcp`              | Serves the registry to AI agents over the Model Context Protocol (stdio)       |

Options: `--registry <url|dir>`, `--overwrite`, `--dry-run`, `--skip-install`, `--components-dir`, `--lib-dir`, `--json`, `--cwd`. Run `npx kinetik-ui --help` for details.

## Use with AI agents

Add the MCP server to your agent's configuration:

```json
{ "mcpServers": { "kinetik-ui": { "command": "npx", "args": ["-y", "kinetik-ui", "mcp"] } } }
```

Tools: `list_components`, `search_components`, `get_component`, `get_install_plan`, `get_tokens`.

## License

MIT
