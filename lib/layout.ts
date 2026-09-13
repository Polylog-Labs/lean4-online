export const mobileMedia = '(max-width: 900px), (pointer: coarse)';
export const desktopMedia = '(min-width: 901px) and (pointer: fine)';
export const layoutKey = 'lean-lab-layout-v1';
export const defaultLayout = {
  sidebarOpen: true, guideOpen: false, consoleOpen: false,
  sidebarWidth: 220, guideWidth: 300, consoleHeight: 180, fontSize: 13,
};
export type Layout = typeof defaultLayout;
export const layoutLimits = {
  sidebarWidth: [180, 360], guideWidth: [240, 440], consoleHeight: [100, 420], fontSize: [11, 20],
} as const;
export function restoreLayout(value: unknown): Layout {
  const result = { ...defaultLayout };
  if (!value || typeof value !== 'object') return result;
  for (const key of ['sidebarOpen', 'guideOpen', 'consoleOpen'] as const) {
    if (key in value && typeof value[key as keyof typeof value] === 'boolean') result[key] = value[key as keyof typeof value];
  }
  for (const key of Object.keys(layoutLimits) as (keyof typeof layoutLimits)[]) {
    const number = (value as Record<string, unknown>)[key];
    if (typeof number === 'number' && Number.isFinite(number)) result[key] = Math.max(layoutLimits[key][0], Math.min(layoutLimits[key][1], number));
  }
  return result;
}
