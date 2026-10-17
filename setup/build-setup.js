// Сборка Setup.exe: node setup/build-setup.js <папка пакета с files/ и exe_patches.json> <выход.exe> <версия> <url проекта>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [, , PKG, OUT, VER, URL] = process.argv;
if (!URL) { console.error('usage: build-setup.js <pkg> <out.exe> <version> <url>'); process.exit(1); }

const patches = JSON.parse(fs.readFileSync(path.join(PKG, 'exe_patches.json'), 'utf8'));
const q = s => JSON.stringify(s);
const gen = `// Сгенерировано build-setup.js
static partial class Rus
{
    public const string Version = ${q(VER)};
    public const string Url = ${q(URL)};
    static readonly long[] PatchOff = { ${patches.map(p => p.off).join(', ')} };
    static readonly string[] PatchOrig = { ${patches.map(p => q(p.orig)).join(', ')} };
    static readonly string[] PatchNew = { ${patches.map(p => q(p.new)).join(', ')} };
}
`;
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rus-setup-'));
const genCs = path.join(tmp, 'Generated.cs');
fs.writeFileSync(genCs, '﻿' + gen);

const files = path.join(PKG, 'files'), res = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else res.push(`/resource:${p},files/${path.relative(files, p).split(path.sep).join('/')}`);
  }
})(files);

const csc = path.join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
execFileSync(csc, ['/nologo', '/target:winexe', '/optimize+', '/codepage:65001', `/out:${OUT}`,
  '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll', ...res,
  path.join(__dirname, 'Setup.cs'), genCs], { stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`OK: ${OUT} (${res.length} файлов)`);
