'use client';
import { useEffect, useRef } from 'react';

export function ResizeHandle({ label, value, min, max, onChange, horizontal = false, reverse = false }: {
  label: string; value: number; min: number; max: number; onChange(value: number): void; horizontal?: boolean; reverse?: boolean;
}) {
  const drag = useRef<{ start: number; value: number } | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const clamp = (size: number) => Math.max(min, Math.min(max, size));
  return <div className={`panel-resizer ${horizontal ? 'horizontal' : 'vertical'}`} role="separator" aria-label={label}
    aria-orientation={horizontal ? 'horizontal' : 'vertical'} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0}
    onDoubleClick={() => onChange(Math.round((min + max) / 2))}
    onKeyDown={event => {
      const positive = horizontal ? 'ArrowDown' : 'ArrowRight', negative = horizontal ? 'ArrowUp' : 'ArrowLeft';
      if (event.key !== positive && event.key !== negative) return;
      event.preventDefault(); onChange(clamp(value + (event.key === positive ? 10 : -10) * (reverse ? -1 : 1)));
    }}
    onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { start: horizontal ? event.clientY : event.clientX, value }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => {
      if (!drag.current) return;
      const next = clamp(drag.current.value + ((horizontal ? event.clientY : event.clientX) - drag.current.start) * (reverse ? -1 : 1));
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => { frame.current = null; onChange(next); });
    }}
    onLostPointerCapture={() => { drag.current = null; }}
    onPointerUp={event => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} />;
}
