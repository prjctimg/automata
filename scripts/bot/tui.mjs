#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const ROOT = process.cwd();
const STATUS_INDEX = path.join(ROOT, 'status', 'index.json');
const DEFAULT_REPOS = 'craftty-org/gtm,craftty-org/gtw,craftty-org/gtm.nvim,craftty-org/gtm.docs,craftty-org/tuikit,craftty-org/xplora,craftty-org/learn_odin,craftty-org/aoc-tui';

const ANSI = {
  clear: '\x1b[2J\x1b[H',
  hide: '\x1b[?25l',
  show: '\x1b[?25h',
  alt: '\x1b[?1049h',
  main: '\x1b[?1049l',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

let runs = [];
let message = 'Ready.';
let filter = '';
let selected = 0;

function loadRuns() {
  try {
    const data = JSON.parse(fs.readFileSync(STATUS_INDEX, 'utf8'));
    runs = Array.isArray(data.runs) ? data.runs : [];
  } catch {
    runs = [];
  }
}

function colorStatus(r) {
  if (r.status !== 'completed') return `${ANSI.yellow}${r.status}${ANSI.reset}`;
  if (r.conclusion === 'success') return `${ANSI.green}${r.conclusion}${ANSI.reset}`;
  if (r.conclusion === 'failure') return `${ANSI.red}${r.conclusion}${ANSI.reset}`;
  if (r.conclusion === 'cancelled') return `${ANSI.gray}${r.conclusion}${ANSI.reset}`;
  return r.conclusion || r.status;
}

function pad(s, n) { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n); }

function visibleRuns() {
  const f = filter.toLowerCase();
  return runs.filter(r => !f || `${r.repo} ${r.workflow} ${r.conclusion} ${r.status} ${r.ref}`.toLowerCase().includes(f));
}

function render() {
  const rows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;
  const list = visibleRuns();
  if (selected >= list.length) selected = Math.max(0, list.length - 1);
  const maxRows = Math.max(5, rows - 12);
  const start = Math.max(0, Math.min(selected - Math.floor(maxRows / 2), Math.max(0, list.length - maxRows)));
  const slice = list.slice(start, start + maxRows);

  let out = ANSI.clear;
  out += `${ANSI.bold}${ANSI.cyan}craftty-bot${ANSI.reset} ${ANSI.dim}central maintenance TUI${ANSI.reset}\n`;
  out += `${ANSI.dim}status: ${STATUS_INDEX}${ANSI.reset}\n`;
  out += `${ANSI.dim}repos: ${DEFAULT_REPOS.split(',').length} configured | runs: ${runs.length} | filter: ${filter || '(none)'}${ANSI.reset}\n\n`;
  out += `${ANSI.bold}${pad('REPO', 22)} ${pad('WORKFLOW', 20)} ${pad('STATE', 12)} ${pad('REF', 18)} ${pad('WHEN', 20)}${ANSI.reset}\n`;
  out += `${ANSI.dim}${'-'.repeat(Math.min(cols - 1, 96))}${ANSI.reset}\n`;
  slice.forEach((r, i) => {
    const idx = start + i;
    const pointer = idx === selected ? `${ANSI.cyan}>${ANSI.reset}` : ' ';
    const state = r.status === 'completed' ? (r.conclusion || 'completed') : r.status;
    const when = (r.updated_at || '').replace('T', ' ').replace(/\.\d+Z$/, 'Z');
    const line = `${pointer} ${pad(r.repo?.replace('craftty-org/', ''), 22)} ${pad(r.workflow, 20)} ${pad(state, 12)} ${pad((r.ref || '').replace('refs/heads/', ''), 18)} ${pad(when, 20)}`;
    out += idx === selected ? `${ANSI.bold}${line}${ANSI.reset}\n` : `${line}\n`;
  });
  if (!slice.length) out += `${ANSI.dim}  no runs found${ANSI.reset}\n`;
  out += `\n${ANSI.bold}Keys${ANSI.reset}  ${ANSI.cyan}r${ANSI.reset} refresh  ${ANSI.cyan}/${ANSI.reset} filter  ${ANSI.cyan}s${ANSI.reset} stale dry-run  ${ANSI.cyan}c${ANSI.reset} close mentioned issues  ${ANSI.cyan}o${ANSI.reset} open run URL  ${ANSI.cyan}q${ANSI.reset} quit\n`;
  out += `${ANSI.dim}msg:${ANSI.reset} ${message}\n`;
  process.stdout.write(out);
}

