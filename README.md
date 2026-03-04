# [BigOsee](https://bigosee.jyotimoydas.in)

BigOsee is an interactive algorithm visualizer and complexity analyzer built with Next.js and React. It lets you write or paste code, step through execution, visualize data structures (arrays, variables), and inspect runtime snapshots to better understand algorithm behavior and complexity.

**Features**
- **Interactive editor** — Write or paste algorithm code (Python, JavaScript, C/C++, Java)
- **Real-time visualization** — Watch arrays, variables, and operations update as code executes
- **Execution timeline** — Step through code, play/pause, and scrub to any point
- **Hybrid execution** — Regex transpiler + acorn interpreter for step-by-step visualization, with Judge0 fallback for native language verification
- **Code instrumentation** — Automatic snapshot capture of state at each logical step

## Getting started

### Prerequisites
- Node.js 18+ and `npm`, `pnpm`, or `yarn`
- (Optional) Self-hosted Judge0 for C/C++/Java execution

### Installation

```bash
npm install
```

### Environment Setup

Create or update `.env.local` with:

```bash
# Judge0 — Self-hosted code execution (server-side only)
# Set this to your Judge0 instance URL. If not set, C/C++/Java use transpiler fallback.
# This is NOT exposed to the browser — requests go through /api/execute proxy.
JUDGE0_URL=http://your-judge0-ip:2358
```

**Note:** This is a **private** environment variable (no `NEXT_PUBLIC_` prefix). The browser communicates with Judge0 through the Next.js API proxy at `/api/execute`, avoiding CORS issues and hiding the server IP.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm start` — Start the production server
- `npm run lint` — Run ESLint

## Repository structure

- **src/app/** — Next.js app entry and pages
- **src/app/api/execute/** — Judge0 proxy endpoint for code execution (avoids CORS)
- **src/components/** — React UI components
  - [EditorPanel.tsx](src/components/EditorPanel.tsx), [ArrayVisualizer.tsx](src/components/ArrayVisualizer.tsx), [PlaybackControls.tsx](src/components/PlaybackControls.tsx), etc.
- **src/engine/** — AST instrumentation, transpilation, and runtime execution
  - [astInstrumenter.ts](src/engine/astInstrumenter.ts) — Injects snapshot capture into code
  - [transpiler.ts](src/engine/transpiler.ts) — Converts Python/JS to instrumented JS
  - [interpreter.ts](src/engine/interpreter.ts) — Step-through execution with state snapshots
  - [judge0Client.ts](src/engine/judge0Client.ts) — Handles C/C++/Java submissions via proxy
  - [pythonRuntime.ts](src/engine/pythonRuntime.ts) — Lightweight Python runtime shim
- **src/stores/** — Zustand state management
  - [codeStore.ts](src/stores/codeStore.ts) — Editor and code state
  - [timelineStore.ts](src/stores/timelineStore.ts) — Execution timeline and playback

## How It Works

### Execution Flow

1. **Browser** → User writes/pastes code and clicks "Run"
2. **Transpiler** → Code is instrumented to capture snapshots at key points
3. **Interpreter** → Step-by-step execution with state capture
4. **Judge0 (optional)** → For C/C++/Java, fallback to real compilation/execution via `/api/execute` proxy
5. **Visualization** → Snapshots are rendered in real-time as the user steps through execution

### Judge0 Proxy Architecture

The `/api/execute` endpoint (in [src/app/api/execute/route.ts](src/app/api/execute/route.ts)):
- Receives code execution requests from the browser
- Forwards to Judge0 using the private `JUDGE0_URL` environment variable
- Returns execution results — stdout, stderr, compile output, etc.

**Why this architecture?**
- **No CORS issues** — Browser requests go to your own API, not directly to Judge0
- **Hidden server IP** — Judge0's IP is never exposed to the client
- **Works everywhere** — Same code path for `localhost:3000` and production
- **Secure** — Can add rate limiting or authentication in the API route later

## Development Notes

- Instrumentation happens in [astInstrumenter.ts](src/engine/astInstrumenter.ts) and [transpiler.ts](src/engine/transpiler.ts)
- Runtime state is captured as `Snapshot` objects (see [types.ts](src/engine/types.ts))
- Snapshot parsing and rendering is handled in [snapshotParser.ts](src/engine/snapshotParser.ts) and the visualizer components
- Add new instrumentation features → Update snapshot parser → Update UI components to render new state types

## Deployment on Vercel

When deploying to Vercel:

1. Add environment variable in Vercel dashboard:
   ```
   JUDGE0_URL=http://your-judge0-ip:2358
   ```

2. **Do NOT** use `NEXT_PUBLIC_JUDGE0_URL` — it will expose your Judge0 IP

3. Redeploy after env var changes

The API proxy automatically uses the server-side `JUDGE0_URL` at runtime.

## Contributing

Contributions are welcome! Suggested workflow:

1. Fork the repository
2. Create a feature branch
3. Make your changes and test locally with `npm run dev`
4. Open a pull request describing your changes

Please follow existing code style and test new features thoroughly.

## License

Unless otherwise specified, this repository is provided under the terms chosen by the project owner. Add a `LICENSE` file to make the license explicit.

---

For more details, explore the source files in `src/`. The codebase is well-commented.
