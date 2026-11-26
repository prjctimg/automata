#!/usr/bin/env node
/**
 * craftty-bot: mark stale and close inactive issues/PRs across repos.
 * Env: GH_TOKEN, REPOS (comma-separated owner/repo), STALE_DAYS, CLOSE_DAYS, DRY_RUN
 */
const repos = (process.env.REPOS || '').split(',').map(s => s.trim()).filter(Boolean);
const staleDays = Number(process.env.STALE_DAYS || 60);
const closeDays = Number(process.env.CLOSE_DAYS || 14);
const dryRun = process.env.DRY_RUN === 'true';
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) { console.error('GH_TOKEN required'); process.exit(2); }
if (!repos.length) { console.error('REPOS required'); process.exit(2); }

const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'craftty-bot'
};

async function gh(path, opts = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${path}: ${t.slice(0,300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function* paginate(path) {
  let url = `https://api.github.com${path}${path.includes('?') ? '&' : '?'}per_page=100`;
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const data = await res.json();
    for (const item of data) yield item;
    const link = res.headers.get('link') || '';
    const m = link.match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
}

const now = Date.now();
const staleMs = staleDays * 864e5;
const closeMs = closeDays * 864e5;
const exemptLabels = new Set(['pinned','security','keep','epic','roadmap']);

function hasExemptLabel(item) {
  return (item.labels || []).some(l => exemptLabels.has((l.name||'').toLowerCase()));
}

async function processRepo(repo) {
  const [owner, name] = repo.split('/');
  let marked = 0, closed = 0;
  for await (const item of paginate(`/repos/${owner}/${name}/issues?state=open&sort=updated&direction=asc`)) {
    if (item.pull_request) continue; // handle PRs separately if desired
    if (hasExemptLabel(item)) continue;
    const updated = new Date(item.updated_at).getTime();
    const age = now - updated;
    const labels = (item.labels || []).map(l => l.name);
    const isStale = labels.includes('stale');
    if (isStale && age >= closeMs) {
      console.log(`${dryRun?'DRY':''} close ${repo}#${item.number} ${item.title}`);
      if (!dryRun) {
        await gh(`/repos/${owner}/${name}/issues/${item.number}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body: `Closed by craftty-bot: no activity for ${staleDays + closeDays}+ days. Please reopen if this is still relevant.` })
        });
        await gh(`/repos/${owner}/${name}/issues/${item.number}`, {
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' })
        });
      }
      closed++;
    } else if (!isStale && age >= staleMs) {
      console.log(`${dryRun?'DRY':''} stale ${repo}#${item.number} ${item.title}`);
      if (!dryRun) {
        await gh(`/repos/${owner}/${name}/issues/${item.number}/labels`, {
          method: 'POST',
          body: JSON.stringify({ labels: ['stale'] })
        });
        await gh(`/repos/${owner}/${name}/issues/${item.number}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body: `Marked stale by craftty-bot: no activity for ${staleDays}+ days. This will be closed in ${closeDays} days unless there is new activity.` })
        });
      }
      marked++;
    }
  }
  return { repo, marked, closed };
}

const results = [];
for (const repo of repos) {
  try { results.push(await processRepo(repo)); }
  catch (e) { console.error(`ERR ${repo}: ${e.message}`); results.push({ repo, error: e.message }); }
}
console.log(JSON.stringify(results, null, 2));