async function prompt(question) {
  process.stdout.write(ANSI.show);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return await new Promise(resolve => rl.question(question, ans => { rl.close(); process.stdout.write(ANSI.hide); resolve(ans.trim()); }));
}

function runScript(cmd, args, env = {}) {
  return new Promise(resolve => {
    process.stdout.write(ANSI.main + ANSI.show);
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, cwd: ROOT });
    child.on('exit', code => {
      process.stdout.write(`\n${ANSI.dim}exit ${code}. press enter to return...${ANSI.reset}`);
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', () => { rl.close(); process.stdout.write(ANSI.alt + ANSI.hide); resolve(code); });
    });
  });
}

async function actionStale() {
  const repos = await prompt('Repos (comma-separated, empty=default): ') || DEFAULT_REPOS;
  const days = await prompt('Stale days [60]: ') || '60';
  const closeDays = await prompt('Close days [14]: ') || '14';
  const dry = await prompt('Dry run? [Y/n]: ');
  const dryRun = dry.toLowerCase() !== 'n';
  message = `Running stale bot (dry_run=${dryRun})...`;
  render();
  await runScript(process.execPath, ['scripts/bot/stale.mjs'], {
    GH_TOKEN: process.env.GH_TOKEN || process.env.CRAFTTY_BOT_TOKEN || '',
    REPOS: repos, STALE_DAYS: days, CLOSE_DAYS: closeDays, DRY_RUN: String(dryRun)
  });
  message = 'Stale bot finished.';
  loadRuns(); render();
}

async function actionCloseIssues() {
  const repo = await prompt('Repo (owner/name): ');
  const tag = await prompt('Release tag: ');
  if (!repo || !tag) { message = 'Repo and tag required.'; render(); return; }
  const dry = await prompt('Dry run? [Y/n]: ');
  const dryRun = dry.toLowerCase() !== 'n';
  message = `Closing mentioned issues for ${repo} ${tag}...`;
  render();
  await runScript(process.execPath, ['scripts/bot/close-mentioned-issues.mjs', '--repo', repo, '--tag', tag], {
    GH_TOKEN: process.env.GH_TOKEN || process.env.CRAFTTY_BOT_TOKEN || '',
    DRY_RUN: String(dryRun)
  });
  message = 'Close-mentioned-issues finished.';
  loadRuns(); render();
}

async function actionFilter() {
  const f = await prompt('Filter text (empty clears): ');
  filter = f; selected = 0; message = filter ? `Filter: ${filter}` : 'Filter cleared.'; render();
}

async function actionOpen() {
  const list = visibleRuns();
  const r = list[selected];
  if (!r?.html_url) { message = 'No URL for selected run.'; render(); return; }
  message = `URL: ${r.html_url}`;
  render();
}

async function onKey(key) {
  if (key === '\u0003' || key === 'q') return cleanup();
  const list = visibleRuns();
  if (key === '\x1b[A' || key === 'k') { selected = Math.max(0, selected - 1); render(); return; }
  if (key === '\x1b[B' || key === 'j') { selected = Math.min(Math.max(0, list.length - 1), selected + 1); render(); return; }
  if (key === 'r') { loadRuns(); message = 'Refreshed.'; render(); return; }
  if (key === '/') { await actionFilter(); return; }
  if (key === 's') { await actionStale(); return; }
  if (key === 'c') { await actionCloseIssues(); return; }
  if (key === 'o') { await actionOpen(); return; }
}

function cleanup() {
  process.stdout.write(ANSI.show + ANSI.main);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
  process.exit(0);
}

function main() {
  loadRuns();
  process.stdout.write(ANSI.alt + ANSI.hide);
  render();
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (key) => { await onKey(key); });
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
