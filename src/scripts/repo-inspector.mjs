#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

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

function stats() {
  const files = walk(join(root, 'src'));
  const codeFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
  const totalLines = codeFiles.reduce((sum, f) => sum + countLines(f), 0);
  console.log('Claude Code recovered source inspector');
  console.log('------------------------------------');
  console.log(`Source files: ${codeFiles.length}`);
  console.log(`Estimated lines: ${totalLines.toLocaleString()}`);
  console.log('Tip: npm run find -- "feature(\'KAIROS\')"');
}

function findText(pattern) {
  if (!pattern) {
    console.error('Usage: npm run find -- <text>');
    process.exit(1);
  }
  const files = walk(join(root, 'src')).filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
  let matches = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (text.includes(pattern)) {
      console.log(f.replace(`${root}/`, ''));
      matches++;
    }
  }
  console.log(`\nFound ${matches} file(s) containing "${pattern}".`);
}

if (args[0] === 'find') {
  findText(args.slice(1).join(' '));
} else {
  stats();
}