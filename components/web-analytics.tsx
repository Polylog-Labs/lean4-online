'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  // Shared programs live in the URL fragment. Track pages without source or query data.
  return { ...event, url: event.url.split(/[?#]/, 1)[0] };
}

export default function WebAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
