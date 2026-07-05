import { expect, Locator, Page, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const findPdfFixture = () => {
  const explicitPath = process.env.SMART_PDF_TEST_FILE;
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

  const candidates = [
    'E:\\Downloads',
    path.join(os.homedir(), 'Downloads'),
  ];

  for (const folder of candidates) {
    if (!fs.existsSync(folder)) continue;
    const pdf = fs.readdirSync(folder)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(folder, file))
      .filter(file => fs.statSync(file).isFile())
      .sort((a, b) => fs.statSync(a).size - fs.statSync(b).size)
      .find(file => fs.statSync(file).size > 0);

    if (pdf) return pdf;
  }

  return null;
};

const uploadPdf = async (page: Page, pdfPath: string) => {
  await page.goto('/');
  await page.getByLabel('New project PDF').setInputFiles(pdfPath);

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const pageLayer = page.getByTestId('pdf-hit-layer');
  await expect(pageLayer).toBeVisible();

  await expect.poll(async () => {
    const size = await canvas.evaluate(node => ({
      width: (node as HTMLCanvasElement).width,
      height: (node as HTMLCanvasElement).height,
    }));
    return size.width > 100 && size.height > 100;
  }).toBe(true);

  return { canvas, pageLayer };
};

const createMultipagePdfFixture = async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Multipage navigation fixture - page ${pageNumber}`, {
      x: 72,
      y: 760,
      size: 20,
      font,
      color: rgb(0.05, 0.09, 0.11),
    });
    page.drawText(`This page exists to verify annotations stay scoped to page ${pageNumber}.`, {
      x: 72,
      y: 720,
      size: 12,
      font,
      color: rgb(0.25, 0.3, 0.35),
    });
  }

  const pdfPath = path.join(os.tmpdir(), `smart-pdf-tagger-multipage-${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, await pdf.save());
  return pdfPath;
};

const drawRegion = async (page: Page, pageLayer: Locator, offset = 0) => {
  const pageBox = await pageLayer.boundingBox();
  expect(pageBox).not.toBeNull();
  expect(pageBox!.width).toBeGreaterThan(100);
  expect(pageBox!.height).toBeGreaterThan(100);

  const startX = pageBox!.x + Math.min(120 + offset, pageBox!.width - 240);
  const startY = pageBox!.y + Math.min(120 + offset, pageBox!.height - 160);
  const endX = startX + Math.min(180, pageBox!.width * 0.25);
  const endY = startY + Math.min(90, pageBox!.height * 0.15);

  await page.mouse.move(startX, startY);
  await expect.poll(async () => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid'), [startX, startY])).toBe('pdf-hit-layer');
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 8 });
  await page.mouse.up();
};

