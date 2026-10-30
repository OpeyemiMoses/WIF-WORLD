# WIF WORLDS — The Living Map

A persistent, multiplayer onchain strategy & civilization game built on **Robinhood Chain** (`Chain ID 4663`) and powered by **$WIF** (`0x5173b8ea6923c2d40267890d45c46a3480954773`).

## Live Onchain Deployment (Robinhood Chain `4663`)

| Parameter | Value |
|---|---|
| **Network Name** | Robinhood Chain |
| **Chain ID** | `4663` (`0x1237`) |
| **RPC URL** | `https://rpc.mainnet.chain.robinhood.com` |
| **Block Explorer** | [https://robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| **`WIFWorlds` Game Contract** | [`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`](https://robinhoodchain.blockscout.com/address/0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99) |
| **Official `$WIF` Token** | [`0x5173b8ea6923c2d40267890d45c46a3480954773`](https://robinhoodchain.blockscout.com/token/0x5173b8ea6923c2d40267890d45c46a3480954773) (18 decimals) |
| **Treasury & Admin Wallet** | [`0x479253b82Eb63eb36F140EcABf0237cc338084e7`](https://robinhoodchain.blockscout.com/address/0x479253b82Eb63eb36F140EcABf0237cc338084e7) |
| **Deployment Transaction** | [`0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b`](https://robinhoodchain.blockscout.com/tx/0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b) |

## Core Gameplay Systems

- **Real-Time WebGL2 3D Isometric Living Island:** 49 tiles per region with 360° gyro orbit, flick inertia, and double-click fly-to-tile camera zoom.
- **3-Tier Civilization Progression:** Settlements (Lv. 1–5 from Hamlet to Sovereign Capital) → Territories (anti-whale capacity formula `3 + 3S + 2U + 2O`) → Regions (*The Heartlands* & *The Wild Frontier*).
- **In-Game Resource Economy:** Lumber Camps (`Wood`), Quarries (`Stone`), and Farms (`Food`) with terrain specialization bonuses, plus Workshops, Outposts, and Signal Beacons.
- **Live Multiplayer Systems:** Guided 7-Step Pioneer Onboarding, Live Onchain Activity Feed (`/activity`), Wallet-Isolated Notification Center, Community World Events (*The Great Bridge* at `/events`), and Private Treasury Owner Admin Dashboard (`/admin`).

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Disclaimer

WIF WORLDS is an independent project created for the World is Flat Hackathon and is not affiliated with, endorsed by, or officially connected with Robinhood Markets, Inc.
