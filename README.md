# gmork2 — Python in the browser + AI model radar

Static site for GitHub Pages: an embedded Python interpreter (CPython via Pyodide, running in a
Web Worker) with an OpenAI-compatible client, plus live data panels for AI models.

## Pages

| Page | File(s) | Content and filters |
|---|---|---|
| Home | `index.html` | Embedded Python terminal (Web Worker + Pyodide), API key panel, ENVIRONMENT inspector, and share/embed snippet. |
| Trending | `trending.html` | Models/datasets/spaces from [Hugging Face](https://huggingface.co/api/trending). Filters: **type, search, sort**. |
| Leaderboard | `leaderboard.html` | Models from [OpenRouter](https://openrouter.ai/api/v1/models) with $/1M prices, context and benchmark. Filters: **search, sort, modality, benchmark only, free**. |
| Benchmarks | `benchmarks.html` | Intelligence index (Artificial Analysis). Filters: **search, top N**. |
| Repos | `repos.html` | Repos from the [gmork2](https://github.com/gmork2) profile. Filters: **search, language, sort**. |
| Docs | `docs.html` + `docs-*.html` | Multi-page documentation for the OpenAI-compatible terminal shim (quickstart, API reference, providers, architecture, limitations). |

## Architecture

- Single-page shell (`index.html`) with hash routing (`#/`, `#/docs`, `#/trending`, …). The terminal
  stays mounted while navigating, so the interpreter state persists.
- The Python interpreter runs inside a **Web Worker** (`js/llm-worker.js`) using Pyodide (CPython
  compiled to WebAssembly, loaded from a CDN). Network calls use `pyodide.http.pyfetch`.
- The OpenAI-compatible client (`js/llm-worker.js`) supports DeepSeek, OpenAI, OpenRouter, Groq and
  any OpenAI-compatible endpoint via `base_url`. The API key is kept **in memory only**.
- Data panels (`trending`, `leaderboard`, `benchmarks`, `repos`) fetch public APIs with CORS from the
  browser. No backend.
- The standalone page `terminal-llm.html` reuses the same terminal component and can be embedded on
  any site via an `<iframe>`.

## Structure

```
├── index.html / trending.html / leaderboard.html / benchmarks.html / repos.html
├── docs.html / docs-*.html / terminal-llm.html
├── css/
│   ├── styles.css        # layout, components, data panels, docs
│   └── terminal.css      # terminal component
├── js/
│   ├── app.js            # helpers, formatting, cache, theme, baseUrl
│   ├── shell.js          # shared topbar + footer (active nav, models dropdown)
│   ├── router.js         # hash router (mount-once SPA)
│   ├── terminal.js       # terminal UI component (creates the Web Worker)
│   ├── llm-worker.js     # Pyodide + OpenAI-compatible shim (runs in a Web Worker)
│   ├── home.js           # terminal wiring, ENVIRONMENT trace, API key, embed snippet
│   ├── trending.js       # Hugging Face /api/trending
│   ├── leaderboard.js    # OpenRouter /api/v1/models + detail modal
│   ├── benchmarks.js     # intelligence index (Artificial Analysis)
│   ├── repos.js          # reads data/repos.json
│   └── docs.js           # docs sidebar, tabs, run/copy/export buttons
├── data/repos.json       # repo list (seed, regenerated in CI)
└── .github/workflows/deploy.yml
```

## Publishing to GitHub Pages

The `.github/workflows/deploy.yml` workflow:

1. Runs on **every push to `main`**, on a **cron (every 6 h)** and manually (`workflow_dispatch`).
2. Queries `https://api.github.com/users/gmork2/repos` with `GITHUB_TOKEN` and **regenerates `data/repos.json`**.
3. If changed, commits it back to `main`.
4. Copies only the site files to `_site/` (`css`, `js`, `data`, `*.html` — excludes `sample/`, `.git`, `.github`, etc.) and publishes with `deploy-pages`.

> This avoids exposing a token, doesn't depend on the browser request limit and keeps the page
> 100% static. The commit-back uses `GITHUB_TOKEN`, so it doesn't create a workflow loop.

### One-time setup

1. Push the repository to GitHub (`git push`).
2. On GitHub → *Settings* → *Pages* → *Build and deployment* → *Source*: **GitHub Actions**.

The site will be published at `https://gmork2.github.io/` (or your own domain with a `CNAME`).

## Local preview

```bash
cd gmork2
python3 -m http.server 8000
# open http://localhost:8000
```

> Opening the files via `file://` will not work: browsers block Web Workers on the local filesystem.

## Notes

- `data/repos.json` is a *seed* for local development; in production the workflow regenerates it on every deploy.
- The `localStorage` cache reduces calls and respects API limits.
- The API key is kept in memory only (`os.environ` inside the worker); it is never persisted and is lost on reload.
- tbench.ai (Terminal-Bench) doesn't expose a public API; the Artificial Analysis index included in
  OpenRouter is used instead, plus links to external sources (Artificial Analysis, LMArena, Terminal-Bench).
