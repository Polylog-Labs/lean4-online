import type { ReactNode } from 'react';
import Link from 'next/link';

export function ContentPage({ children }: { children: ReactNode }) {
  return <main className="content-page"><header><Link href="/" prefetch={false} className="brand"><span className="brand-mark">λ</span><span>lean<span className="brand-lab">lab</span></span></Link><nav aria-label="Content navigation"><Link href="/examples" prefetch={false}>Examples</Link><Link href="/learn" prefetch={false}>Learn</Link><Link href="/" prefetch={false}>Open editor</Link></nav></header><article>{children}</article><footer><a href="/llms.txt">Guide for agents</a><a href="https://lean-lang.org/doc/reference/latest/">Lean language reference</a></footer></main>;
}
