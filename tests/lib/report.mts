// npx tsx-free: run with `node --experimental-strip-types lib/report.mts <before> <after> <out> [title]`
// Writes <out>/diff/<step>.png and <out>/index.html (before | after | diff per step).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [before, after, out, title = "before / after"] = process.argv.slice(2);
if (!before || !after || !out) { console.error("usage: report.mts <before> <after> <out> [title]"); process.exit(2); }
fs.mkdirSync(path.join(out, "diff"), { recursive: true });

const pngs = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".png")) : []);
const steps = [...new Set([...pngs(before), ...pngs(after)])].sort();
const rel = (p: string) => path.relative(out, p);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const rows: string[] = [];
const summary: string[] = [];
for (const f of steps) {
  const b = path.join(before, f), a = path.join(after, f), d = path.join(out, "diff", f);
  let note: string, diffCell = "";
  if (!fs.existsSync(b) || !fs.existsSync(a)) {
    note = fs.existsSync(b) ? "missing after (the PR run stopped before this step)" : "missing before (main stopped before this step)";
  } else {
    const ib = PNG.sync.read(fs.readFileSync(b)), ia = PNG.sync.read(fs.readFileSync(a));
    if (ib.width !== ia.width || ib.height !== ia.height) {
      note = `size differs (${ib.width}x${ib.height} vs ${ia.width}x${ia.height})`;
    } else {
      const id = new PNG({ width: ib.width, height: ib.height });
      const n = pixelmatch(ib.data, ia.data, id.data, ib.width, ib.height, { threshold: 0.1, alpha: 0.3 });
      fs.writeFileSync(d, PNG.sync.write(id));
      const pct = (100 * n) / (ib.width * ib.height);
      note = n === 0 ? "identical" : `${n} px differ (${pct.toFixed(2)}%)`;
      diffCell = `<a href="${rel(d)}"><img src="${rel(d)}" loading="lazy"></a>`;
    }
  }
  const img = (p: string) => (fs.existsSync(p) ? `<a href="${rel(p)}"><img src="${rel(p)}" loading="lazy"></a>` : "");
  const step = f.replace(/\.png$/, "");
  summary.push(`${step.padEnd(24)} ${note}`);
  rows.push(`<tr><th>${esc(step)}<br><small>${esc(note)}</small></th><td>${img(b)}</td><td>${img(a)}</td><td>${diffCell}</td></tr>`);
}

fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font:14px system-ui,sans-serif;margin:16px;background:#111;color:#ddd}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;vertical-align:top}
th{text-align:left;width:12em;font-weight:600}td{width:29%}img{width:100%;display:block}
small{font-weight:400;color:#999}thead th{background:#1b1b1b}
</style>
<h1>${esc(title)}</h1>
<table><thead><tr><th>step</th><th>before</th><th>after</th><th>diff (red = changed)</th></tr></thead>
<tbody>${rows.join("\n")}</tbody></table>`);
console.log(summary.join("\n"));
console.log(`report: ${path.join(out, "index.html")}`);
