/**
 * Minimal static server for the `out/` export (used by Playwright and for
 * local checks). Mirrors how GitHub Pages / Vercel resolve trailing-slash
 * routes: /guides/economy/ → out/guides/economy/index.html.
 *
 *   node scripts/serve-out.mjs [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let file = path.join(root, p);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    else if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!fs.existsSync(file)) {
      const nf = path.join(root, "404.html");
      res.writeHead(404, { "content-type": "text/html" });
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
