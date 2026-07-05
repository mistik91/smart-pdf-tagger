import { _electron as electron, expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('starts the Electron shell with a secure preload bridge', async () => {
  const app = await electron.launch({ args: ['dist-electron/main.js'] });
  const page = await app.firstWindow();

  await expect(page.getByRole('heading', { name: 'Smart PDF Tagger' })).toBeVisible();
  await expect(page.getByText('New Project from PDF')).toBeVisible();

  await expect.poll(() => page.evaluate(() => typeof window.electronAPI?.openProject)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof window.electronAPI?.openProjectPath)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof window.electronAPI?.saveProject)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof window.electronAPI?.saveProjectAs)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { require?: unknown }).require)).toBe('undefined');

  const targetPath = path.join(os.tmpdir(), `smart-pdf-tagger-electron-${Date.now()}.json`);
  const saveResult = await page.evaluate(async (filePath) => {
    return window.electronAPI!.saveProject({
      filePath,
      text: '{"ok":true}',
      suggestedName: 'project.json',
    });
  }, targetPath);

  expect(saveResult).toEqual({ canceled: false, filePath: targetPath });
  await expect.poll(async () => fs.readFile(targetPath, 'utf8')).toBe('{"ok":true}');

  const openPathResult = await page.evaluate(async (filePath) => {
    return window.electronAPI!.openProjectPath(filePath);
  }, targetPath);

  expect(openPathResult).toEqual({ canceled: false, filePath: targetPath, text: '{"ok":true}' });

  await fs.rm(targetPath, { force: true });
  await app.close();
});
