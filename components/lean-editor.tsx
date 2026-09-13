'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { LeanEditorProps } from '../lib/editor';
import { PlainEditor } from './plain-editor';

const MonacoEditor = lazy(() => import('./monaco-editor').then(module => ({ default: module.MonacoEditor })));

export function LeanEditor(props: LeanEditorProps) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 701px) and (pointer: fine)');
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const plain = <PlainEditor value={props.value} onChange={props.onChange} onCursor={props.onCursor} onReady={props.onReady} toolbar={!desktop} />;
  return desktop ? <Suspense fallback={plain}><MonacoEditor {...props} /></Suspense> : plain;
}
