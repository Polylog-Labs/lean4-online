'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { LeanEditor } from './lean-editor';
import { EditorToolbar } from './editor-toolbar';
import { ResizeHandle } from './resize-handle';
import { useWorkspaceLayout } from '../lib/use-layout';
import { desktopMedia, layoutLimits } from '../lib/layout';
import { ArrowDownToLine, ArrowRight, BookOpenText, Braces, Check, CheckCheck, ChevronRight, CircleAlert, CircleCheck, Copy, ExternalLink, FileCode2, FolderOpen, Pencil, GraduationCap, Keyboard, LoaderCircle, Menu, Monitor, Moon, PanelLeftClose, Plus, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Sun, Terminal, Trash2, X } from 'lucide-react';
import type { EditorHandle } from '../lib/editor';
import { examples, lessons, lessonTracks, syntax, type Example, type Lesson, type ExecutionMode } from '../lib/content';
import { decodeSnippet, encodeSnippet, sourceForRun, type RunResult } from '../lib/lean';
import { useLean } from '../lib/use-lean';
import { compilerTransferLabel, compilerTransferSummary } from '../lib/runtime-progress';
import { RuntimeError } from './runtime-error';
import { SafariBadge, SafariFilter, SafariNotice } from './browser-compatibility';
import { safariLimitedExamples, safariLimitedLessons, usesWebKit } from '../lib/browser-compatibility';
import { Guide, LearnPage, SyntaxPage } from './learning';
import type { SyntaxEntry } from '../lib/syntax';
import { availableName, closeTab, completedKey, fileName, isPersonalFile, legacyWorkspaceKey, programStarter, proofStarter, restoreWorkspace, workspaceKey, type OpenFile } from '../lib/workspace';

type View = 'examples' | 'playground' | 'learn' | 'lesson' | 'syntax';
type Appearance = 'light' | 'dark' | 'system';
interface FileResult { source: string; result?: RunResult; error?: string; mode: ExecutionMode }
const welcome = examples.find(example => example.id === 'welcome')!;
const initialFile: OpenFile = { id: welcome.id, title: welcome.file, code: welcome.code, mode: welcome.mode, exampleId: welcome.id };
const zcashAddress = 't1ewvCXSSCQQ879MHxwFqjh5dtakWKmmdAq';
const viewTitles = { examples: 'Examples', playground: 'Playground', lesson: 'Learn Lean', learn: 'Learn Lean', syntax: 'Lean syntax' };

