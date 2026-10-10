import { MARKDOWN_HEADERS, markdownFor, markdownPaths } from '../../../lib/llm';

/** Markdown twins of the pages. proxy.ts routes `*.md` and `Accept: text/markdown` here. */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return markdownPaths().map((p) => ({ slug: p.split('/') }));
}

export async function GET(_request: Request, { params }: RouteContext<'/md/[...slug]'>) {
  const { slug } = await params;
  const body = markdownFor(`/${slug.join('/')}`);
  if (!body) return new Response('Not found\n', { status: 404 });
  return new Response(body, { headers: MARKDOWN_HEADERS });
}
