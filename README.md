# Cinematic Chess

A local-first cinematic chess application. Requires Node.js 18 or newer.

## Open in VS Code

Open this project folder in VS Code. In the integrated terminal at the project root, install the client dependencies once:

```powershell
npm --prefix client install
```

### Development mode

Run these from the project root in two VS Code terminals. The Vite development server reloads source edits automatically:

```powershell
npm run server
```

```powershell
npm run dev
```

Open `http://localhost:5173`. Keep both terminals running for accounts and online play.

### Single-server local mode

Start from the project root. `npm start` rebuilds the frontend first, then starts the app, API and WebSocket server on one port, so it cannot serve an old `dist` bundle:

```powershell
npm run build
npm start
```

Open `http://localhost:3001`. The server will serve `client/dist` when that build exists.

## Features

- Full chess rules, promotion, move notation, check, game results and local two-player play.
- Interactive 3D board, two visible player-side hands, a physical digital chess clock that flashes and depresses after each move, synthesized move/capture/check sounds, board and piece finishes, and sound volume preferences.
- Full-page interactive 3D chessboard canvas on the homepage, brighter warm-neutral surfaces, soft lighting, and eased interface transitions.
- Modern polished chessmen with distinct sculpted silhouettes, metal trim, refined finishes, and a smooth lifted movement arc.
- Timed games with increment; a separate Web Worker local computer opponent with selectable search depth.
- Quick matchmaking and private friend rooms over WebSocket, server-validated moves, server-authoritative clocks, draw offers, resignation and reconnect grace period.
- Guest play and optional accounts, password hashing, signed sessions, account preferences, match history and W/L/D statistics.
- Responsive layout, lazy scene loading, WebGL fallback and production build.

## Data and deployment notes

Accounts and completed match records are stored locally in `server/data/users.json` and `server/data/matches.json` (ignored by Git). Active rooms are held in memory and are lost when the server stops. This is a self-contained local deployment, not a hosted service.

The computer player is a small alpha-beta search engine, not Stockfish. Players are represented by procedural forearms and hands rather than full characters. Account and match storage uses local JSON files, not PostgreSQL, and online ratings are not implemented. Public hosting needs a persistent `SESSION_SECRET`, HTTPS/WSS, durable database and deployment configuration. Use `.env.example` as the starting point for local environment settings.

## Final verification commands

```powershell
npm run typecheck
npm run build
```
