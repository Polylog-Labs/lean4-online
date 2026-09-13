'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDownToLine, ArrowRight, BookOpen, BookOpenText, Braces, Check, CheckCheck, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Code2, Copy, ExternalLink, FileCode2, GraduationCap, Keyboard, LoaderCircle, Menu, Monitor, Moon, PanelLeftClose, PanelRight, Play, Plus, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Square, Sun, Terminal, Trash2, X } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { examples, lessons, syntax, type Example, type Lesson, type ExecutionMode } from '../lib/content';
import { decodeSnippet, encodeSnippet, sourceForRun, type RunResult } from '../lib/lean';
import { useLean } from '../lib/use-lean';
import { Guide, LearnPage, SyntaxPage } from './learning';

const LeanEditor = dynamic(() => import('./lean-editor').then(module => module.LeanEditor), { ssr: false, loading: () => <div className="editor-loading">Opening your editor…</div> });
type View = 'playground' | 'learn' | 'syntax';
type Appearance = 'light' | 'dark' | 'system';
export interface OpenFile { id: string; title: string; code: string; mode: ExecutionMode; exampleId?: string; lessonId?: string }
interface FileResult { source: string; result?: RunResult; error?: string; mode: ExecutionMode }
const initialFile: OpenFile = { id: 'hello', title: 'Hello.lean', code: examples[0].code, mode: 'program', exampleId: 'hello' };
const workspaceKey = 'lean-lab-workspace-v1';
const completedKey = 'lean-lab-lessons-v1';
const viewDetails = { playground: ['Playground', 'A place to think in Lean.'], learn: ['Learn Lean', 'Small steps. New ways of thinking.'], syntax: ['Syntax reference', 'A little clarity, one symbol at a time.'] };

