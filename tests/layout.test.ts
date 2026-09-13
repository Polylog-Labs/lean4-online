import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultLayout, restoreLayout } from '../lib/layout';

test('restores panel preferences without letting damaged storage hide the workspace', () => {
  assert.deepEqual(restoreLayout(null), defaultLayout);
  assert.deepEqual(restoreLayout({ sidebarWidth: 300, guideOpen: true, consoleOpen: false, fontSize: 15 }), { ...defaultLayout, sidebarWidth: 300, guideOpen: true, fontSize: 15 });
  const result = restoreLayout({ sidebarWidth: -999, guideWidth: 99999, fontSize: NaN, guideOpen: 'false', consoleHeight: Infinity });
  assert.equal(result.sidebarWidth, 180); assert.equal(result.guideWidth, 440);
  assert.equal(result.fontSize, defaultLayout.fontSize); assert.equal(result.guideOpen, false); assert.equal(result.consoleHeight, defaultLayout.consoleHeight);
});
