import { CircleAlert } from 'lucide-react';

export function SafariBadge() {
  return <span className="safari-badge" title="Known Safari compiler limitation" aria-label="Known Safari compiler limitation"><CircleAlert size={13} /></span>;
}

export function SafariFilter({ checked, onChange }: { checked: boolean; onChange(checked: boolean): void }) {
  return <div className="safari-filter">
    <p>Some files may exceed Safari’s compiler limit.</p>
    <label><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />Hide Safari limitations</label>
  </div>;
}

export function SafariNotice({ lesson, onRunLocally }: { lesson: boolean; onRunLocally(): void }) {
  return <div className="safari-notice" role="note" aria-label="Safari compatibility">
    <CircleAlert size={15} />
    <details>
      <summary>This {lesson ? 'exercise' : 'example'} may fail in Safari.</summary>
      <p>The browser compiler hit WebKit’s stack limit in testing. You can still edit and try it here, or download it to run locally. Browser versions and edits can change the result.</p>
    </details>
    <button className="text-button" onClick={onRunLocally}>Run locally</button>
  </div>;
}
