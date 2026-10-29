# WIF WORLDS — The Living Map

A persistent, multiplayer onchain strategy game built on **Robinhood Chain** (`Chain ID 4663`) and powered by **$WIF** (`0x5173b8ea6923c2d40267890d45c46a3480954773`).

## Overview

Players enter a shared deterministic **7 × 7 floating island world (49 tiles)** where every territory claim, settlement citadel, frontier outpost, artisan workshop, signal beacon, and regional objective contribution is recorded directly onchain.

- **No simulated transactions or fabricated leaderboards**: All world ownership, balances, allowances, and event contributions are read from Robinhood Chain.
- **Persistent shared state**: Every confirmed $WIF action permanently shapes the map for all players.

## Verified Network Configuration

| Parameter | Value |
|---|---|
| Network Name | Robinhood Chain |
| Chain ID | `4663` (`0x1237`) |
| RPC URL | `https://rpc.mainnet.chain.robinhood.com` |
| Block Explorer | `https://robinhoodchain.blockscout.com` |
| Official `$WIF` Token | `0x5173b8ea6923c2d40267890d45c46a3480954773` (18 decimals) |

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Disclaimer

WIF WORLDS is an independent project created for the World is Flat Hackathon and is not affiliated with, endorsed by, or officially connected with Robinhood Markets, Inc.

