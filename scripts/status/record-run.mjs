#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env[name.toUpperCase()] ?? fallback;
}

const root = process.cwd();
const indexFile = path.join(root, 'status', 'index.json');

function rebuildIndex() {
  const runsDir = path.join(root, 'status', 'runs');
  const runs = [];
  if (fs.existsSync(runsDir)) {
    for (const repoDir of fs.readdirSync(runsDir)) {
      const absRepo = path.join(runsDir, repoDir);
      if (!fs.statSync(absRepo).isDirectory()) continue;
      for (const f of fs.readdirSync(absRepo)) {
        if (!f.endsWith('.json')) continue;
        try {
          const r = JSON.parse(fs.readFileSync(path.join(absRepo, f), 'utf8'));
          runs.push({
            repo: r.repo, workflow: r.workflow, run_id: String(r.run_id),
            run_number: r.run_number ?? null, event: r.event ?? '', ref: r.ref ?? '',
            sha: r.sha ?? '', status: r.status ?? '', conclusion: r.conclusion ?? '',
            actor: r.actor ?? '', html_url: r.html_url ?? '',
            created_at: r.created_at ?? '', updated_at: r.updated_at ?? '',
            path: path.relative(root, path.join(absRepo, f)),
          });
        } catch {}
      }
    }
  }
  runs.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const index = { generated_at: new Date().toISOString(), runs };
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  console.log(indexFile);
}

if (process.argv.includes('--rebuild-index')) {
  rebuildIndex();
  process.exit(0);
}

const repo = arg('repo');
const workflow = arg('workflow');
const runId = arg('run-id');
if (!repo || !workflow || !runId) {
  console.error('usage: record-run.mjs --repo <owner/name> --workflow <name> --run-id <id> ...');
  process.exit(2);
}

const safeRepo = repo.replace(/[^A-Za-z0-9._-]/g, '_');
const runFile = path.join(root, 'status', 'runs', safeRepo, `${runId}.json`);
fs.mkdirSync(path.dirname(runFile), { recursive: true });

const now = new Date().toISOString();
let existing = {};
if (fs.existsSync(runFile)) {
  try { existing = JSON.parse(fs.readFileSync(runFile, 'utf8')); } catch {}
}

const record = {
  repo,
  workflow,
  run_id: String(runId),
  run_attempt: Number(arg('run-attempt', existing.run_attempt ?? 1)),
  run_number: arg('run-number', existing.run_number ?? '') ? Number(arg('run-number', existing.run_number)) : existing.run_number ?? null,
  event: arg('event', existing.event ?? ''),
  ref: arg('ref', existing.ref ?? ''),
  sha: arg('sha', existing.sha ?? ''),
  status: arg('status', existing.status ?? 'in_progress'),
  conclusion: arg('conclusion', existing.conclusion ?? ''),
  actor: arg('actor', existing.actor ?? ''),
  html_url: arg('html-url', existing.html_url ?? ''),
  created_at: existing.created_at ?? arg('created-at', now),
  updated_at: now,
};

fs.writeFileSync(runFile, JSON.stringify(record, null, 2) + '\n');
rebuildIndex();
console.log(runFile);
