import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const [dir, outDir, filter = ''] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.includes(filter)).sort();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1460, height: 1000 } });
for (let i = 0; i < files.length; i += 4) {
  const group = files.slice(i, i + 4);
  const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:1fr 1fr;gap:4px;font:12px sans-serif">${group.map((f) => `<div><div>${f}</div><div style="height:460px;overflow:hidden"><img style="width:720px" src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}"></div></div>`).join('')}</body>`;
  await p.setContent(html);
  await p.screenshot({ path: join(outDir, `sheet-${String(i / 4).padStart(2, '0')}.png`), fullPage: true });
}
await b.close();
