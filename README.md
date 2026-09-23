# Fundtech inventory workspace

A responsive React + TypeScript frontend built with Vite and Tailwind CSS. Integrated against the Express API in `D:\fundtech_backend` and the requirements in `project_guide.MD`.

## Run locally

Requires Node.js 22.12+ or 24+.

```powershell
cd D:\fundtech_frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:5173**. Start the backend API (port 3000) and its Kafka consumer separately, following the backend README. Sign in with your backend's configured admin username and password. No credentials are bundled with the frontend.

The **Explore the preview** button opens a clearly labeled, read-only sample workspace. Sample data is separate from the live API and is never used as an error fallback.

## Configuration

| Variable | Purpose |
| --- | --- |
| `API_PROXY_TARGET` | Backend origin for the local Vite proxy; defaults to `https://fundtech.niakylie.com`. |
| `VITE_API_BASE_URL` | Public backend origin for deployment, without `/api` or a trailing slash. Leave empty if your host proxies `/api` to the backend. |
| `VITE_CURRENCY` | Display currency (default `INR`); does not convert values. |

Restart Vite after changing environment variables. `VITE_` values are public and embedded at build time: never put secrets in them. The backend does not attach a currency to its numeric amounts, so configure the display currency to match your business.

## Features and API integration

| Interface | API |
| --- | --- |
| Login | `POST /api/auth/login` |
| Overview, stock search, low/out-of-stock filters, Excel export | `GET /api/products` |
| Purchase batch details (oldest first) | `GET /api/products/:productId/batches` |
| Paginated ledger, product filter, FIFO allocations, rejection reasons | `GET /api/ledger?limit=10&offset=0&product_id=...` |
| New purchase or sale | `POST /api/events` |
| Eight-event simulator | Eight ordered calls to `POST /api/events` |
| Queued / completed / rejected event tracking | `GET /api/events/:eventId` |

Login sessions are saved in the tab's session storage so reloading preserves login until the token expires. Signing out, token expiry, or an authenticated 401 clears the saved session. Passwords are never stored. Credentials are sent only to the configured backend; use HTTPS in production.

Stock and ledger poll every 10 seconds while the tab is visible. Event statuses poll every 8 seconds, with at most 8 queued requests per poll. A 404 for an event means it has not been processed yet. After two minutes without confirmation, an event is labeled unconfirmed and can be checked again. A network or server error during submission is treated as uncertain delivery; inspect the event status before creating another event. The frontend never labels a queued transaction completed before the backend confirms it.

FIFO is calculated by the backend. Sale details display the exact returned batch allocations. Decimal.js handles money calculations, and BigInt handles aggregate quantities. Cards round money to two decimal places for display; batch unit prices display four. Excel exports use .xlsx workbooks with numeric cells for calculations. Values exceeding Excel's 15-significant-digit precision are stored as text to preserve the backend value. The stock alert threshold is fewer than 25 units, including zero stock.

The chart shows units in the latest **100 processed transactions**, grouped over the last seven local calendar days; it is not a full historical report. Ledger Excel export includes the **current page** only. Inventory export includes the current inventory filter and search. Neither export silently fetches additional pages.

The simulator uses `testing_product` each run and sends four purchases and four sales in sequence. Repeated runs add to the same product. Starting from empty stock, a fully applied run ends at **70 units**, with an inventory value of **8,550** and a total FIFO sale cost of **8,000**, in your configured currency. These are real persisted events when signed in; preview cannot publish them.

## Verify and build

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run preview
```

Browser tests use installed Microsoft Edge in headless mode and start Vite automatically. If Edge is unavailable, install Playwright Chromium with `npx playwright install chromium` and remove `channel: 'msedge'` in `playwright.config.ts`. API responses are mocked to match the backend contract; tests do not write to the real database or Kafka. Tests cover authentication, expiry, network errors, stock detail, FIFO allocations, ledger pagination, Excel download, event submission/status, simulator ordering, mobile navigation, and large-number precision.

## Deploy

1. Deploy the backend API and Kafka consumer using the backend's deployment instructions.
2. On Vercel, leave `VITE_API_BASE_URL` unset or empty: the included `vercel.json` forwards `/api/*` and `/health/*` to `https://fundtech.niakylie.com`. Set `VITE_CURRENCY` as appropriate. On other hosts without a proxy, set `VITE_API_BASE_URL` to the HTTPS backend origin.
3. Set the backend's `CORS_ORIGINS` to include the exact frontend origin.
4. Build with `npm run build` and publish the `dist` directory. No SPA route rewrite is needed because navigation uses local view state.
5. Sign in and validate a real purchase and sale with your deployment credentials.

Vite's development proxy is not included in production output. Vercel uses the repository's `vercel.json` instead; deploy the commit containing this file for the rules to take effect. Other hosts need an equivalent reverse proxy if `VITE_API_BASE_URL` is empty. If the backend domain changes, update both `API_PROXY_TARGET` and the destinations in `vercel.json`.

## Source layout

- `src/App.tsx`: authentication, workspace views, event publishing and dialogs.
- `src/api.ts` / `src/types.ts`: typed backend client and contracts.
- `src/components.tsx`: tables, chart, status badges and accessible native dialogs.
- `src/format.ts`: exact decimal/quantity formatting.
- `src/excel.ts`: styled .xlsx workbook export, loaded on demand.
- `src/demo.ts`: isolated read-only preview data.
- `src/styles.css`: Tailwind integration, visual design and responsive layouts.

Tooling references: [Vite guide](https://vite.dev/guide/), [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).
