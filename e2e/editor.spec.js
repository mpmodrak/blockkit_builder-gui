const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshots = path.join(__dirname, '..', 'docs', 'screenshots');

test.beforeAll(() => {
  fs.mkdirSync(screenshots, { recursive: true });
});

test('templates, editing, reorder, and JSON round-trip', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('heading', { name: 'Block Kit Builder' })).toBeVisible();
  await expect(page.getByText('This message is empty')).toBeVisible();
  await expect(page.getByTestId('payload-status')).toHaveText(/Valid payload/);

  await page.getByTestId('template-announcement').click();
  await expect(page.getByRole('heading', { name: 'Planning week starts Monday' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'draft goals are due Friday at 3:00pm ET' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Q2 planning' })).toHaveAttribute('href', 'https://example.com/planning');
  await expect(page.getByRole('listitem').filter({ hasText: 'Share one outcome you own' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I have a conflict' })).toBeVisible();

  await page.locator('[data-block-type="section"]').first().click();
  await expect(page.locator('#section-text')).toContainText('draft goals');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: path.join(screenshots, 'editor-workspace.png') });

  await page.getByTestId('theme-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: path.join(screenshots, 'editor-light.png') });
  await page.getByTestId('theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByTestId('template-product').click();
  await page.getByTestId('confirm-replace').click();
  await expect(page.getByRole('heading', { name: 'Ship notes · Release 2.8' })).toBeVisible();
  await expect(page.locator('code', { hasText: '2.8.0' })).toBeVisible();
  await expect(page.locator('s', { hasText: 'gone' })).toBeVisible();
  await page.waitForFunction(() => {
    const image = document.querySelector('img[alt="Desk plants beside a notebook"]');
    return image && image.complete && image.naturalWidth > 0;
  });

  await page.locator('[data-block-type="image"]').click();
  await expect(page.locator('#image-url')).toHaveValue(/plants\.png/);
  await page.locator('img[alt="Desk plants beside a notebook"]').first().scrollIntoViewIfNeeded();
  const previewBox = await page.getByRole('main', { name: 'Slack preview' }).boundingBox();
  const inspectorBox = await page.getByRole('complementary', { name: 'Properties' }).boundingBox();
  await page.screenshot({
    path: path.join(screenshots, 'preview-and-properties.png'),
    clip: {
      x: previewBox.x,
      y: Math.min(previewBox.y, inspectorBox.y),
      width: inspectorBox.x + inspectorBox.width - previewBox.x,
      height: Math.max(previewBox.height, inspectorBox.height),
    },
  });

  const before = await page.getByTestId('open-in-slack').getAttribute('href');
  expect(before.startsWith('https://app.slack.com/block-kit-builder/#')).toBe(true);
  const linked = JSON.parse(decodeURIComponent(before.split('#')[1]));
  expect(linked.blocks.map((block) => block.type)).toEqual(['header', 'section', 'image', 'divider', 'context', 'actions']);
  expect(JSON.stringify(linked)).not.toMatch(/"id":/);

  await page.locator('#image-title').fill('Launch photo');
  await page.getByTestId('open-import').click();
  await expect(page.getByTestId('payload-json')).toContainText('Launch photo');
  const live = JSON.parse(await page.getByTestId('payload-json').innerText());
  expect(live.blocks[2].title.text).toBe('Launch photo');
  expect(JSON.stringify(live)).not.toMatch(/ui_[a-z0-9]+/i);

  await page.getByTestId('import-json').fill(JSON.stringify({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Imported headline', emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: 'Brought in from *JSON*.' } },
      { type: 'divider' },
    ],
  }, null, 2));
  await page.screenshot({ path: path.join(screenshots, 'json-export-import.png') });
  await page.getByTestId('load-json').click();
  await expect(page.getByRole('heading', { name: 'Imported headline' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'JSON' })).toBeVisible();
  await expect(page.getByTestId('toast')).toContainText('Loaded 3 blocks');

  await page.locator('[data-block-type="header"]').click();
  await page.getByRole('button', { name: 'Move down' }).click();
  await expect(page.locator('[data-testid="block-row"]').first()).toHaveAttribute('data-block-type', 'section');

  await page.locator('[data-block-type="section"]').click();
  await page.getByRole('button', { name: 'Duplicate block' }).click();
  await expect(page.locator('[data-block-type="section"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'Delete block' }).click();
  await expect(page.locator('[data-block-type="section"]')).toHaveCount(1);

  await page.getByTestId('palette-context').click();
  await expect(page.locator('#context-0')).toHaveValue('Posted just now');
  await page.locator('#context-0').fill('Imported by the desk');
  await expect(page.getByTestId('slack-canvas').getByText('Imported by the desk')).toBeVisible();

  const handle = page.getByTestId('drag-handle');
  await handle.dragTo(page.locator('[data-testid="block-row"]').first(), { targetPosition: { x: 48, y: 8 } });
  await expect(page.locator('[data-testid="block-row"]').first()).toHaveAttribute('data-block-type', 'context');

  await page.getByTestId('copy-json').click();
  await expect(page.getByTestId('toast')).toHaveText('Copied JSON to the clipboard.');
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied.blocks.some((block) => block.type === 'context' && block.elements[0].text === 'Imported by the desk')).toBe(true);
  expect(JSON.stringify(copied)).not.toMatch(/"id":/);

  const slackHref = await page.getByTestId('open-in-slack').getAttribute('href');
  expect(JSON.parse(decodeURIComponent(slackHref.split('#')[1]))).toEqual(copied);

  expect(errors, errors.join('\n')).toEqual([]);
});
