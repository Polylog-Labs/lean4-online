'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function ActionMenu({ label, trigger, children, className = '' }: { label: string; trigger: ReactNode; children: ReactNode; className?: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) menu.current?.removeAttribute('open'); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <details ref={menu} className={`action-menu ${className}`} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); menu.current?.removeAttribute('open'); menu.current?.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={label} title={label}>{trigger}</summary>
    <div className="action-menu-content" onClick={event => { if ((event.target as Element).closest('button')) menu.current?.removeAttribute('open'); }}>{children}</div>
  </details>;
}