export default function Workspace() {
  const [view, setView] = useState<View>('examples');
  const [files, setFiles] = useState<OpenFile[]>([initialFile]);
  const [openIds, setOpenIds] = useState<string[]>([initialFile.id]);
  const [activeId, setActiveId] = useState(initialFile.id);
  const [hydrated, setHydrated] = useState(false);
  const [safari, setSafari] = useState(false);
  const [hideSafariLimited, setHideSafariLimited] = useState(false);
  const [compilerInfoHidden, setCompilerInfoHidden] = useState(false);
  const [storageReadable, setStorageReadable] = useState(true);
  const [appearance, setAppearance] = useState<Appearance>('dark');
  const [systemDark, setSystemDark] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [referenceGroup, setReferenceGroup] = useState('All');
  const { layout, mobile, updateLayout, setLayout, resetLayout } = useWorkspaceLayout();
  const { sidebarOpen, guideOpen, consoleOpen, consoleHeight } = layout;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'code' | 'output' | 'guide'>('code');
  const [guideTab, setGuideTab] = useState<'guide' | 'run'>('guide');
  const shellRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  function setSidebarOpen(open: boolean) { if (mobile) setDrawerOpen(open); else updateLayout({ sidebarOpen: open }); }
  function setGuideOpen(open: boolean) { if (mobile) setMobilePanel(open ? 'guide' : 'code'); else updateLayout({ guideOpen: open }); }
  function toggleGuide(tab: 'guide' | 'run') {
    const visible = mobile ? mobilePanel === 'guide' : guideOpen;
    setGuideTab(tab); setGuideOpen(!(visible && guideTab === tab));
  }
  const [consoleTab, setConsoleTab] = useState<'output' | 'problems'>('output');
  const [results, setResults] = useState<Record<string, FileResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [toast, setToast] = useState('');
  const [saveState, setSaveState] = useState('Saved locally');
  const [modal, setModal] = useState<'share' | 'settings' | 'reset' | 'create' | 'rename' | 'delete' | 'progress' | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [fileTarget, setFileTarget] = useState<OpenFile | null>(null);
  const [newMode, setNewMode] = useState<ExecutionMode>('program');
  const [shareURL, setShareURL] = useState('');
  const editorRef = useRef<EditorHandle | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const editorMounted = useCallback((instance: EditorHandle, enhanced: boolean) => {
    editorRef.current = instance;
    if (enhanced) setEditorReady(true);
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const runLock = useRef(false);
  const lean = useLean(editorReady);
  const filterSafari = safari && hideSafariLimited;
  const executeLean = lean.run;
  const active = files.find(file => file.id === activeId) ?? files[0] ?? initialFile;
  const editorVisible = view === 'examples' || view === 'playground' || view === 'lesson';
  const navigationView = view === 'lesson' ? 'learn' : view;
  const personalFiles = files.filter(isPersonalFile);
  const scopeFiles = files.filter(file => view === 'playground' ? isPersonalFile(file) : view === 'lesson' ? !!file.lessonId : !!file.exampleId);
  const tabs = scopeFiles.filter(file => openIds.includes(file.id));
  const hasActive = tabs.some(file => file.id === activeId);
  const example = examples.find(example => example.id === active.exampleId);
  const lesson = lessons.find(lesson => lesson.id === active.lessonId);
  const safariLimited = safari && (lesson ? safariLimitedLessons.has(lesson.id) : !!example && safariLimitedExamples.has(example.id));
  const currentResult = results[active.id];
  const result = currentResult?.result;
  const stale = !!currentResult && currentResult.source !== active.code;
  const busy = runningId !== null;
  const theme = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance;
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    setSafari(usesWebKit(navigator.userAgent));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(media.matches);
    const listener = () => setSystemDark(media.matches);
    media.addEventListener('change', listener);
    try {
      const preference = localStorage.getItem('lean-lab-appearance');
      if (preference === 'dark' || preference === 'light' || preference === 'system') setAppearance(preference);
      const progress = JSON.parse(localStorage.getItem(completedKey) ?? '[]');
      if (Array.isArray(progress)) setCompleted([...new Set(progress.filter((id: unknown): id is string => typeof id === 'string' && lessons.some(lesson => lesson.id === id)))]);
    } catch { /* Preferences must not prevent recovering files. */ }
    try {
      const raw = localStorage.getItem(workspaceKey) ?? localStorage.getItem(legacyWorkspaceKey);
      const saved = restoreWorkspace(JSON.parse(raw ?? 'null'));
      if (raw && !saved) throw new Error('Invalid workspace');
      if (saved) {
        setFiles(saved.files); setOpenIds(saved.openIds); setActiveId(saved.activeId);
        const file = saved.files.find(file => file.id === saved.activeId);
        if (file) setView(file.lessonId ? 'lesson' : file.exampleId ? 'examples' : 'playground');
        else if (saved.files.some(isPersonalFile)) setView('playground');
        if (!window.matchMedia(desktopMedia).matches) {
          // A normal mobile visit starts with Welcome, while preserving every
          // saved file and edit. Explicit links below take precedence.
          setFiles(saved.files.some(file => file.id === initialFile.id) ? saved.files : [...saved.files, initialFile]);
          setOpenIds(saved.openIds.includes(initialFile.id) ? saved.openIds : [...saved.openIds, initialFile.id]);
          setActiveId(initialFile.id); setView('examples');
        }
      }
    } catch { setStorageReadable(false); setSaveState('Storage unreadable · download your edits'); }
    try {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const shared = hash.get('code');
      if (shared) {
        const file: OpenFile = { id: `shared-${Date.now()}`, title: `Shared_${Date.now()}.lean`, code: decodeSnippet(shared), mode: hash.get('mode') === 'program' ? 'program' : 'check' };
        setFiles(previous => [...previous, file]); setOpenIds(previous => [...previous, file.id]); setActiveId(file.id); setView('playground');
        notify('Shared file opened.');
      } else {
        const linkedExample = examples.find(example => example.id === hash.get('example'));
        const linkedLesson = lessons.find(lesson => lesson.id === hash.get('lesson'));
        const file: OpenFile | undefined = linkedExample ? { id: linkedExample.id, title: linkedExample.file, code: linkedExample.code, mode: linkedExample.mode, exampleId: linkedExample.id }
          : linkedLesson ? { id: `lesson-${linkedLesson.id}`, title: `${linkedLesson.title.replaceAll(' ', '')}.lean`, code: linkedLesson.starter, mode: linkedLesson.mode ?? 'check', lessonId: linkedLesson.id } : undefined;
        if (file) {
          setFiles(previous => previous.some(current => current.id === file.id) ? previous : [...previous, file]);
          setOpenIds(previous => previous.includes(file.id) ? previous : [...previous, file.id]);
          setActiveId(file.id); setView(file.lessonId ? 'lesson' : 'examples');
          if (file.lessonId) { setLayout(previous => ({ ...previous, guideOpen: true })); setMobilePanel('guide'); }
        }
      }
    } catch { notify('This share link could not be read.'); }
    setHydrated(true);
    return () => media.removeEventListener('change', listener);
  }, [notify, setLayout]);
  useEffect(() => {
    if (!hydrated || !storageReadable) return;
    setSaveState('Saving…');
    const save = () => {
      try { localStorage.setItem(workspaceKey, JSON.stringify({ files, openIds, activeId })); setSaveState('Saved locally'); }
      catch { setSaveState('Storage full · download your file'); }
    };
    const timer = setTimeout(save, 200);
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save); };
  }, [files, openIds, activeId, hydrated, storageReadable]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (hydrated) try { localStorage.setItem('lean-lab-appearance', appearance); } catch { /* Optional preference. */ }
  }, [theme, appearance, hydrated]);
  useEffect(() => {
    if (hydrated) try { localStorage.setItem(completedKey, JSON.stringify(completed)); } catch { notify('Lesson progress could not be saved on this device.'); }
  }, [completed, hydrated, notify]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (modal) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [modal]);
  useEffect(() => {
    const viewport = window.visualViewport, shell = shellRef.current;
    if (!mobile || !viewport || !shell) return;
    const update = () => {
      shell.style.setProperty('--viewport-height', `${viewport.height}px`);
      shell.style.setProperty('--viewport-top', `${viewport.offsetTop}px`);
      shell.dataset.keyboard = String(window.innerHeight - viewport.height > 120);
    };
    update(); viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update);
      shell.style.removeProperty('--viewport-height'); shell.style.removeProperty('--viewport-top'); delete shell.dataset.keyboard;
    };
  }, [mobile]);
  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    const navigation = navigationRef.current, menu = menuRef.current;
    navigation?.querySelector('button')?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawerOpen(false); return; }
      if (event.key !== 'Tab') return;
      const elements = [...navigation!.querySelectorAll<HTMLElement>('button:not(:disabled), a, input, select, summary, [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => { document.removeEventListener('keydown', trapFocus); menu?.focus(); };
  }, [mobile, drawerOpen]);
  function changeView(next: View) {
    setSearch(''); setView(next); setMobilePanel('code');
    if (next === 'learn' || next === 'syntax') setDrawerOpen(false);
    if (next === 'examples' || next === 'playground') {
      const scoped = files.filter(file => next === 'playground' ? isPersonalFile(file) : !!file.exampleId);
      const recent = [...openIds].reverse().find(id => scoped.some(file => file.id === id));
      if (recent) setActiveId(recent);
      else if (next === 'examples') openExample(examples[0]);
      else setActiveId('');
    }
  }
  function openFile(file: OpenFile) {
    setFiles(previous => previous.some(current => current.id === file.id) ? previous : [...previous, file]);
    setOpenIds(previous => previous.includes(file.id) ? previous : [...previous, file.id]);
    setActiveId(file.id); setView(file.lessonId ? 'lesson' : file.exampleId ? 'examples' : 'playground');
    setDrawerOpen(false); setMobilePanel('code');
  }
  function openExample(example: Example) { openFile({ id: example.id, title: example.file, code: example.code, mode: example.mode, exampleId: example.id }); }
  function openSyntax(item: SyntaxEntry) {
    openFile({ id: `file-${crypto.randomUUID()}`, title: availableName(`${item.title.replace(/[^a-zA-Z0-9]/g, '')}.lean`, files), code: `-- ${item.title}\n-- ${item.explanation}\n\n${item.code}\n`, mode: 'check' });
    setGuideOpen(false); setSearch('');
  }
  function openLesson(lesson: Lesson) {
    openFile({ id: `lesson-${lesson.id}`, title: `${lesson.title.replaceAll(' ', '')}.lean`, code: lesson.starter, mode: lesson.mode ?? 'check', lessonId: lesson.id }); setGuideTab('guide'); setGuideOpen(true);
  }
  function editCode(code: string) { setFiles(previous => previous.map(file => file.id === active.id ? { ...file, code } : file)); }
  function closeFile(id: string) {
    if (id === runningId) { notify('Stop the current run before closing its file.'); return; }
    const next = closeTab({ files, openIds, activeId }, id);
    setOpenIds(next.openIds);
    if (activeId === id) setActiveId(tabs.filter(file => file.id !== id).at(-1)?.id ?? '');
  }
  function createFile(copyFrom?: OpenFile) {
    setFileTarget(copyFrom ?? null); setNameError('');
    setNameInput(availableName(copyFrom?.title ?? 'Untitled.lean', files));
    setNewMode(copyFrom?.mode ?? 'program'); setModal('create');
  }
  function renameFile(file: OpenFile) {
    setFileTarget(file); setNameInput(file.title); setNameError(''); setModal('rename');
  }
  function submitFile() {
    try {
      const title = fileName(nameInput, files, modal === 'rename' ? fileTarget?.id : undefined);
      if (modal === 'rename' && fileTarget) {
        setFiles(previous => previous.map(file => file.id === fileTarget.id ? { ...file, title } : file));
        notify(`Renamed to ${title}`);
      } else {
        openFile({ id: `file-${crypto.randomUUID()}`, title, mode: newMode, code: fileTarget?.code ?? (newMode === 'program' ? programStarter : proofStarter) });
        setGuideOpen(false); setSearch(''); notify(`${title} saved in My files`);
      }
      setModal(null);
    } catch (error) { setNameError(error instanceof Error ? error.message : String(error)); }
  }
  function deleteFile() {
    if (!fileTarget || fileTarget.id === runningId) return;
    closeFile(fileTarget.id); setFiles(previous => previous.filter(file => file.id !== fileTarget.id));
    setModal(null); notify(`${fileTarget.title} deleted`);
  }
  const runCurrent = useCallback(async (mode: ExecutionMode) => {
    if (runLock.current) return;
    runLock.current = true;
    setCompilerInfoHidden(true);
    const file = active;
    setLayout(previous => ({ ...previous, consoleOpen: true }));
    setMobilePanel('output');
    if (mobile) (document.activeElement as HTMLElement | null)?.blur();
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
  }, [active, executeLean, lesson, notify, mobile, setLayout]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); if (editorVisible && hasActive) void runCurrent(active.mode); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (mobile) setDrawerOpen(true); else setLayout(previous => ({ ...previous, sidebarOpen: true })); setTimeout(() => searchRef.current?.focus(), 0); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); notify(saveState === 'Saved locally' ? 'Your workspace is saved on this device.' : saveState); }
    };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, [active.mode, runCurrent, editorVisible, hasActive, notify, saveState, mobile, setLayout]);
  function download(file: OpenFile = active) {
    const url = URL.createObjectURL(new Blob([file.code], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = file.title; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify(`${file.title} downloaded`);
  }
  function share() {
    try { const url = new URL(window.location.href); url.hash = new URLSearchParams({ code: encodeSnippet(active.code), mode: active.mode }).toString(); setShareURL(url.href); setModal('share'); }
    catch (error) { notify(error instanceof Error ? error.message : String(error)); }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); notify('Copied to clipboard'); } catch { notify('Select the text and copy it manually; clipboard access is unavailable.'); } }
  function clearResult() { setResults(previous => { const next = { ...previous }; delete next[active.id]; return next; }); }
  function resetFile() { editCode(lesson?.starter ?? example?.code ?? (active.mode === 'program' ? programStarter : proofStarter)); clearResult(); setModal(null); }
  const visiblePersonalFiles = personalFiles.filter(file => file.title.toLowerCase().includes(search.toLowerCase()));
  const availableLessons = lessons.filter(lesson => !filterSafari || !safariLimitedLessons.has(lesson.id));
  const visibleExamples = examples.filter(example => (!filterSafari || !safariLimitedExamples.has(example.id)) && `${example.title} ${example.description} ${example.category}`.toLowerCase().includes(search.toLowerCase()));

  return <div ref={shellRef} data-hydrated={hydrated} data-panel={mobilePanel} style={{ '--sidebar-width': `${layout.sidebarWidth}px`, '--guide-width': `${layout.guideWidth}px`, '--reading-size': `${layout.fontSize}px` } as CSSProperties} className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${guideOpen ? '' : 'guide-collapsed'} ${consoleOpen ? '' : 'console-collapsed'} ${drawerOpen ? 'drawer-open' : ''}`}>
    <header className="topbar"><button ref={menuRef} className="icon-button navigation-toggle" aria-label="Open navigation" aria-expanded={mobile ? drawerOpen : sidebarOpen} onClick={() => setSidebarOpen(mobile ? !drawerOpen : !sidebarOpen)}><Menu size={18} /></button>
      <button className="brand" onClick={() => changeView('examples')} aria-label="Lean Lab examples"><span className="brand-mark">λ</span><span>lean<span className="brand-lab">lab</span></span></button>
      <div className="topbar-right"><a className="docs-link" href="https://lean-lang.org/documentation/" target="_blank" rel="noreferrer">Lean docs<ExternalLink size={12} /></a></div>
    </header>
    <div className="workspace-body">
      {mobile && drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <div ref={navigationRef} className="navigation-pane" role={mobile && drawerOpen ? 'dialog' : undefined} aria-modal={mobile && drawerOpen ? true : undefined} aria-label={mobile ? 'Navigation' : undefined} inert={mobile && !drawerOpen}>
      <nav className="activity-rail" aria-label="Main navigation"><div>{(['examples', 'playground', 'learn', 'syntax'] as const).map(item => <button key={item} className={`rail-button ${navigationView === item ? 'selected' : ''}`} aria-current={navigationView === item ? 'page' : undefined} onClick={() => { changeView(item); if (!mobile) setSidebarOpen(true); }}>{item === 'examples' ? <BookOpenText size={21} /> : item === 'playground' ? <FileCode2 size={21} /> : item === 'learn' ? <GraduationCap size={22} /> : <Braces size={21} />}<span>{item === 'learn' ? 'Learn' : item === 'syntax' ? 'Syntax' : item === 'examples' ? 'Examples' : 'Playground'}</span></button>)}</div><div><button className="rail-button" aria-label="Settings" onClick={() => { setDrawerOpen(false); setModal('settings'); }}><Settings2 size={20} /><span>Settings</span></button></div></nav>
      <aside className="explorer">
        <div className="explorer-heading"><span>{view === 'examples' ? 'EXAMPLES' : view === 'playground' ? 'PLAYGROUND' : navigationView === 'learn' ? 'LESSONS' : 'QUICK REFERENCE'}</span><button className="icon-button" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={15} /></button></div>
        <label className="search-field"><Search size={14} /><input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'syntax' ? 'Find syntax…' : navigationView === 'learn' ? 'Find a lesson…' : view === 'playground' ? 'Find a file…' : 'Find an example…'} aria-label="Search examples, lessons, or syntax" /><kbd>⌘ K</kbd></label>
        {safari && (view === 'examples' || navigationView === 'learn') && <SafariFilter checked={hideSafariLimited} onChange={setHideSafariLimited} />}
        <div className="explorer-scroll">
          {view === 'examples' && <>{[...new Set(examples.map(example => example.category))].map(category => {
            const group = visibleExamples.filter(example => example.category === category);
            return group.length > 0 && <details className="example-group" key={`${category}-${!!search}`} open={!!search || ['Getting started', 'Programs', 'Proofs'].includes(category) || group.some(example => example.id === active.exampleId)}><summary className="group-heading"><ChevronRight size={13} />{category === 'Getting started' ? <Sparkles size={14} /> : category === 'Programs' ? <Terminal size={14} /> : <ShieldCheck size={14} />}<span>{category}</span><small>{group.length}</small></summary>{group.map(example => <button key={example.id} className={`example-item ${hasActive && active.exampleId === example.id ? 'selected' : ''}`} onClick={() => openExample(example)}><span className="lean-file-icon">λ</span><span>{example.title}</span>{safari && safariLimitedExamples.has(example.id) && <SafariBadge />}</button>)}</details>;
          })}{!visibleExamples.length && <p className="empty-search">No examples match “{search}”.</p>}<div className="explorer-footnote"><span className="tiny-dot" />{filterSafari ? `${visibleExamples.length} of ${examples.length}` : examples.length} examples · checked in Lean</div></>}
          {view === 'playground' && <><div className="my-files-heading"><FolderOpen size={15} /><span>My files</span><small>{personalFiles.length}</small><button className="icon-button" aria-label="Create file in My files" title="New Lean file" onClick={() => createFile()}><Plus size={15} /></button></div>{visiblePersonalFiles.map(file => <div className={`personal-file ${hasActive && activeId === file.id ? 'selected' : ''}`} key={file.id}><button className="personal-file-name" onClick={() => openFile(file)} title={file.title}><span className="lean-file-icon">λ</span><span>{file.title}</span></button><details className="file-menu"><summary aria-label={`Actions for ${file.title}`} title="File actions">···</summary><div><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); renameFile(file); }}><Pencil size={13} />Rename</button><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); download(file); }}><ArrowDownToLine size={13} />Download</button><button disabled={runningId === file.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setFileTarget(file); setModal('delete'); }}><Trash2 size={13} />Delete</button></div></details></div>)}{!personalFiles.length ? <div className="files-empty"><p>No files yet.</p><p>Create a file or copy an example to Playground.</p><button className="text-button" onClick={() => createFile()}><Plus size={13} />New file</button></div> : !visiblePersonalFiles.length && <p className="empty-search">No files match “{search}”.</p>}<p className="files-storage-note">Saved on this device. Closing a tab keeps your file here.</p></>}
          {navigationView === 'learn' && lessonTracks.filter(track => availableLessons.some(lesson => lesson.track === track)).map(track => <div className="example-group" key={track}><div className="group-heading"><GraduationCap size={13} /><span>{track}</span></div>{availableLessons.filter(lesson => lesson.track === track && `${lesson.title} ${lesson.description}`.toLowerCase().includes(search.toLowerCase())).map(lesson => <button className="example-item" key={lesson.id} onClick={() => openLesson(lesson)}>{completed.includes(lesson.id) ? <CircleCheck size={15} className="success-color" /> : <span className="lesson-small-number">{lessons.indexOf(lesson) + 1}</span>}<span>{lesson.title}</span>{safari && safariLimitedLessons.has(lesson.id) && <SafariBadge />}</button>)}</div>)}
          {view === 'syntax' && <><div className="section-label">BROWSE TOPICS</div>{['All', 'Declarations', 'Types', 'Functions', 'Programs', 'Proofs', 'Symbols'].map(group => <button key={group} className={`reference-nav ${referenceGroup === group ? 'selected' : ''}`} onClick={() => { setReferenceGroup(group); setDrawerOpen(false); }}><Braces size={14} />{group === 'All' ? 'All syntax' : group}<span>{group === 'All' ? syntax.length : syntax.filter(item => item.group === group).length}</span></button>)}<div className="reference-tip"><Keyboard size={19} /><h4>Unicode input</h4><p>In the editor, type <code>\to</code> and accept the suggestion to insert <code>→</code>.</p></div></>}
        </div>
        {view === 'examples' && <button className="sidebar-bridge" onClick={() => changeView('playground')}><FolderOpen size={17} /><span><strong>Playground</strong><small>Create and manage files</small></span><ArrowRight size={14} /></button>}
        {view === 'playground' && <button className="sidebar-bridge" onClick={() => changeView('examples')}><BookOpenText size={17} /><span><strong>Examples</strong><small>Browse programs and proofs</small></span><ArrowRight size={14} /></button>}
      </aside></div>
      {sidebarOpen && <ResizeHandle label="Resize explorer" value={layout.sidebarWidth} min={180} max={360} onChange={sidebarWidth => updateLayout({ sidebarWidth })} />}
      <main className={`main-area view-${view}`} inert={mobile && drawerOpen}>
        <div className={`workspace-heading ${editorVisible ? 'editor-heading' : ''}`}><div className="workspace-title"><button className="icon-button sidebar-toggle" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={18} /></button><div><h1>{viewTitles[view]}</h1></div></div><div className="heading-actions">{editorVisible && hasActive ? <><span className="local-save"><CheckCheck size={14} />{saveState}</span><button className="button button-quiet" onClick={share}><ExternalLink size={14} />Share</button></> : navigationView === 'learn' ? <span className="small-pill"><GraduationCap size={14} />{completed.length} / {lessons.length} lessons</span> : null}</div></div>
        {editorVisible && !hasActive ? <div className="workspace-empty"><div className="empty-file-icon"><FileCode2 size={34} /></div><h2>{view === 'playground' ? 'No file open' : 'No file open'}</h2><p>{view === 'playground' ? 'Create a Lean file or reopen one from My files.' : 'Open a file from the sidebar to keep going.'}</p><button className="button button-primary" onClick={() => createFile()}><Plus size={15} />New Lean file</button><button className="text-button" onClick={() => changeView('examples')}>Browse examples <ArrowRight size={13} /></button></div> : editorVisible ? <div className="editor-workspace"><section className="editor-column" aria-label="Editor workspace">
          <EditorToolbar active={active} tabs={tabs} mobile={mobile} busy={busy} guideOpen={guideOpen} guideTab={guideTab} consoleOpen={consoleOpen}
            onSelect={id => { setActiveId(id); setMobilePanel('code'); }} onClose={closeFile} onCreate={() => createFile()} onRun={mode => void runCurrent(mode)} onStop={lean.stop}
            onGuide={toggleGuide} onOutput={() => updateLayout({ consoleOpen: !consoleOpen })} onShare={share} onRename={() => renameFile(active)} onCopy={() => createFile(active)} onDownload={() => download()} onReset={() => setModal('reset')}
            onMode={mode => setFiles(previous => previous.map(file => file.id === active.id ? { ...file, mode } : file))} />
          {!compilerInfoHidden && <div className="compiler-info" role="note" aria-label="Lean compiler download"><div><strong>Lean runs on your device</strong><p>First use downloads the Lean compiler (~46 MB). It runs as WebAssembly in your browser; your code is not uploaded. The download is cached for later runs.</p></div><button className="icon-button" aria-label="Dismiss compiler information" onClick={() => setCompilerInfoHidden(true)}><X size={15} /></button></div>}
          {safariLimited && <SafariNotice key={active.id} lesson={!!lesson} onRunLocally={() => { setGuideTab('run'); setGuideOpen(true); }} />}
          <div className="code-area"><LeanEditor id={active.id} value={active.code} onChange={editCode} theme={theme} fontSize={layout.fontSize} diagnostics={stale ? [] : result?.diagnostics ?? []} onCursor={(line, column) => setCursor({ line, column })} onReady={editorMounted} /></div>
          <div className="console-divider"><ResizeHandle label="Resize output panel" horizontal reverse value={consoleHeight} min={100} max={420} onChange={consoleHeight => updateLayout({ consoleHeight })} /></div>
          <section className="console" aria-label="Lean execution results" style={{ height: consoleHeight }}><div className="console-tabs"><div role="tablist" aria-label="Output panels"><button role="tab" aria-selected={consoleTab === 'output'} className={consoleTab === 'output' ? 'active' : ''} onClick={() => setConsoleTab('output')}><Terminal size={14} />Output</button><button role="tab" aria-selected={consoleTab === 'problems'} className={consoleTab === 'problems' ? 'active' : ''} onClick={() => setConsoleTab('problems')}>Problems<span className={`problem-count ${result?.diagnostics.length ? 'has-problems' : ''}`}>{result?.diagnostics.length ?? 0}</span></button></div><div className="console-actions">{result && <span className={`result-status ${result.success && !result.incomplete ? 'success-color' : 'warning-color'}`}>{stale ? 'Code changed' : result.success ? result.incomplete ? 'Incomplete' : 'Finished' : 'Check failed'}<span>·</span>{Math.round(result.elapsed)} ms</span>}<button className="icon-button" aria-label="Clear output" title="Clear output" disabled={busy} onClick={clearResult}><Trash2 size={13} /></button><button className="icon-button close-output" aria-label="Collapse output" onClick={() => { updateLayout({ consoleOpen: false }); setMobilePanel('code'); }}><X size={14} /></button></div></div>
            <div className="console-content" role="tabpanel" aria-live="polite">{runningId === active.id ? <div className="runtime-loading"><LoaderCircle size={21} className="spin" /><div><strong>{lean.progress}</strong><p>{lean.state !== 'loading' ? 'Lean is running on your device. Your code stays in this browser.' : lean.download && lean.download.cached > 0 && lean.download.received === 0 ? 'Loading compiler files already stored on this device. No compiler data downloaded so far.' : lean.download && lean.download.received > 0 ? 'Downloading the Lean compiler to run as WebAssembly on your device. Your code is not uploaded.' : 'Checking this device for saved compiler files. Missing compiler data will be downloaded.'}</p>{lean.download ? <div className="download-status"><div><span>{compilerTransferLabel(lean.download)}</span><span>{(lean.download.total / 1_000_000).toFixed(1)} MB total</span></div><progress aria-label="Lean compiler data loaded" max={lean.download.total} value={lean.download.received + lean.download.cached} /></div> : <div className="indeterminate-progress" />}</div></div>
            : currentResult?.error ? <RuntimeError message={currentResult.error} onRetry={() => void runCurrent(active.mode)} onRunLocally={() => { setGuideTab('run'); setGuideOpen(true); }} />
            : consoleTab === 'problems' ? result?.diagnostics.length ? <div className="diagnostics">{result.diagnostics.map((diagnostic, index) => <button key={index} className={`diagnostic ${diagnostic.severity}`} onClick={() => { setMobilePanel('code'); requestAnimationFrame(() => editorRef.current?.focusAt(diagnostic.line, diagnostic.column)); }}><CircleAlert size={15} /><div><span>{diagnostic.line > active.code.split('\n').length ? 'Exercise / entry-point check' : `${active.title}:${diagnostic.line}:${diagnostic.column}`}</span><pre>{diagnostic.message}</pre></div></button>)}</div> : <div className="empty-console"><ShieldCheck size={24} /><div><strong>{result ? 'No problems found' : 'No diagnostics yet'}</strong><p>{result ? 'Lean checked this version without diagnostics.' : 'Run or check your code to see Lean’s diagnostics.'}</p></div></div>
            : result ? <div className="actual-output">{stale && <p className="stale-note">Results from the previous version. Run again to check your edits.</p>}{result.output.map((line, index) => <pre className={line.stream === 'stderr' ? 'stderr' : ''} key={index}>{line.text}</pre>)}{!result.output.length && <p className={result.success ? 'success-color' : 'warning-color'}>{result.success ? result.incomplete ? 'File accepted with an unfinished proof. See Problems.' : 'File checked successfully.' : 'Lean found a problem. See the Problems tab.'}</p>}{result.success && <div className="execution-footer"><Check size={12} />{currentResult.mode === 'program' ? 'Program evaluated in Lean WebAssembly' : 'Checked by Lean WebAssembly'}</div>}</div>
            : <div className="empty-console"><Terminal size={25} /><div><strong>No output yet</strong><p>{active.mode === 'program' ? <>Run your program to see its output here. <kbd>⌘ ↵</kbd></> : 'Check this file to see results and diagnostics here.'}</p><span className="first-run-note">First use downloads the Lean compiler (~46 MB). It runs as WebAssembly on your device; your code is not uploaded. The download is cached.</span></div></div>}{runningId !== active.id && result && result.compilerDownload !== undefined && <p className="compiler-transfer-summary" aria-label="Compiler transfer">{compilerTransferSummary(result.compilerDownload)}</p>}</div>
          </section></section>
          {guideOpen && <ResizeHandle label="Resize guide" reverse value={layout.guideWidth} min={240} max={440} onChange={guideWidth => updateLayout({ guideWidth })} />}
          <Guide safari={safari} availableLessons={availableLessons} tab={guideTab} onTabChange={toggleGuide} key={active.id} file={active} example={example} lesson={lesson} complete={!!lesson && completed.includes(lesson.id)} onClose={() => setGuideOpen(false)} onExample={openExample} onLesson={openLesson} onLearn={() => changeView('learn')} onSyntax={() => changeView('syntax')} onDownload={() => download()} onEdit={editCode} />
        </div> : view === 'learn'  ? <LearnPage safari={safari} hideSafariLimited={hideSafariLimited} onFilterChange={setHideSafariLimited} availableLessons={availableLessons} completed={completed} search={search} onLesson={openLesson} /> : <SyntaxPage search={search} group={referenceGroup} onOpen={openSyntax} onClear={() => { setSearch(''); setReferenceGroup('All'); }} />}
        {editorVisible && hasActive && <nav className="mobile-panels" aria-label="Workspace panels">{(['code', 'output', 'guide'] as const).map(panel => <button key={panel} aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>{panel === 'code' ? <FileCode2 size={16} /> : panel === 'output' ? <Terminal size={16} /> : <BookOpenText size={16} />}<span>{panel === 'code' ? 'Code' : panel === 'output' ? 'Output' : 'Guide'}</span>{panel === 'output' && !!result?.diagnostics.length && <small>{result.diagnostics.length}</small>}</button>)}</nav>}
      </main>
    </div>
    <footer className="statusbar"><div><span className={`runtime-dot ${lean.state === 'ready' ? 'ready' : ''}`} /><span>{lean.download ? `Lean · ${compilerTransferLabel(lean.download)} / ${(lean.download.total / 1_000_000).toFixed(1)} MB` : lean.state === 'loading' ? lean.progress : lean.state === 'running' ? 'Running…' : lean.state === 'error' ? 'Runtime needs retry' : lean.state === 'ready' ? 'Lean ready · runs on your device' : 'Runs locally in your browser'}</span>{lean.download && <progress className="status-download" aria-label="Lean compiler data loaded" max={lean.download.total} value={lean.download.received + lean.download.cached} />}{lean.state === 'loading' && !busy && <button className="status-stop" onClick={lean.stop}>Stop</button>}</div><div><span className="status-save">{saveState}</span><span className="status-version">{lean.version}</span><span className="status-divider" /><span>Ln {cursor.line}, Col {cursor.column}</span><span className="status-encoding">UTF-8</span><span className="status-language">Lean</span></div></footer>
    {toast && <div className="toast" role="status"><CircleCheck size={16} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={13} /></button></div>}
    <dialog ref={dialogRef} className="modal" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}><div className="modal-content"><button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setModal(null)}><X size={18} /></button>{modal === 'share' ? <><div className="modal-icon"><ExternalLink size={22} /></div><h2>Share a little Lean.</h2><p>This link contains a copy of your current file. Anyone with the link can open and run it.</p><label className="field-label" htmlFor="share-url">Link to {active.title}</label><div className="share-input"><input id="share-url" value={shareURL} readOnly onFocus={event => event.target.select()} /><button className="button button-primary" onClick={() => copy(shareURL)}><Copy size={14} />Copy</button></div><p className="modal-footnote">Later edits do not change this link.</p></> : modal === 'reset' ? <><div className="modal-icon"><RotateCcw size={22} /></div><h2>Reset file?</h2><p>This replaces your edits in {active.title} with {lesson ? 'the exercise starter' : example ? 'the original example' : 'the starter for this file’s mode'}. You can download your current version first.</p><div className="modal-buttons"><button className="button button-quiet" onClick={() => download()}>Download current file</button><button className="button button-primary" onClick={resetFile}>Reset file</button></div></> : modal === 'create' || modal === 'rename' ? <form onSubmit={event => { event.preventDefault(); submitFile(); }}><div className="modal-icon"><FileCode2 size={22} /></div><h2>{modal === 'rename' ? 'Rename file' : fileTarget ? 'Copy to Playground' : 'New Lean file'}</h2><p>{modal === 'rename' ? 'Enter a new file name.' : fileTarget ? 'Save a copy in My files.' : 'Choose a file name and template.'}</p><label className="field-label" htmlFor="file-name">File name</label><input className="file-name-input" id="file-name" autoFocus value={nameInput} onChange={event => { setNameInput(event.target.value); setNameError(''); }} aria-describedby={nameError ? 'file-name-error' : undefined} aria-invalid={!!nameError} autoComplete="off" spellCheck={false} />{nameError && <p id="file-name-error" className="field-error" role="alert">{nameError}</p>}{modal === 'create' && !fileTarget && <div className="file-templates"><button type="button" className={newMode === 'program' ? 'selected' : ''} onClick={() => setNewMode('program')}><Terminal size={18} /><strong>Program</strong><small>Run main and print output</small></button><button type="button" className={newMode === 'check' ? 'selected' : ''} onClick={() => setNewMode('check')}><ShieldCheck size={18} /><strong>Proof / expressions</strong><small>Check proofs and use #eval</small></button></div>}<div className="modal-buttons"><button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary">{modal === 'rename' ? 'Rename file' : 'Create file'}<ArrowRight size={13} /></button></div></form> : modal === 'delete' ? <><div className="modal-icon"><Trash2 size={22} /></div><h2>Delete {fileTarget?.title}?</h2><p>This removes the file from My files on this device. Download a copy first if you want to keep it.</p><div className="modal-buttons"><button className="button button-quiet" onClick={() => fileTarget && download(fileTarget)}>Download file</button><button className="button button-danger" onClick={deleteFile} disabled={fileTarget?.id === runningId}>Delete file</button></div></> : modal === 'progress' ? <><div className="modal-icon"><RotateCcw size={22} /></div><h2>Reset lesson progress?</h2><p>Your {completed.length} completed lessons will be marked as unfinished. Your code and files will stay saved.</p><div className="modal-buttons"><button className="button button-quiet" onClick={() => setModal('settings')}>Keep progress</button><button className="button button-primary" onClick={() => { setCompleted([]); setModal('settings'); notify('Lesson progress reset. Your files are still saved.'); }}>Reset progress</button></div></> : <><div className="modal-icon"><Settings2 size={22} /></div><h2>Settings</h2><div className="settings-section"><h3>Appearance</h3><div className="appearance-options">{(['light', 'dark', 'system'] as const).map(option => <button key={option} className={appearance === option ? 'selected' : ''} onClick={() => setAppearance(option)}>{option === 'light' ? <Sun size={20} /> : option === 'dark' ? <Moon size={20} /> : <Monitor size={20} />}<span>{option}</span>{appearance === option && <Check size={13} />}</button>)}</div></div><div className="settings-section"><h3>Editor layout</h3><label className="editor-font-setting">Editor and guide text size <span>{layout.fontSize}px</span><input aria-label="Editor and guide text size" type="range" min={layoutLimits.fontSize[0]} max={layoutLimits.fontSize[1]} value={layout.fontSize} onChange={event => updateLayout({ fontSize: Number(event.target.value) })} /></label><button className="button button-quiet" onClick={() => { resetLayout(); setMobilePanel('code'); notify('Editor layout reset.'); }}><RotateCcw size={13} />Reset layout</button></div><div className="settings-section"><h3>Lesson progress</h3><p>{completed.length} of {lessons.length} lessons completed on this device.</p>{completed.length > 0 && <div className="completed-lessons">{lessons.filter(lesson => completed.includes(lesson.id)).map(lesson => <div key={lesson.id}><span><CircleCheck size={13} />{lesson.title}</span><button className="text-button" onClick={() => { setCompleted(previous => previous.filter(id => id !== lesson.id)); notify(`${lesson.title} marked as unfinished`); }}>Reset</button></div>)}</div>}<button className="button button-quiet reset-progress" disabled={!completed.length} onClick={() => setModal('progress')}><RotateCcw size={13} />Reset all lesson progress</button></div><div className="settings-section"><h3>Keyboard shortcuts</h3><div className="shortcut-row"><span>Run current file</span><kbd>⌘ / Ctrl + Enter</kbd></div><div className="shortcut-row"><span>Search the current section</span><kbd>⌘ / Ctrl + K</kbd></div><div className="shortcut-row"><span>Save workspace</span><kbd>Automatic</kbd></div><div className="shortcut-row"><span>Insert a Unicode symbol</span><kbd>\to + Enter</kbd></div></div><div className="settings-section"><h3>Support leanlab</h3><p>Donate Zcash to support the project.</p><label className="field-label" htmlFor="donation-address">Zcash (ZEC) donation address</label><input id="donation-address" className="donation-address" readOnly value={zcashAddress} onFocus={event => event.target.select()} /><button className="button button-quiet" onClick={() => copy(zcashAddress)}><Copy size={13} />Copy Zcash address</button></div><div className="settings-section"><h3>About this workspace</h3><p>The first use downloads the Lean compiler and core library (~46 MB), then caches them. Lean 4.33.0-pre runs as WebAssembly on your device; your code is not uploaded. Files are independent; Mathlib and custom imports aren’t bundled. A desktop browser is recommended.</p><a className="text-link" href="https://github.com/cauli/lean4-wasm-in-browser" target="_blank" rel="noreferrer">Powered by the community’s Lean WASM runtime <ExternalLink size={12} /></a></div></>}</div></dialog>
  </div>;
}
