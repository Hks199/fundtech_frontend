import { test, expect, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';

const product = { product_id: 'PRD001', current_quantity: '40', total_inventory_cost: '4400.00', average_cost_per_unit: '110.0000' };
const entry = { event_id: 'a3f576d2-c267-4c19-8d93-7a4b8bedc055', product_id: 'PRD001', event_type: 'sale', status: 'applied', reason: null, occurred_at: new Date().toISOString(), processed_at: new Date().toISOString(), quantity: 12, unit_price: null, total_cost: '1240.00', allocations: [{ batch_id: '1', quantity: 10, unit_price: '100', cost: '1000' }, { batch_id: '2', quantity: 2, unit_price: '120', cost: '240' }] };
async function mockApi(page: Page, options: { failLogin?: boolean; expired?: boolean; offline?: boolean } = {}) {
  const submitted: Record<string, unknown>[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/login') return options.failLogin ? json({ error: 'Invalid credentials' }, 401) : json({ access_token: 'test-token', expires_in: 3600 });
    expect(request.headers().authorization).toBe('Bearer test-token');
    if (options.expired) return json({ error: 'Unauthorized' }, 401);
    if (options.offline) return route.abort();
    if (url.pathname === '/api/products') return json({ products: [product] });
    if (url.pathname.endsWith('/batches')) return json({ batches: [{ id: '2', original_quantity: 50, remaining_quantity: 40, unit_price: '110.0000', occurred_at: new Date().toISOString() }] });
    if (url.pathname === '/api/ledger') return json({ entries: url.searchParams.get('offset') === '10' ? [] : Array.from({ length: url.searchParams.get('limit') === '100' ? 12 : 10 }, (_, i) => ({ ...entry, event_id: `${entry.event_id.slice(0, -2)}${String(i).padStart(2, '0')}` })) });
    if (url.pathname === '/api/events' && request.method() === 'POST') { const event = request.postDataJSON(); submitted.push(event); return json({ event_id: event.event_id, status: 'queued' }, 202); }
    if (url.pathname.startsWith('/api/events/')) return json({ event_id: url.pathname.split('/').at(-1), status: 'rejected', reason: 'insufficient_stock' });
    return json({ error: 'Unhandled route' }, 500);
  });
  return submitted;
}
async function signIn(page: Page) { await page.goto('/'); await page.getByLabel('Username', { exact: true }).fill('admin'); await page.getByLabel('Password', { exact: true }).fill('test-password'); await page.getByRole('button', { name: 'Sign in to workspace' }).click(); }

test('preview dashboard, inventory search, batch details, and mobile navigation', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', err => errors.push(err.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Explore the preview' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory overview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New transaction' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Inventory 6', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search products' }).fill('PRD004');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'View batches for PRD004' }).click();
  await expect(page.getByRole('dialog')).toContainText('Next out');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-open/);
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true, animations: 'disabled' });
  const layout = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('*')].filter(e => !e.closest('.table-scroll')).map(e => ({ element: e.className || e.tagName, right: e.getBoundingClientRect().right, width: e.getBoundingClientRect().width })).filter(e => e.right > window.innerWidth) }));
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
  expect(errors).toEqual([]);
});

test('login, FIFO allocations, pagination, export, and sign out', async ({ page }) => {
  await mockApi(page); await signIn(page);
  await expect(page.getByRole('heading', { name: 'Inventory overview' })).toBeVisible();
  await expect(page.getByText('₹4,400.00').first()).toBeVisible();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  const inventoryDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel', exact: true }).click();
  const inventoryFile = await inventoryDownload;
  expect(inventoryFile.suggestedFilename()).toBe('fundtech-inventory.xlsx');
  const inventoryWorkbook = new ExcelJS.Workbook();
  await inventoryWorkbook.xlsx.readFile((await inventoryFile.path())!);
  expect(inventoryWorkbook.getWorksheet('Inventory')!.getCell('B2').value).toBe(40);
  await page.getByRole('button', { name: 'Transaction ledger', exact: true }).click();
  await page.getByRole('button', { name: /View transaction/ }).first().click();
  await expect(page.getByRole('dialog')).toContainText('FIFO batch allocations');
  await expect(page.getByRole('dialog')).toContainText('₹1,240.00');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export page to Excel' }).click();
  const ledgerFile = await download;
  expect(ledgerFile.suggestedFilename()).toBe('fundtech-ledger-page.xlsx');
  const ledgerWorkbook = new ExcelJS.Workbook();
  await ledgerWorkbook.xlsx.readFile((await ledgerFile.path())!);
  expect(ledgerWorkbook.getWorksheet('Transaction ledger')!.getCell('E2').value).toBe(1240);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('invalid credentials stay on login with a useful error', async ({ page }) => {
  await mockApi(page, { failLogin: true }); await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('expired token signs the user out', async ({ page }) => {
  await mockApi(page, { expired: true }); await signIn(page);
  await expect(page.getByRole('status')).toContainText('Your session expired');
});

test('sale omits unit price and shows a consumer rejection after queueing', async ({ page }) => {
  const submitted = await mockApi(page); await signIn(page);
  await page.getByRole('button', { name: 'New transaction' }).click();
  await page.getByRole('button', { name: 'Sale', exact: true }).click();
  await page.getByLabel('Product ID').fill('PRD001'); await page.getByLabel('Quantity', { exact: true }).fill('100');
  await expect(page.getByLabel('Unit purchase price')).toHaveCount(0);
  await page.getByRole('button', { name: 'Queue sale' }).click();
  await expect(page.getByText('queued', { exact: true })).toBeVisible();
  expect(submitted).toHaveLength(1); expect(submitted[0].event_type).toBe('sale'); expect(submitted[0]).not.toHaveProperty('unit_price');
  await expect(page.getByText('Insufficient stock to fulfill this sale.')).toBeVisible({ timeout: 15000 });
});

test('simulation posts eight ordered events to testing_product', async ({ page }) => {
  const submitted = await mockApi(page); await signIn(page);
  await page.getByRole('button', { name: 'Event studio', exact: true }).click();
  await page.getByRole('button', { name: 'Run 8-event simulation' }).click();
  await expect(page.getByText(/8 of 8 events queued/)).toBeVisible();
  expect(submitted).toHaveLength(8); expect([...new Set(submitted.map(e => e.product_id))]).toEqual(['testing_product']);
  expect(new Set(submitted.map(e => e.event_id)).size).toBe(8);
  expect(submitted.filter(e => e.event_type === 'purchase')).toHaveLength(4);
  expect(submitted.filter(e => e.event_type === 'sale').every(e => !('unit_price' in e))).toBeTruthy();
  const times = submitted.map(e => Date.parse(String(e.timestamp))); expect(times).toEqual([...times].sort((a, b) => a - b));
});

test('API outage displays an error instead of sample inventory', async ({ page }) => {
  await mockApi(page, { offline: true }); await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Cannot reach the API');
  await expect(page.locator('tbody tr')).toHaveCount(0);
});
