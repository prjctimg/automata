#!/usr/bin/env node
/**
 * craftty-bot: close issues mentioned in a release.
 * Env/args: GH_TOKEN, REPO (owner/repo), TAG (release tag) or RELEASE_BODY
 */
function arg(name, fb='') { const i=process.argv.indexOf(`--${name}`); return i!==-1 && process.argv[i+1] ? process.argv[i+1] : (process.env[name.toUpperCase().replace(/-/g,'_')] || fb); }
const repo = arg('repo');
const tag = arg('tag');
let body = arg('release-body', process.env.RELEASE_BODY || '');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const dryRun = process.env.DRY_RUN === 'true';
if (!token) { console.error('GH_TOKEN required'); process.exit(2); }
if (!repo) { console.error('REPO required'); process.exit(2); }
const [owner, name] = repo.split('/');
const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'craftty-bot' };
async function gh(path, opts={}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers||{}) } });
  if (res.status === 204) return null;
  const t = await res.text();
  let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${t.slice(0,300)}`);
  return d;
}

if (!body && tag) {
  const rel = await gh(`/repos/${owner}/${name}/releases/tags/${encodeURIComponent(tag)}`);
  body = rel.body || '';
}

const patterns = [/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/ig, /(?:^|\s)#(\d+)\b/g];
const nums = new Set();
for (const p of patterns) for (const m of body.matchAll(p)) nums.add(Number(m[1]));
if (!nums.size) { console.log('No issue references found.'); process.exit(0); }

for (const n of [...nums].sort((a,b)=>a-b)) {
  try {
    const issue = await gh(`/repos/${owner}/${name}/issues/${n}`);
    if (issue.pull_request) { console.log(`skip PR #${n}`); continue; }
    if (issue.state === 'closed') { console.log(`already closed #${n}`); continue; }
    console.log(`${dryRun?'DRY':''} close ${repo}#${n}: ${issue.title}`);
    if (!dryRun) {
      await gh(`/repos/${owner}/${name}/issues/${n}/comments`, { method:'POST', body: JSON.stringify({ body: `Closed by craftty-bot: referenced in release ${tag || '(manual)'}.` }) });
      await gh(`/repos/${owner}/${name}/issues/${n}`, { method:'PATCH', body: JSON.stringify({ state:'closed', state_reason:'completed' }) });
    }
  } catch (e) { console.error(`ERR #${n}: ${e.message}`); }
}
