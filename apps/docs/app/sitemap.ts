import type { MetadataRoute } from 'next';

import { allComponents } from '../lib/data';
import { SITE_URL } from '../lib/llm';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({ url: `${SITE_URL}${path}`, priority });
  return [
    page('/', 1),
    page('/components', 0.9),
    page('/docs/getting-started', 0.9),
    page('/registry', 0.5),
    ...allComponents.map((c) => page(`/components/${c.name}`, 0.8)),
  ];
}
