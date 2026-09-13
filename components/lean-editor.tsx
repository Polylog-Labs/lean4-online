'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { LeanEditorProps } from '../lib/editor';
import { PlainEditor } from './plain-editor';
import { desktopMedia } from '../lib/layout';

const MonacoEditor = lazy(() => import('./monaco-editor').then(module => ({ default: module.MonacoEditor })));
const MobileEditor = lazy(() => import('./mobile-editor').then(module => ({ default: module.MobileEditor })));

export function LeanEditor(props: LeanEditorProps) {
  const [kind, setKind] = useState<'pending' | 'desktop' | 'mobile'>('pending');
  useEffect(() => {
    const media = window.matchMedia(desktopMedia);
    const update = () => setKind(media.matches ? 'desktop' : 'mobile');
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const plain = <PlainEditor value={props.value} onChange={props.onChange} onCursor={props.onCursor} onReady={props.onReady} />;
  return kind === 'pending' ? plain : <Suspense fallback={plain}>{kind === 'desktop' ? <MonacoEditor {...props} /> : <MobileEditor {...props} />}</Suspense>;
}
