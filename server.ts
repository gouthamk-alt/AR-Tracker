import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Published Jobs tab (gid=1145016181). If you delete and recreate the tab, update this link.
const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjrwV2w87nQ8EJRierP-B3jBqCz8-JLt7FbHBgNhHXWwSIenUMK68GaiLWjlodXrjUHCEfalxBmxOt/pub?gid=406255560&single=true&output=csv';

// Last good copy, used ONLY if Google is unreachable, and always flagged as stale.
let cachedCsv: { text: string; at: number } | null = null;

async function fetchGoogleSheetCsv(cb: string): Promise<{ text: string; stale: boolean; at: number }> {
  try {
    const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&cb=${encodeURIComponent(cb)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv,text/plain,*/*' },
      redirect: 'follow', // Google answers with a 307 redirect to googleusercontent.com
      signal: AbortSignal.timeout(20000),
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && !contentType.includes('text/html')) {
      const text = await response.text();
      if (text.includes('Date,Inspector')) {
        cachedCsv = { text, at: Date.now() };
        return { text, stale: false, at: cachedCsv.at };
      }
    }
  } catch {
    // Google unreachable: fall through to the in-memory copy
  }
  if (cachedCsv) return { text: cachedCsv.text, stale: true, at: cachedCsv.at };
  throw new Error('Unable to fetch live Google Sheet');
}

app.get(['/api/sheet-csv', '/api/csv'], async (req: Request, res: Response) => {
  try {
    const cb = typeof req.query.cb === 'string' ? req.query.cb : String(Date.now());
    const { text, stale, at } = await fetchGoogleSheetCsv(cb);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Data-Stale', String(stale));
    res.setHeader('X-Fetched-At', new Date(at).toISOString());
    res.send(text);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Failed to fetch sheet CSV' });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();