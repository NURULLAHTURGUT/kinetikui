import { findProject } from '../project';
import { DEFAULT_REGISTRY, Registry } from '../registry';

export type McpOptions = { cwd: string; registry?: string; version: string };

/**
 * Serves the registry to AI agents over stdio (Model Context Protocol). stdout
 * belongs to the protocol, so nothing here may log to it.
 */
export async function mcp({ cwd, registry, version }: McpOptions): Promise<void> {
  const config = () => {
    try {
      return findProject(cwd).config;
    } catch {
      return null; // Works outside a project too: nothing is installed.
    }
  };
  const base = registry ?? config()?.registry ?? DEFAULT_REGISTRY;
  const { startStdioServer } = await import('@kinetik/mcp');
  await startStdioServer({
    registry: new Registry(base),
    // Re-read on every call so installs made while the agent runs show up.
    installed: async () => config()?.installed ?? {},
    version,
  });
}
