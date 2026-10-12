import { llmsFullTxt } from '../../lib/llm';

export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsFullTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
