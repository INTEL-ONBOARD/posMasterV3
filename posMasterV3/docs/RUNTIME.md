# Runtime Topology

POSMaster V3 runs as two different process shapes depending on how it's started. Knowing which one you're in matters when debugging — an error that's visible in one is silent in the other.

## Development (`npm run dev:all`)

Three separate processes, started concurrently:

1. **Vite dev server** (`http://localhost:5173`, falls back to `5174`) — serves the React UI with HMR.
2. **Online API server** (`node --watch src/online-server/server.cjs`, port 4100) — Express + Mongo, run standalone.
3. **Electron** (`run-electron.cjs`) — waits for both of the above to be reachable, then opens a `BrowserWindow` pointed at the Vite dev server URL.

```
React UI (localhost:5173, HMR)
  → preload.cjs contextBridge → Electron main process
  → OnlineApiClient (fetch) → Express (localhost:4100/api)
  → MongoDB Atlas
```

Each process logs to its own terminal (via `concurrently`), so `console.error` in the online-server is visible directly.

## Packaged (production build)

One process. `electron.cjs` embeds the online-server: `startBundledOnlineBackend()` requires `src/online-server/runtime.cjs` in-process and calls `startOnlineServer()` directly, rather than spawning it separately. The renderer loads the built React app from `dist/index.html` over `file://`, not from a dev server.

```
React UI (file://.../dist/index.html)
  → preload.cjs contextBridge → Electron main process
  → OnlineApiClient (fetch) → embedded Express (127.0.0.1:4100/api, same process)
  → MongoDB Atlas
```

Config for the packaged build comes from `online-runtime-config.json` (baked in at build time by `scripts/write-online-runtime-config.cjs` from CI secrets/vars — see `.github/workflows/release.yml`), read by `readPackagedOnlineRuntimeConfig()` in `electron.cjs` and copied into `process.env` before the embedded server starts.

## Key differences

| | Dev | Packaged |
|---|---|---|
| Processes | 3 | 1 |
| Renderer origin | `http://localhost:5173` | `file://` |
| HMR | Yes | No |
| `console.error` visibility | Terminal | Nowhere (no attached console on Windows) — see below |
| Config source | `.env.online` / `.env` | `online-runtime-config.json` (baked at build time) |
| `NODE_ENV` | unset (`development` fallback) | forced to `production` in `applyBundledOnlineDefaults()` |

## Why `console.error` visibility matters

In dev, if the embedded server (or standalone `online-server`) throws on startup — e.g. MongoDB unreachable — it's printed straight to the terminal you're staring at. In a packaged Windows build, there is no terminal; `console.error` output goes nowhere the user or support can see. That's why bundled-server startup failures are also written to a file (`recordStartupError()` in `electron.cjs`, read via `startup:get-error` IPC / `electronAPI.getStartupError()`), and why `Intro.jsx` shows the actual failure in a "Details for support" panel instead of a generic "check your connection" message.

## Testing both

A change to `config.cjs`, `runtime.cjs`, `app.cjs`, or anything CORS/auth-related should be checked in both shapes before merging:

```bash
npm run dev:all      # 3-process dev topology
npm run dist          # build a real packaged installer
```

The origin the renderer loads from differs (`http://localhost:5173` vs `file://`), which is exactly why CORS configuration (`ONLINE_API_CORS_ORIGIN` in `src/online-server/config.cjs`) explicitly lists both instead of using a wildcard.