export default function Workspace() {
  const [view, setView] = useState<View>('playground');
  const [files, setFiles] = useState<OpenFile[]>([initialFile]);
  const [activeId, setActiveId] = useState('hello');
  const [hydrated, setHydrated] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [referenceGroup, setReferenceGroup] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<'output' | 'problems'>('output');
  const [results, setResults] = useState<Record<string, FileResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [toast, setToast] = useState('');
  const [saveState, setSaveState] = useState('Saved locally');
  const [modal, setModal] = useState<'share' | 'settings' | 'reset' | null>(null);
  const [shareURL, setShareURL] = useState('');
  const [consoleHeight, setConsoleHeight] = useState(230);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const runLock = useRef(false);
  const lean = useLean();
  const executeLean = lean.run;
  const active = files.find(file => file.id === activeId) ?? files[0] ?? initialFile;
  const example = examples.find(example => example.id === active.exampleId);
  const lesson = lessons.find(lesson => lesson.id === active.lessonId);
  const currentResult = results[active.id];
  const result = currentResult?.result;
  const stale = !!currentResult && currentResult.source !== active.code;
  const busy = runningId !== null;
  const theme = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance;
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(media.matches);
    if (window.innerWidth <= 900) setGuideOpen(false);
    if (window.innerWidth <= 700) setSidebarOpen(false);
    const listener = () => setSystemDark(media.matches);
    media.addEventListener('change', listener);
    try {
      const preference = localStorage.getItem('lean-lab-appearance');
      if (preference === 'dark' || preference === 'light' || preference === 'system') setAppearance(preference);
      const progress = JSON.parse(localStorage.getItem(completedKey) ?? '[]');
      if (Array.isArray(progress)) setCompleted([...new Set(progress.filter((id: unknown): id is string => typeof id === 'string' && lessons.some(lesson => lesson.id === id)))]);
      const saved = JSON.parse(localStorage.getItem(workspaceKey) ?? 'null');
      if (saved && Array.isArray(saved.files) && saved.files.length > 0 && saved.files.length <= 30) {
        const valid = saved.files.filter((file: OpenFile) => typeof file.id === 'string' && typeof file.title === 'string' && typeof file.code === 'string' && file.code.length < 200_000 && ['program', 'check'].includes(file.mode));
        if (valid.length) { setFiles(valid); setActiveId(valid.some((file: OpenFile) => file.id === saved.activeId) ? saved.activeId : valid[0].id); }
      }
    } catch { setSaveState('Storage unavailable'); }
    try {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const shared = hash.get('code');
      if (shared) {
        const file: OpenFile = { id: `shared-${Date.now()}`, title: 'Shared.lean', code: decodeSnippet(shared), mode: hash.get('mode') === 'program' ? 'program' : 'check' };
        setFiles(previous => [...previous.filter(file => !file.id.startsWith('shared-')), file]); setActiveId(file.id);
        notify('Shared file opened. Run it whenever you’re ready.');
      }
    } catch { notify('This share link could not be read.'); }
    setHydrated(true);
    return () => media.removeEventListener('change', listener);
  }, [notify]);
  useEffect(() => {
    if (!hydrated) return;
    setSaveState('Saving…');
    const timer = setTimeout(() => {
      try { localStorage.setItem(workspaceKey, JSON.stringify({ files, activeId })); setSaveState('Saved locally'); }
      catch { setSaveState('Storage full · download your file'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [files, activeId, hydrated]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (hydrated) try { localStorage.setItem('lean-lab-appearance', appearance); } catch { /* Optional preference. */ }
  }, [theme, appearance, hydrated]);
  useEffect(() => {
    if (hydrated) try { localStorage.setItem(completedKey, JSON.stringify(completed)); } catch { notify('Lesson progress could not be saved on this device.'); }
  }, [completed, hydrated, notify]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (modal) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [modal]);
  function changeView(next: View) { setView(next); setSearch(''); }
  function openFile(file: OpenFile) {
    if (!files.some(current => current.id === file.id) && files.length >= 30) { notify('Close a tab before opening another file (30 tab limit).'); return; }
    setFiles(previous => previous.some(current => current.id === file.id) ? previous : [...previous, file]); setActiveId(file.id); setView('playground');
    if (window.innerWidth < 800) setSidebarOpen(false);
  }
  function openExample(example: Example) { openFile({ id: example.id, title: example.file, code: example.code, mode: example.mode, exampleId: example.id }); }
  function openLesson(lesson: Lesson) {
    openFile({ id: `lesson-${lesson.id}`, title: `${lesson.title.replaceAll(' ', '')}.lean`, code: lesson.starter, mode: ['io', 'verified'].includes(lesson.id) ? 'program' : 'check', lessonId: lesson.id }); setGuideOpen(true);
  }
  function editCode(code: string) { setFiles(previous => previous.map(file => file.id === active.id ? { ...file, code } : file)); }
  function closeFile(id: string) {
    if (id === runningId) { notify('Stop the current run before closing its file.'); return; }
    const next = files.filter(file => file.id !== id);
    if (!next.length) { setFiles([initialFile]); setActiveId(initialFile.id); }
    else { setFiles(next); if (activeId === id) setActiveId(next[next.length - 1].id); }
  }
  const runCurrent = useCallback(async (mode: ExecutionMode) => {
    if (runLock.current) return;
    runLock.current = true;
    const file = active;
    setRunningId(file.id); setConsoleTab('output'); setResults(previous => ({ ...previous, [file.id]: { source: file.code, mode } }));
    try {
      const response = await executeLean(sourceForRun(file.code, mode, lesson?.validation));
      setResults(previous => ({ ...previous, [file.id]: { source: file.code, result: response, mode } }));
      if (!response.success || response.incomplete) setConsoleTab('problems');
      if (lesson && response.success && !response.incomplete && (file.mode !== 'program' || mode === 'program')) {
        setCompleted(previous => previous.includes(lesson.id) ? previous : [...previous, lesson.id]); notify(`Lesson complete: ${lesson.title}`);
      }
    } catch (error) { setResults(previous => ({ ...previous, [file.id]: { source: file.code, mode, error: error instanceof Error ? error.message : String(error) } })); }
    finally { setRunningId(null); runLock.current = false; }
  }, [active, executeLean, lesson, notify]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); if (view === 'playground') void runCurrent(active.mode); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSidebarOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); notify(saveState === 'Saved locally' ? 'Your workspace is saved on this device.' : saveState); }
    };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, [active.mode, runCurrent, view, notify, saveState]);
  function download() {
    const url = URL.createObjectURL(new Blob([active.code], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = active.title; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify(`${active.title} downloaded`);
  }
  function share() {
    try { const url = new URL(window.location.href); url.hash = new URLSearchParams({ code: encodeSnippet(active.code), mode: active.mode }).toString(); setShareURL(url.href); setModal('share'); }
    catch (error) { notify(error instanceof Error ? error.message : String(error)); }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); notify('Copied to clipboard'); } catch { notify('Select the text and copy it manually; clipboard access is unavailable.'); } }
  function clearResult() { setResults(previous => { const next = { ...previous }; delete next[active.id]; return next; }); }
  function resetFile() { editCode(lesson?.starter ?? example?.code ?? 'def main : IO Unit := do\n  IO.println "Hello, Lean!"\n'); clearResult(); setModal(null); }
  const visibleExamples = examples.filter(example => `${example.title} ${example.description} ${example.category}`.toLowerCase().includes(search.toLowerCase()));

  return <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${guideOpen ? '' : 'guide-collapsed'}`}>
    <header className="topbar">
      <button className="brand" onClick={() => changeView('playground')} aria-label="Lean Lab playground"><span className="brand-mark">λ</span><span>lean<span className="brand-lab">lab</span></span><span className="beta-label">BETA</span></button>
      <nav className="topnav" aria-label="Main navigation">{(['playground', 'learn', 'syntax'] as const).map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => changeView(item)}>{item === 'playground' ? <Code2 size={15} /> : item === 'learn' ? <BookOpen size={15} /> : <Braces size={15} />}{item === 'playground' ? 'Playground' : item === 'learn' ? 'Learn' : 'Syntax'}</button>)}</nav>
      <div className="topbar-right"><a className="docs-link" href="https://lean-lang.org/documentation/" target="_blank" rel="noreferrer">Lean docs<ExternalLink size={12} /></a><span className="topbar-divider" /><button className="icon-button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setAppearance(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="avatar" aria-label="Workspace settings" onClick={() => setModal('settings')}>L</button></div>
    </header>
    <div className="workspace-body">
      <nav className="activity-rail" aria-label="Workspace tools"><div>{(['playground', 'learn', 'syntax'] as const).map(item => <button key={item} className={`rail-button ${view === item ? 'selected' : ''}`} title={viewDetails[item][0]} aria-label={viewDetails[item][0]} onClick={() => { changeView(item); setSidebarOpen(true); }}>{item === 'playground' ? <FileCode2 size={21} /> : item === 'learn' ? <GraduationCap size={22} /> : <BookOpenText size={21} />}</button>)}</div><div><button className="rail-button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => setModal('settings')}><Keyboard size={20} /></button><button className="rail-button" aria-label="Settings" title="Settings" onClick={() => setModal('settings')}><Settings2 size={20} /></button></div></nav>
      <aside className="explorer">
        <div className="explorer-heading"><span>{view === 'playground' ? 'EXPLORER' : view === 'learn' ? 'YOUR LEARNING PATH' : 'QUICK REFERENCE'}</span><button className="icon-button" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={15} /></button></div>
        <label className="search-field"><Search size={14} /><input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'syntax' ? 'Find syntax…' : view === 'learn' ? 'Find a lesson…' : 'Find an example…'} aria-label="Search examples, lessons, or syntax" /><kbd>⌘ K</kbd></label>
        <div className="explorer-scroll">
          {view === 'playground' && <><div className="section-label">EXAMPLES<span>{examples.length}</span></div>{(['Getting started', 'Programs', 'Proofs'] as const).map(category => <div className="example-group" key={category}><div className="group-heading"><ChevronDown size={13} />{category === 'Getting started' ? <Sparkles size={14} /> : category === 'Programs' ? <Terminal size={14} /> : <ShieldCheck size={14} />}<span>{category}</span></div>{visibleExamples.filter(example => example.category === category).map(example => <button key={example.id} className={`example-item ${active.exampleId === example.id ? 'selected' : ''}`} onClick={() => openExample(example)}><span className="lean-file-icon">λ</span><span>{example.title}</span>{active.exampleId === example.id && <span className="selected-dot" />}</button>)}</div>)}{!visibleExamples.length && <p className="empty-search">No examples match “{search}”.</p>}<div className="explorer-footnote"><span className="tiny-dot" />All examples run in your browser</div></>}
          {view === 'learn' && (['Foundations', 'Programming', 'Proving'] as const).map(track => <div className="example-group" key={track}><div className="group-heading"><ChevronDown size={13} /><span>{track}</span></div>{lessons.filter(lesson => lesson.track === track && `${lesson.title} ${lesson.description}`.toLowerCase().includes(search.toLowerCase())).map(lesson => <button className="example-item" key={lesson.id} onClick={() => openLesson(lesson)}>{completed.includes(lesson.id) ? <CircleCheck size={15} className="success-color" /> : <span className="lesson-small-number">{lessons.indexOf(lesson) + 1}</span>}<span>{lesson.title}</span></button>)}</div>)}
          {view === 'syntax' && <><div className="section-label">BROWSE TOPICS</div>{['All', 'Declarations', 'Types', 'Functions', 'Programs', 'Proofs'].map(group => <button key={group} className={`reference-nav ${referenceGroup === group ? 'selected' : ''}`} onClick={() => setReferenceGroup(group)}><Braces size={14} />{group === 'All' ? 'All syntax' : group}<span>{group === 'All' ? syntax.length : syntax.filter(item => item.group === group).length}</span></button>)}<div className="reference-tip"><Keyboard size={19} /><h4>Make symbols easy</h4><p>In the editor, type <code>\to</code> and accept the suggestion to insert <code>→</code>.</p></div></>}
        </div><button className="learn-callout" onClick={() => changeView(view === 'learn' ? 'playground' : 'learn')}><span className="callout-icon"><GraduationCap size={20} /></span><span><strong>{view === 'learn' ? 'Try the playground' : 'New to Lean?'}</strong><small>{view === 'learn' ? 'Make something of your own' : 'Start your learning journey'}</small></span><ExternalLink size={13} /></button>
      </aside>
      <main className={`main-area view-${view}`}>
        <div className="workspace-heading"><div className="workspace-title"><button className="icon-button sidebar-toggle" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18} /></button><div><h1>{viewDetails[view][0]}</h1><p>{viewDetails[view][1]}</p></div></div><div className="heading-actions">{view === 'playground' ? <><span className="local-save"><CheckCheck size={14} />{saveState}</span><button className="button button-quiet" onClick={share}><ExternalLink size={14} />Share</button></> : <span className="small-pill"><GraduationCap size={14} />{completed.length} / {lessons.length} lessons</span>}</div></div>
        {view === 'playground' ? <div className="editor-workspace"><section className="editor-column" aria-label="Editor workspace">
          <div className="file-tabs" role="tablist" aria-label="Open files">{files.map(file => <div key={file.id} className={`file-tab ${active.id === file.id ? 'active' : ''}`}><button role="tab" aria-selected={active.id === file.id} onClick={() => setActiveId(file.id)}><span className="lean-file-icon">λ</span><span>{file.title}</span>{file.lessonId && <span className="tab-exercise-dot" />}</button><button className="tab-close" aria-label={`Close ${file.title}`} onClick={() => closeFile(file.id)}><X size={12} /></button></div>)}<button className="icon-button new-file" aria-label="New Lean file" title="New Lean file" onClick={() => openFile({ id: `file-${Date.now()}`, title: `Untitled${files.filter(file => file.id.startsWith('file-')).length + 1}.lean`, code: 'def main : IO Unit := do\n  IO.println "Hello, Lean!"\n', mode: 'program' })}><Plus size={16} /></button></div>
          <div className="editor-toolbar"><div className="breadcrumbs"><span>{lesson ? 'lessons' : example ? 'examples' : 'workspace'}</span><ChevronRight size={12} /><span>{active.title}</span></div><div><button className="icon-button" title="Reset current file" aria-label="Reset current file" onClick={() => setModal('reset')}><RotateCcw size={14} /></button><button className="icon-button" title="Download Lean file" aria-label="Download Lean file" onClick={download}><ArrowDownToLine size={15} /></button><button className="icon-button" title="Toggle explanation panel" aria-label="Toggle explanation panel" onClick={() => setGuideOpen(!guideOpen)}><PanelRight size={15} /></button></div></div>
          <div className="code-area"><LeanEditor id={active.id} value={active.code} onChange={editCode} theme={theme} diagnostics={stale ? [] : result?.diagnostics ?? []} onCursor={(line, column) => setCursor({ line, column })} onReady={instance => { editorRef.current = instance; }} /></div>
          <div className="run-toolbar"><div className="run-toolbar-caption"><span className="runtime-dot" />Lean 4<span className="dot-separator">·</span><span>Browser runtime</span></div><div className="run-actions"><button className="button check-button" disabled={busy} onClick={() => void runCurrent('check')}><ShieldCheck size={14} />Check file</button>{busy ? <button className="button button-primary" onClick={lean.stop}><Square size={12} fill="currentColor" />Stop</button> : <button className="button button-primary" onClick={() => void runCurrent(active.mode)}>{active.mode === 'program' ? <Play size={13} fill="currentColor" /> : <Check size={15} />}{active.mode === 'program' ? 'Run program' : lesson ? 'Check exercise' : 'Check Lean'}<kbd>⌘ ↵</kbd></button>}</div></div>
          <div className="console-resizer" role="separator" aria-label="Resize output panel" aria-orientation="horizontal" aria-valuemin={120} aria-valuemax={420} aria-valuenow={consoleHeight} tabIndex={0} onKeyDown={event => { if (['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setConsoleHeight(height => Math.max(120, Math.min(420, height + (event.key === 'ArrowUp' ? 20 : -20)))); } }} onPointerDown={event => { const start = event.clientY; const height = consoleHeight; const target = event.currentTarget; target.setPointerCapture(event.pointerId); const move = (event: PointerEvent) => setConsoleHeight(Math.max(120, Math.min(420, height + start - event.clientY))); const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); }; target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up); }} />
          <section className="console" aria-label="Lean execution results" style={{ height: consoleHeight }}><div className="console-tabs"><div role="tablist" aria-label="Output panels"><button role="tab" aria-selected={consoleTab === 'output'} className={consoleTab === 'output' ? 'active' : ''} onClick={() => setConsoleTab('output')}><Terminal size={14} />Output</button><button role="tab" aria-selected={consoleTab === 'problems'} className={consoleTab === 'problems' ? 'active' : ''} onClick={() => setConsoleTab('problems')}>Problems<span className={`problem-count ${result?.diagnostics.length ? 'has-problems' : ''}`}>{result?.diagnostics.length ?? 0}</span></button></div><div className="console-actions">{result && <span className={`result-status ${result.success && !result.incomplete ? 'success-color' : 'warning-color'}`}>{stale ? 'Code changed' : result.success ? result.incomplete ? 'Incomplete' : 'Finished' : 'Check failed'}<span>·</span>{Math.round(result.elapsed)} ms</span>}<button className="icon-button" aria-label="Clear output" title="Clear output" disabled={busy} onClick={clearResult}><Trash2 size={13} /></button></div></div>
            <div className="console-content" role="tabpanel" aria-live="polite">{runningId === active.id ? <div className="runtime-loading"><LoaderCircle size={21} className="spin" /><div><strong>{lean.progress}</strong><p>{lean.state === 'loading' ? 'First run prepares the compiler. Your code stays on this device.' : 'Lean is checking the file and evaluating its expressions.'}</p><div className="indeterminate-progress" /></div></div>
            : currentResult?.error ? <div className="runtime-error"><CircleAlert size={18} /><div><strong>Couldn’t finish this run</strong><p>{currentResult.error}</p><button className="text-button" onClick={() => void runCurrent(active.mode)}>Try again <ArrowRight size={13} /></button></div></div>
            : consoleTab === 'problems' ? result?.diagnostics.length ? <div className="diagnostics">{result.diagnostics.map((diagnostic, index) => <button key={index} className={`diagnostic ${diagnostic.severity}`} onClick={() => { editorRef.current?.revealLineInCenter(diagnostic.line); editorRef.current?.setPosition({ lineNumber: diagnostic.line, column: diagnostic.column }); editorRef.current?.focus(); }}><CircleAlert size={15} /><div><span>{diagnostic.line > active.code.split('\n').length ? 'Exercise / entry-point check' : `${active.title}:${diagnostic.line}:${diagnostic.column}`}</span><pre>{diagnostic.message}</pre></div></button>)}</div> : <div className="empty-console"><ShieldCheck size={24} /><div><strong>{result ? 'No problems found' : 'A little feedback goes a long way.'}</strong><p>{result ? 'Lean checked this version without diagnostics.' : 'Run or check your code to see Lean’s diagnostics.'}</p></div></div>
            : result ? <div className="actual-output">{stale && <p className="stale-note">Results from the previous version. Run again to check your edits.</p>}{result.output.map((line, index) => <pre className={line.stream === 'stderr' ? 'stderr' : ''} key={index}>{line.text}</pre>)}{!result.output.length && <p className={result.success ? 'success-color' : 'warning-color'}>{result.success ? result.incomplete ? 'File accepted with an unfinished proof. See Problems.' : 'File checked successfully.' : 'Lean found a problem. See the Problems tab.'}</p>}{result.success && <div className="execution-footer"><Check size={12} />{currentResult.mode === 'program' ? 'Program evaluated in Lean WebAssembly' : 'Checked by Lean WebAssembly'}</div>}</div>
            : <div className="empty-console"><Terminal size={25} /><div><strong>A blank canvas for your next idea.</strong><p>{active.mode === 'program' ? <>Run your program to see its output here. <kbd>⌘ ↵</kbd></> : 'Check this file to see results and diagnostics here.'}</p><span className="first-run-note">First run downloads Lean (~101 MB). Cached for next time.</span></div></div>}</div>
          </section></section>
          <Guide key={active.id} file={active} example={example} lesson={lesson} complete={!!lesson && completed.includes(lesson.id)} onClose={() => setGuideOpen(false)} onExample={openExample} onLesson={openLesson} onLearn={() => changeView('learn')} onSyntax={() => changeView('syntax')} onDownload={download} onEdit={editCode} />
        </div> : view === 'learn' ? <LearnPage completed={completed} search={search} onLesson={openLesson} /> : <SyntaxPage search={search} group={referenceGroup} onExample={openExample} onClear={() => { setSearch(''); setReferenceGroup('All'); }} />}
      </main>
    </div>
    <footer className="statusbar"><div><span className={`runtime-dot ${lean.state === 'ready' ? 'ready' : ''}`} /><span>{lean.state === 'loading' ? 'Preparing Lean…' : lean.state === 'running' ? 'Running…' : lean.state === 'error' ? 'Runtime needs retry' : 'Runs locally in your browser'}</span></div><div><span className="status-version">{lean.version}</span><span className="status-divider" /><span>Ln {cursor.line}, Col {cursor.column}</span><span className="status-encoding">UTF-8</span><span className="status-language">Lean</span><button aria-label="Help and shortcuts" onClick={() => setModal('settings')}><Keyboard size={13} /></button></div></footer>
    {toast && <div className="toast" role="status"><CircleCheck size={16} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={13} /></button></div>}
    <dialog ref={dialogRef} className="modal" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}><div className="modal-content"><button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setModal(null)}><X size={18} /></button>{modal === 'share' ? <><div className="modal-icon"><ExternalLink size={22} /></div><h2>Share a little Lean.</h2><p>This link contains a copy of your current file. Anyone with the link can open and run it.</p><label className="field-label" htmlFor="share-url">Link to {active.title}</label><div className="share-input"><input id="share-url" value={shareURL} readOnly onFocus={event => event.target.select()} /><button className="button button-primary" onClick={() => copy(shareURL)}><Copy size={14} />Copy</button></div><p className="modal-footnote">No account needed. Future edits won’t change this link.</p></> : modal === 'reset' ? <><div className="modal-icon"><RotateCcw size={22} /></div><h2>Start this file fresh?</h2><p>This replaces your edits in {active.title} with {lesson ? 'the exercise starter' : 'the original example'}. You can download your current version first.</p><div className="modal-buttons"><button className="button button-quiet" onClick={download}>Download current file</button><button className="button button-primary" onClick={resetFile}>Reset file</button></div></> : <><div className="modal-icon"><Settings2 size={22} /></div><h2>Make yourself at home.</h2><p>A few preferences for your workspace.</p><div className="settings-section"><h3>Appearance</h3><div className="appearance-options">{(['light', 'dark', 'system'] as const).map(option => <button key={option} className={appearance === option ? 'selected' : ''} onClick={() => setAppearance(option)}>{option === 'light' ? <Sun size={20} /> : option === 'dark' ? <Moon size={20} /> : <Monitor size={20} />}<span>{option}</span>{appearance === option && <Check size={13} />}</button>)}</div></div><div className="settings-section"><h3>Keyboard shortcuts</h3><div className="shortcut-row"><span>Run current file</span><kbd>⌘ / Ctrl + Enter</kbd></div><div className="shortcut-row"><span>Search examples or reference</span><kbd>⌘ / Ctrl + K</kbd></div><div className="shortcut-row"><span>Save workspace</span><kbd>Automatic</kbd></div><div className="shortcut-row"><span>Insert a Unicode symbol</span><kbd>\to + Enter</kbd></div></div><div className="settings-section"><h3>About this workspace</h3><p>Real Lean 4.33.0-pre runs in WebAssembly on your device. Includes the core library. Files are independent; Mathlib and custom imports aren’t bundled. A desktop browser is recommended.</p><a className="text-link" href="https://github.com/cauli/lean4-wasm-in-browser" target="_blank" rel="noreferrer">Powered by the community’s Lean WASM runtime <ExternalLink size={12} /></a></div></>}</div></dialog>
  </div>;
}
