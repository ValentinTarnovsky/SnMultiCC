<div align="center">

# SnMultiCC — Multi Command Consoles

**A personal command center for the `Sn` brand.**
Open *sets* of multiple terminals and AI CLI sessions (Claude Code, Codex, custom) in a draggable mosaic — like a branded, multi-agent workspace.

*Engineered in silence.*

</div>

---

> ⚠️ **Status: early development (`v0.x`).** Building in public as a VibeCoding showcase.

## What it is

A collapsible sidebar lists **workspaces** (not chats). Opening a workspace shows a **draggable / resizable dockable mosaic** of real shells (PowerShell on Windows, zsh/bash on macOS/Linux) and AI CLI panes. Each workspace defines its panes and a working directory; reusable **agent presets** let you launch N sessions of Claude Code / Codex / any custom command.

## Tech

- **Electron** + **React** + **Vite** + **TypeScript** (via [`electron-vite`](https://electron-vite.org))
- Terminals: [`xterm.js`](https://xtermjs.org) + [`node-pty`](https://github.com/microsoft/node-pty)
- Layout: [`dockview`](https://dockview.dev)
- Styling: **Tailwind CSS v4**, `framer-motion`, `lucide-react`, `zustand`, `zod`
- Packaging: `electron-builder` (portable + installers for Windows 10+, macOS, Linux)

## Development

```bash
npm install
npm run dev        # launch the app with HMR
npm run typecheck  # type-check main + renderer
```

## Build

```bash
npm run dist:win   # Windows: NSIS installer + portable .exe
npm run dist:mac   # macOS: dmg + zip
npm run dist:linux # Linux: AppImage + deb
```

## License

[MIT](./LICENSE) © Valentin Tarnovsky
