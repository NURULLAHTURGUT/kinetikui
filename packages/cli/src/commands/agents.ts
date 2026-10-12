import fs from 'node:fs';
import path from 'node:path';

import { agentsSection, skillFile, upsertSection } from '../agents';
import { defaultLayout, findProject } from '../project';
import { c, log } from '../ui';

export type AgentsOptions = { cwd: string; skill: boolean };

/** Writes Kinetik guidance for AI agents into AGENTS.md (and optionally a skill). */
export function agents({ cwd, skill }: AgentsOptions): void {
  const project = findProject(cwd);
  const layout = project.config ?? defaultLayout(project.root);

  const file = path.join(project.root, 'AGENTS.md');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const next = upsertSection(existing, agentsSection(layout));
  if (next === existing) {
    log.step('AGENTS.md is up to date');
  } else {
    fs.writeFileSync(file, next);
    log.success(`${existing ? 'Updated' : 'Created'} AGENTS.md`);
  }

  if (skill) {
    const skillPath = path.join(project.root, '.claude', 'skills', 'kinetik-ui', 'SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, skillFile(layout));
    log.success(`Wrote ${path.relative(project.root, skillPath).split(path.sep).join('/')}`);
  }
  log.info(c.dim('  Agents can also use the MCP server: npx -y kinetik-ui mcp'));
}
