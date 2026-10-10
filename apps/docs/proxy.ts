import { NextResponse, type NextRequest } from 'next/server';

/**
 * Serves markdown to agents: `/components/glint-card.md`, or any page
 * requested with `Accept: text/markdown`, is rewritten to its /md twin.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const explicit = pathname.endsWith('.md');
  const accept = request.headers.get('accept') ?? '';
  if (!explicit && !/\btext\/markdown\b/.test(accept)) return NextResponse.next();

  const page = pathname.replace(/\.md$/, '').replace(/\/$/, '');
  const target = page === '' || page === '/index' ? '/md/index' : `/md${page}`;
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: never assets, the registry JSON, llms files or the md routes themselves.
  matcher: ['/', '/index.md', '/docs/:path*', '/components/:path*'],
};