test.describe('PDF annotation workflow', () => {
  test('navigates a multipage PDF and keeps annotations scoped to their page', async ({ page }) => {
    const pdfPath = await createMultipagePdfFixture();

    const { pageLayer } = await uploadPdf(page, pdfPath);

    const currentPageInput = page.getByLabel('Current page');
    await expect(currentPageInput).toHaveValue('1');
    await expect(page.getByLabel('Page count')).toHaveText('/ 3');
    await expect(page.getByLabel('Page navigator')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to page 1' })).toContainText('0 regions');
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toContainText('0 regions');
    await expect(page.getByRole('button', { name: 'Go to page 3' })).toContainText('0 regions');
    await expect(page.getByRole('button', { name: 'Previous Page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next Page' })).toBeEnabled();

    await page.getByRole('button', { name: 'Next Page' }).click();
    await expect(currentPageInput).toHaveValue('2');

    await drawRegion(page, pageLayer);
    await page.getByPlaceholder('e.g. Invoice Total').fill('Page Two Region');
    await page.getByPlaceholder('Optional details...').fill('Only visible on page two.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('[data-testid="region-box"][data-region-page="2"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Go to page 2' })).toContainText('1 region');
    await expect(page.getByText('PAGE 2')).toBeVisible();

    await page.getByRole('button', { name: 'Previous Page' }).click();
    await expect(currentPageInput).toHaveValue('1');
    await expect(page.locator('[data-testid="region-box"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Go to page 3' }).click();
    await expect(currentPageInput).toHaveValue('3');
    await expect(page.getByRole('button', { name: 'Go to page 3' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(currentPageInput).toHaveValue('2');
    await page.keyboard.press('PageDown');
    await expect(currentPageInput).toHaveValue('3');
    await page.keyboard.press('PageUp');
    await expect(currentPageInput).toHaveValue('2');
    await expect(page.locator('[data-testid="region-box"][data-region-label="Page Two Region"]')).toHaveCount(1);

    await currentPageInput.fill('99');
    await currentPageInput.press('Enter');
    await expect(currentPageInput).toHaveValue('3');
    await expect(page.getByRole('button', { name: 'Next Page' })).toBeDisabled();

    await currentPageInput.fill('0');
    await currentPageInput.press('Enter');
    await expect(currentPageInput).toHaveValue('1');

    const saveAsDialog = page.waitForEvent('dialog');
    await page.evaluate(() => {
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('[aria-label="Save As Project JSON"]')?.click();
      }, 0);
    });
    const dialog = await saveAsDialog;
    const downloadPromise = page.waitForEvent('download');
    await dialog.accept('multipage-project');
    const download = await downloadPromise;
    const jsonPath = await download.path();
    expect(jsonPath).toBeTruthy();

    const project = JSON.parse(fs.readFileSync(jsonPath!, 'utf8'));
    const activeVersion = project.versions.find((version: any) => version.id === project.activeVersionId);
    expect(activeVersion.boxes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Page Two Region', page: 2 }),
    ]));

    fs.rmSync(pdfPath, { force: true });
  });

  test('loads a real PDF, creates a commented region, and opens export options', async ({ page }) => {
    const pdfPath = findPdfFixture();
    test.skip(!pdfPath, 'No PDF fixture found in Downloads. Set SMART_PDF_TEST_FILE to run this test.');

    const { pageLayer } = await uploadPdf(page, pdfPath!);
    await expect(page.getByText('Regions (0)')).toBeVisible();

    await drawRegion(page, pageLayer);
    await expect(page.getByTitle('Resize region')).toHaveCount(4);

    await page.getByPlaceholder('e.g. Invoice Total').fill('Smoke Region');
    await page.getByPlaceholder('Optional details...').fill('Browser smoke comment');
    await page.getByPlaceholder('finance, urgent, review').fill('smoke, pdf');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('Regions (1)')).toBeVisible();
    await expect(page.getByTitle('Smoke Region')).toBeVisible();
    await expect(page.getByText('Browser smoke comment')).toBeVisible();

    await page.getByRole('button', { name: 'Keyboard Shortcuts' }).click();
    await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible();
    await expect(page.getByText('Copy selected region')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    const saveAsDialog = page.waitForEvent('dialog');
    await page.evaluate(() => {
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('[aria-label="Save As Project JSON"]')?.click();
      }, 0);
    });
    const dialog = await saveAsDialog;
    expect(dialog.type()).toBe('prompt');
    const saveAsDownloadPromise = page.waitForEvent('download');
    await dialog.accept('browser-smoke-project');
    const saveAsDownload = await saveAsDownloadPromise;
    expect(saveAsDownload.suggestedFilename()).toBe('browser-smoke-project.json');

    await page.getByRole('button', { name: 'Export PDF with Annotations' }).click();
    await expect(page.getByRole('heading', { name: 'Export Options' })).toBeVisible();
    await expect(page.getByLabel('Include labels')).toBeChecked();
    await expect(page.getByLabel('Include comments')).toBeChecked();
    await expect(page.getByLabel('Include colors')).toBeChecked();
    const exportDialog = page.getByRole('heading', { name: 'Export Options' }).locator('..').locator('..');
    await expect(exportDialog.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });

  test('edits settings and templates, exports CSV, and creates a copied version', async ({ page }) => {
    const pdfPath = findPdfFixture();
    test.skip(!pdfPath, 'No PDF fixture found in Downloads. Set SMART_PDF_TEST_FILE to run this test.');

    const { pageLayer } = await uploadPdf(page, pdfPath!);

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Client').fill('Smoke Client');
    await page.getByLabel('Document type').fill('Invoice');
    await page.getByLabel('Project status').selectOption('Review');
    await page.getByLabel('Reviewer').fill('QA Reviewer');
    await page.getByLabel('Duplicate label rule').selectOption('PAGE_BLOCK');

    await page.getByTitle('Add field').click();
    await page.getByLabel('Template schema').fill('Smoke Schema');
    await page.getByLabel('Template label').fill('Smoke Amount');
    await page.getByLabel('Template description').fill('Total value found during smoke testing.');
    await page.getByLabel('Template tags').fill('smoke, amount');
    await page.getByLabel('Template repeatable').check();
    const templateDownloadPromise = page.waitForEvent('download');
    await page.getByTitle('Export templates').click();
    const templateDownload = await templateDownloadPromise;
    expect(templateDownload.suggestedFilename()).toBe('smart-pdf-tagger-templates.json');

    await page.getByLabel('Import templates JSON').setInputFiles({
      name: 'imported-templates.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{
        id: 'imported.amount',
        templateName: 'Imported Schema',
        label: 'Imported Amount',
        description: 'Imported from a portable template file.',
        tags: ['imported', 'amount'],
        color: '#10b981',
        repeatable: true,
      }])),
    });
    await expect(page.getByLabel('Template field')).toContainText('Imported Schema / Imported Amount');
    await page.getByRole('button', { name: 'Done' }).click();

    await drawRegion(page, pageLayer, 40);
    await page.getByLabel('Apply template').selectOption({ label: 'Imported Amount (repeatable)' });
    await expect(page.getByPlaceholder('e.g. Invoice Total')).toHaveValue('Imported Amount');
    await expect(page.getByPlaceholder('Optional details...')).toHaveValue('Imported from a portable template file.');
    await expect(page.getByPlaceholder('finance, urgent, review')).toHaveValue('imported, amount');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('Regions (1)')).toBeVisible();
    await expect(page.getByTitle('Imported Amount')).toBeVisible();

    await page.getByRole('button', { name: 'Export CSV' }).click();
    await page.getByRole('checkbox', { name: 'Color', exact: true }).check();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('heading', { name: 'Export Options' }).locator('..').locator('..').getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    const csvPath = await download.path();
    expect(csvPath).toBeTruthy();
    const csv = fs.readFileSync(csvPath!, 'utf8');
    expect(csv).toContain('"Label"');
    expect(csv).toContain('"Description"');
    expect(csv).toContain('"Color"');
    expect(csv).toContain('"Imported Amount"');
    expect(csv).toContain('"Imported from a portable template file."');

    page.once('dialog', dialog => dialog.accept());
    await page.getByLabel('New version PDF').setInputFiles(pdfPath!);
    await expect(page.getByText('Regions (1)')).toBeVisible();
    await expect(page.getByLabel('Project version')).toContainText(/v2 - /);
    await page.getByLabel('Version name').fill('Reviewed Smoke Version');
    await page.getByLabel('Version name').press('Enter');
    await expect(page.getByLabel('Project version')).toContainText('Reviewed Smoke Version');
  });

  test('blocks duplicate labels on a real PDF page', async ({ page }) => {
    const pdfPath = findPdfFixture();
    test.skip(!pdfPath, 'No PDF fixture found in Downloads. Set SMART_PDF_TEST_FILE to run this test.');

    const { pageLayer } = await uploadPdf(page, pdfPath!);

    await drawRegion(page, pageLayer, 0);
    await page.getByPlaceholder('e.g. Invoice Total').fill('Duplicate Label');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Regions (1)')).toBeVisible();

    await drawRegion(page, pageLayer, 80);
    await page.getByPlaceholder('e.g. Invoice Total').fill('duplicate label');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Label already exists on page 1.')).toBeVisible();
    await expect(page.getByTitle('Duplicate Label')).toHaveCount(1);
  });

  test('shows friendly errors for invalid project and template imports', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      Object.defineProperty(window, 'showOpenFilePicker', {
        configurable: true,
        value: undefined,
      });
    });

    await page.getByRole('button', { name: 'Open Project File' }).click();
    const invalidProjectDialog = page.waitForEvent('dialog');
    await page.getByLabel('Open project JSON').setInputFiles({
      name: 'invalid-project.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{'),
    });
    await expect((await invalidProjectDialog).message()).toBe('Project file is not valid JSON.');
    await (await invalidProjectDialog).accept();

    const pdfPath = findPdfFixture();
    test.skip(!pdfPath, 'No PDF fixture found in Downloads. Set SMART_PDF_TEST_FILE to run this test.');

    await page.getByLabel('New project PDF').setInputFiles(pdfPath!);
    await page.locator('canvas').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Import templates JSON').setInputFiles({
      name: 'invalid-templates.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[{}]'),
    });
    await expect(page.getByText('Template field 1 is missing a schema name.')).toBeVisible();
  });
});
