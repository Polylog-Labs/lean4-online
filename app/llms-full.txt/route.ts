import { fullSiteGuide } from '../../lib/site-guide';
export const dynamic = 'force-static';
export function GET() { return new Response(fullSiteGuide(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
