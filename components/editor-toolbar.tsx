'use client';
import { useEffect, useRef } from 'react';
import { ArrowDownToLine, BookOpenText, Check, ChevronDown, Copy, ExternalLink, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Square, Terminal, X } from 'lucide-react';
import { ActionMenu } from './action-menu';
import type { OpenFile } from '../lib/workspace';
import { isPersonalFile } from '../lib/workspace';
import type { ExecutionMode } from '../lib/content';

export function EditorToolbar({ active, tabs, mobile, busy, guideOpen, guideTab, consoleOpen, onSelect, onClose, onCreate, onRun, onStop, onGuide, onOutput, onShare, onRename, onCopy, onDownload, onReset, onMode }: {
  active: OpenFile; tabs: OpenFile[]; mobile: boolean; busy: boolean; guideOpen: boolean; guideTab: 'guide' | 'run'; consoleOpen: boolean;
  onSelect(id: string): void; onClose(id: string): void; onCreate(): void; onRun(mode: ExecutionMode): void; onStop(): void;
  onGuide(tab: 'guide' | 'run'): void; onOutput(): void; onShare(): void; onRename(): void; onCopy(): void; onDownload(): void; onReset(): void; onMode(mode: ExecutionMode): void;
}) {
  const tabList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobile) tabList.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active.id, mobile, tabs.length]);
  const runLabel = active.mode === 'program' ? 'Run program' : active.lessonId ? 'Check exercise' : 'Check Lean';
  return <div className="ide-toolbar">
    <div className="run-control">
      {busy ? <button className="button button-primary" aria-label="Stop execution" onClick={onStop}><Square size={12} fill="currentColor" />Stop</button>
        : <button className="button button-primary" aria-label={runLabel} title={`${runLabel} (⌘ / Ctrl + Enter)`} onClick={() => onRun(active.mode)}>{active.mode === 'program' ? <Play size={13} fill="currentColor" /> : <Check size={14} />}{active.mode === 'program' ? 'Run' : 'Check'}</button>}
      <ActionMenu label="Run options" trigger={<ChevronDown size={13} />}>
        <button disabled={busy} onClick={() => onRun('check')}><Check size={14} />Check file</button>
        <button disabled={busy} onClick={() => onRun('program')}><Play size={14} />Run main</button>
        {isPersonalFile(active) && <label className="menu-field">File mode<select aria-label="Execution mode" value={active.mode} onChange={event => onMode(event.target.value as ExecutionMode)}><option value="program">Program</option><option value="check">Proof / #eval</option></select></label>}
      </ActionMenu>
    </div>
    <div ref={tabList} className="file-tabs" role="tablist" aria-label="Open files">{tabs.map(file => <div key={file.id} className={`file-tab ${active.id === file.id ? 'active' : ''}`}>
      <button role="tab" aria-selected={active.id === file.id} onClick={() => onSelect(file.id)}><span className="lean-file-icon">λ</span><span>{file.title}</span>{file.lessonId && <span className="tab-exercise-dot" />}</button>
      <button className="tab-close" aria-label={`Close ${file.title}`} onClick={() => onClose(file.id)}><X size={12} /></button>
    </div>)}<button className="icon-button new-file" aria-label="New Lean file" title="New Lean file" onClick={onCreate}><Plus size={15} /></button></div>
    <ActionMenu className="file-picker" label="Switch file" trigger={<><span className="lean-file-icon">λ</span><span>{active.title}</span><ChevronDown size={13} /></>}>
      {tabs.map(file => <button key={file.id} onClick={() => onSelect(file.id)} aria-current={file.id === active.id ? 'true' : undefined}><span className="lean-file-icon">λ</span>{file.title}{file.id === active.id && <Check size={13} />}</button>)}
      <button onClick={onCreate}><Plus size={14} />New Lean file</button>
    </ActionMenu>
    <div className="panel-actions">
      <button aria-label="Toggle Guide" aria-pressed={guideOpen && guideTab === 'guide'} onClick={() => onGuide('guide')} title="Guide"><BookOpenText size={14} /><span>Guide</span></button>
      <button aria-label="Toggle Run locally" aria-pressed={guideOpen && guideTab === 'run'} onClick={() => onGuide('run')} title="Run locally"><Terminal size={14} /><span>Run locally</span></button>
      <button aria-label="Toggle Output" aria-pressed={consoleOpen} onClick={onOutput} title="Output"><span>Output</span><ChevronDown size={12} /></button>
    </div>
    <ActionMenu className="file-actions" label="File actions" trigger={<MoreHorizontal size={18} />}>
      <button onClick={onShare}><ExternalLink size={14} />Share</button>
      {active.exampleId && <button onClick={onCopy}><Copy size={14} />Copy to Playground</button>}
      {isPersonalFile(active) && <button onClick={onRename}><Pencil size={14} />Rename file</button>}
      <button onClick={onDownload}><ArrowDownToLine size={14} />Download file</button>
      <button onClick={onReset}><RotateCcw size={14} />Reset file</button>
      <button onClick={() => onClose(active.id)}><X size={14} />Close file</button>
    </ActionMenu>
  </div>;
}
