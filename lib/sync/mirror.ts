import fs from "node:fs";
import path from "node:path";

/**
 * Download a list of URLs into a folder, skipping files whose stored ETag
 * still matches the remote one. ETags live in `<dir>/.etags.json`.
 */
export interface MirrorResult {
  downloaded: number;
  skipped: number;
  failed: { url: string; error: string }[];
}

export async function mirrorAssets(
  jobs: { url: string; file: string }[],
  dir: string,
  opts: { concurrency?: number; log?: (s: string) => void; fetchImpl?: typeof fetch } = {},
): Promise<MirrorResult> {
  const concurrency = opts.concurrency ?? 8;
  const log = opts.log ?? (() => {});
  const f = opts.fetchImpl ?? fetch;
  fs.mkdirSync(dir, { recursive: true });
  const etagFile = path.join(dir, ".etags.json");
  const etags: Record<string, string> = fs.existsSync(etagFile) ? JSON.parse(fs.readFileSync(etagFile, "utf8")) : {};
  const result: MirrorResult = { downloaded: 0, skipped: 0, failed: [] };

  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const job = jobs[i++]!;
      const target = path.join(dir, job.file);
      try {
        const exists = fs.existsSync(target);
        if (exists && etags[job.file]) {
          const head = await f(job.url, { method: "HEAD" });
          const et = head.headers.get("etag");
          if (head.ok && et && et === etags[job.file]) {
            result.skipped++;
            continue;
          }
        }
        const res = await f(job.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(target, buf);
        const et = res.headers.get("etag");
        if (et) etags[job.file] = et;
        result.downloaded++;
        if (result.downloaded % 50 === 0) log(`  …${result.downloaded} downloaded`);
      } catch (e) {
        result.failed.push({ url: job.url, error: e instanceof Error ? e.message : String(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  fs.writeFileSync(etagFile, JSON.stringify(etags, null, 0));
  return result;
}
