import type { MetadataRoute } from 'next';

import { SITE_URL } from '../lib/llm';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // The markdown views duplicate the pages they belong to.
    rules: [{ userAgent: '*', allow: '/', disallow: '/markdown/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
