# Status data

Run records written by centralized craftty workflows in automata. Intended for rendering on a status page.

## Layout

- `status/index.json` - manifest rebuilt on every run record update.
- `status/runs/<repo>/<run_id>.json` - one file per automata run.

`<repo>` is the source repo name with `/` replaced by `_` (e.g. `craftty-org_gtm`).

## Run record schema

```json
{
  "repo": "craftty-org/gtm",
  "workflow": "gtm-ci",
  "run_id": "123456789",
  "run_attempt": 1,
  "run_number": 42,
  "event": "push",
  "ref": "refs/heads/dev",
  "sha": "...",
  "status": "completed",
  "conclusion": "success",
  "actor": "prjctimg",
  "html_url": "https://github.com/craftty-org/automata/actions/runs/...",
  "created_at": "2026-11-26T00:00:00.000Z",
  "updated_at": "2026-11-26T00:05:00.000Z"
}
```

`status` is `in_progress` or `completed`. `conclusion` is empty while in progress, then `success`, `failure`, or `cancelled`.

## Recording

```sh
node scripts/status/record-run.mjs \
  --repo craftty-org/gtm \
  --workflow gtm-ci \
  --run-id "$GITHUB_RUN_ID" \
  --run-number "$GITHUB_RUN_NUMBER" \
  --event push \
  --ref refs/heads/dev \
  --sha "$GITHUB_SHA" \
  --status completed \
  --conclusion success \
  --actor "$GITHUB_ACTOR" \
  --html-url "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
```

`node scripts/status/record-run.mjs --rebuild-index` rebuilds `status/index.json` from run files.
