# Security policy

## Supported versions

Security fixes go into the latest release of the `kinetik-ui` CLI and the registry served from [kinetik-ui.dev](https://kinetik-ui.dev). Components are copied into your project as source, so after a fix, update your copies with `npx kinetik-ui diff` and `npx kinetik-ui add <name> --overwrite`.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it and what an attacker could do with it.

You can expect an acknowledgement within 3 working days and a plan or a fix within 14 days. Once a fix is released, the advisory is published with credit to you, unless you prefer to stay anonymous.

## Scope

In scope:

- The `kinetik-ui` CLI and its MCP server (`packages/cli`, `packages/mcp`).
- The registry and docs site at kinetik-ui.dev (`public/r`, `apps/docs`).
- Component source in `packages/registry`.

Out of scope: vulnerabilities in dependencies that are already reported upstream (Expo, React Native, Reanimated, Skia and others), and the playground app, which is a development tool.

## How the CLI protects your project

The CLI treats every registry, including a custom `--registry`, as untrusted input:

- Files are only written inside your project. A registry file that targets a path outside it (`../`, an absolute path or a drive letter) is refused and nothing is written.
- Dependencies must be valid npm package names before they reach `npx expo install`, so a registry cannot inject shell commands.
- Component names are checked before they become URLs or file paths.
