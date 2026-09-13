import type { ExecutionMode } from './content';

export interface OpenFile {
  id: string;
  title: string;
  code: string;
  mode: ExecutionMode;
  exampleId?: string;
  lessonId?: string;
}
export interface SavedWorkspace { files: OpenFile[]; openIds: string[]; activeId: string }
export const workspaceKey = 'lean-lab-workspace-v2';
export const legacyWorkspaceKey = 'lean-lab-workspace-v1';
export const completedKey = 'lean-lab-lessons-v1';
export const programStarter = 'def main : IO Unit := do\n  IO.println "Hello, Lean!"\n';
export const proofStarter = '-- State a proposition and prove it.\nexample : 2 + 2 = 4 := by\n  rfl\n';
export const isPersonalFile = (file: OpenFile) => !file.exampleId && !file.lessonId;

// Version 1 treated the tab list as the file store. Migrate every surviving
// draft; version 2 keeps closed files in the store and tracks tabs separately.
export function restoreWorkspace(value: unknown): SavedWorkspace | null {
  if (!value || typeof value !== 'object' || !('files' in value) || !Array.isArray(value.files)) return null;
  const saved = value as Record<string, unknown>;
  const ids = new Set<string>();
  const files: OpenFile[] = [];
  for (const item of value.files) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || typeof item.title !== 'string' || typeof item.code !== 'string'
      || !['program', 'check'].includes(item.mode)) continue;
    ids.add(item.id);
    files.push({ id: item.id, title: item.title, code: item.code, mode: item.mode,
      ...(typeof item.exampleId === 'string' ? { exampleId: item.exampleId } : {}),
      ...(typeof item.lessonId === 'string' ? { lessonId: item.lessonId } : {}) });
  }
  const openIds = Array.isArray(saved.openIds)
    ? [...new Set(saved.openIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))]
    : files.map(file => file.id);
  const activeId = typeof saved.activeId === 'string' && openIds.includes(saved.activeId)
    ? saved.activeId : openIds.at(-1) ?? '';
  return { files, openIds, activeId };
}

export function fileName(input: string, files: OpenFile[], exceptId?: string): string {
  const trimmed = input.trim();
  const title = trimmed.endsWith('.lean') ? trimmed : `${trimmed}.lean`;
  if (!trimmed || title.length > 100 || !/^[\p{L}_][\p{L}\p{N}_.-]*\.lean$/u.test(title)) {
    throw new Error('Start with a letter. Use letters, numbers, underscores, dots or hyphens (up to 100 characters).');
  }
  if (files.some(file => isPersonalFile(file) && file.id !== exceptId && file.title.toLowerCase() === title.toLowerCase())) {
    throw new Error('A file with this name already exists in My files.');
  }
  return title;
}

export function availableName(base: string, files: OpenFile[]): string {
  const stem = base.replace(/\.lean$/, '').replace(/[^\p{L}\p{N}_.-]/gu, '_') || 'Untitled';
  for (let i = 0; ; i++) {
    const candidate = `${stem}${i ? `_${i + 1}` : ''}.lean`;
    if (!files.some(file => isPersonalFile(file) && file.title.toLowerCase() === candidate.toLowerCase())) return candidate;
  }
}

export function closeTab(workspace: SavedWorkspace, id: string): SavedWorkspace {
  const openIds = workspace.openIds.filter(openId => openId !== id);
  return { ...workspace, openIds, activeId: workspace.activeId === id ? openIds.at(-1) ?? '' : workspace.activeId };
}
