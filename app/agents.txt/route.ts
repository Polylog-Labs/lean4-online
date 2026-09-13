import { siteGuide } from '../../lib/site-guide';

export const dynamic = 'force-static';

export function GET() {
  return new Response(siteGuide, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
