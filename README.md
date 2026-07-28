# Automata 🤖

## Motivation

Time is of the essence and it would be wasteful to **not automate** stuff that have a clearly defined outcome. This repository houses the logic for maintaining my plugin docs, assets and more.

Think of it like the central point for all automated actions. This makes it easy to manage all my workflows across all repositories from one point.

### Current workflows

- **p5.js Sync** (`p5-sync.yml`) — for [p5.nvim](https://github.com/prjctimg/p5.nvim):
  - Bundle TypeScript definitions from the npm `p5` package → `assets/types/`
  - Generate p5.js API vim help from p5.js source → `doc/p5-*.txt` + `doc/tags`
  - Push directly to `prjctimg/p5.nvim` `main` (does not overwrite `doc/p5-nvim.txt`)

Trigger manually:

```bash
gh workflow run "p5.js Sync" -R prjctimg/automata
```

(c) [Dean Tarisai](https://prjctimg.me)
