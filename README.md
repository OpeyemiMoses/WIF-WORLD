# WIF WORLDS — The Living Map

A persistent, multiplayer onchain strategy & civilization game built on **Robinhood Chain** (`Chain ID 4663`) and powered by **$WIF** (`0x5173b8ea6923c2d40267890d45c46a3480954773`).

## Live Onchain Deployment (Robinhood Chain `4663`)

| Parameter | Value |
|---|---|
| **Network Name** | Robinhood Chain |
| **Chain ID** | `4663` (`0x1237`) |
| **RPC URL** | `https://rpc.mainnet.chain.robinhood.com` |
| **Block Explorer** | [https://robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| **`WIFWorlds` Game Contract** | [`0x8936a00177AeB875c67C03EA019b1577aD8C0aa1`](https://robinhoodchain.blockscout.com/address/0x8936a00177AeB875c67C03EA019b1577aD8C0aa1) |
| **Official `$WIF` Token** | [`0x5173b8ea6923c2d40267890d45c46a3480954773`](https://robinhoodchain.blockscout.com/token/0x5173b8ea6923c2d40267890d45c46a3480954773) (18 decimals) |
| **Treasury & Admin Wallet** | [`0x479253b82Eb63eb36F140EcABf0237cc338084e7`](https://robinhoodchain.blockscout.com/address/0x479253b82Eb63eb36F140EcABf0237cc338084e7) |
| **Deployment Transaction** | [`0x7c9cb54559125d853429526cae33e7d066245d96e5edceecf5301fd051dd3d8d`](https://robinhoodchain.blockscout.com/tx/0x7c9cb54559125d853429526cae33e7d066245d96e5edceecf5301fd051dd3d8d) |
| **`$WIF` Token Approval Tx** | [`0x7d800a147122806974a13fd1dfe7fbef81309b687a32be98c02bcdc20059bff9`](https://robinhoodchain.blockscout.com/tx/0x7d800a147122806974a13fd1dfe7fbef81309b687a32be98c02bcdc20059bff9) |

## Core Gameplay Systems

- **Real-Time WebGL2 3D Isometric Living Island (4 Regions • 196 Onchain Tiles):** 49 tiles per region across *The Heartlands*, *The Wild Frontier*, *The Highlands*, and *The Crossroads*, with 360° gyro orbit, flick inertia, double-click fly-to-tile camera zoom, and mobile landscape mode guard.
- **3-Tier Civilization Progression:** Settlements (Lv. 1–5 from Hamlet to Sovereign Capital) → Territories (anti-whale capacity formula `3 + 3S + 2U + 2O`) → Regions (all 4 maps wired onchain).
- **In-Game Resource Economy:** Lumber Camps (`Wood`), Quarries (`Stone`), and Farms (`Food`) with terrain specialization bonuses, plus Workshops, Outposts, and Signal Beacons.
- **Live Multiplayer Systems:** Guided 7-Step Pioneer Onboarding, Live Onchain Activity Feed (`/activity`), Wallet-Isolated Notification Center, 5 Onchain Configured Community World Events (`/events`), and Private Treasury Owner Admin Dashboard (`/admin`).

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Disclaimer

WIF WORLDS is an independent project created for the World is Flat Hackathon and is not affiliated with, endorsed by, or officially connected with Robinhood Markets, Inc.
