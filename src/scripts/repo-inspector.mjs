#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const sourceDir = existsSync(join(root, 'src')) ? join(root, 'src') : root;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.venv') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function countLines(path) {
  return readFileSync(path, 'utf8').split('\n').length;
}

function listCodeFiles() {
  return walk(sourceDir).filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
}

function stats() {
  const codeFiles = listCodeFiles();
  const totalLines = codeFiles.reduce((sum, f) => sum + countLines(f), 0);
  console.log('Claude Code recovered source inspector');
  console.log('------------------------------------');
  console.log(`Source directory: ${sourceDir}`);
  console.log(`Source files: ${codeFiles.length}`);
  console.log(`Estimated lines: ${totalLines.toLocaleString()}`);
  console.log('Tip: npm run find -- "feature(\'KAIROS\')"');
  console.log('Tip: npm run frontend  # launches localhost code viewer');
}

function findText(pattern) {
  if (!pattern) {
    console.error('Usage: npm run find -- <text>');
    process.exit(1);
  }
  const files = listCodeFiles();
  let matches = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (text.includes(pattern)) {
      console.log(f.replace(`${sourceDir}/`, ''));
      matches++;
    }
  }
  console.log(`\nFound ${matches} file(s) containing "${pattern}".`);
}

function frontendTargets() {
  return [
    'main.tsx',
    'screens/REPL.tsx',
    'components/Messages.tsx',
    'components/PromptInput/PromptInput.tsx',
    'components/StatusLine.tsx',
    'components/Spinner.tsx',
  ];
}

function renderFrontendPage(files) {
  const payload = JSON.stringify(files).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Claude Code Frontend Viewer</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #0d1117; color: #e6edf3; }
    .app { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; }
    .left { border-right: 1px solid #30363d; padding: 14px; }
    .right { padding: 14px; }
    h1 { margin: 0 0 8px; font-size: 18px; }
    p { color: #9da7b3; margin: 0 0 12px; font-size: 13px; }
    button { width: 100%; text-align: left; background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; padding: 10px; margin-bottom: 8px; cursor: pointer; }
    button.active { border-color: #58a6ff; background: #0f2740; }
    pre { margin: 0; white-space: pre; overflow: auto; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.45; }
    .meta { margin-bottom: 8px; color: #9da7b3; font-size: 12px; }
  </style>
</head>
<body>
  <div class="app">
    <aside class="left">
      <h1>Frontend source viewer</h1>
      <p>Localhost view of the real Claude Code frontend files (read-only).</p>
      <div id="list"></div>
    </aside>
    <main class="right">
      <div class="meta" id="meta"></div>
      <pre id="code"></pre>
    </main>
  </div>
  <script>
    const files = ${payload};
    const list = document.getElementById('list');
    const code = document.getElementById('code');
    const meta = document.getElementById('meta');
    function select(idx) {
      const item = files[idx];
      if (!item) return;
      meta.textContent = item.path + ' — ' + item.lines.toLocaleString() + ' lines';
      code.textContent = item.content;
      [...list.children].forEach((el, i) => el.classList.toggle('active', i === idx));
    }
    files.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.textContent = f.path;
      btn.onclick = () => select(idx);
      list.appendChild(btn);
    });
    select(0);
  </script>
</body>
</html>`;
}

function launchFrontendViewer() {
  const files = frontendTargets().map((rel) => {
    const full = join(sourceDir, rel);
    const content = existsSync(full) ? readFileSync(full, 'utf8') : `Missing: ${rel}`;
    return { path: rel, lines: content.split('\n').length, content };
  });

  const host = '127.0.0.1';
  const port = Number(process.env.PORT || 4173);
  const html = renderFrontendPage(files);

  createServer((req, res) => {
    if (req.url !== '/' && req.url !== '/index.html') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  }).listen(port, host, () => {
    console.log('Claude Code frontend localhost viewer');
    console.log('-------------------------------------');
    console.log(`Open http://${host}:${port}`);
    console.log('Showing original source files in read-only mode.');
  });
}

if (args[0] === 'find') {
  findText(args.slice(1).join(' '));
} else if (args[0] === 'frontend') {
  launchFrontendViewer();
} else {
  stats();
}
