'use client';
import { useEffect, useState } from 'react';
import { defaultLayout, layoutKey, mobileMedia, restoreLayout, type Layout } from './layout';

export function useWorkspaceLayout() {
  const [layout, setLayout] = useState({ ...defaultLayout });
  const [mobile, setMobile] = useState(false);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const media = matchMedia(mobileMedia);
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    try { setLayout(restoreLayout(JSON.parse(localStorage.getItem(layoutKey) ?? 'null'))); } catch { /* Optional layout preference. */ }
    setRestored(true);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!restored) return;
    const timeout = setTimeout(() => {
      try { localStorage.setItem(layoutKey, JSON.stringify(layout)); } catch { /* Code persistence is independent. */ }
    }, 200);
    return () => clearTimeout(timeout);
  }, [layout, restored]);
  function updateLayout(patch: Partial<Layout>) { setLayout(previous => restoreLayout({ ...previous, ...patch })); }
  return { layout, mobile, updateLayout, setLayout, resetLayout: () => setLayout({ ...defaultLayout }) };
}
