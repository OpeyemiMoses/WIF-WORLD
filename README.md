# WIF WORLDS — The Living Map

A persistent, multiplayer onchain strategy & civilization game built on **Robinhood Chain** (`Chain ID 4663`) and powered by **$WIF** (`0x5173b8ea6923c2d40267890d45c46a3480954773`).

## Live Onchain Deployment (Robinhood Chain `4663`)

| Parameter | Value |
|---|---|
| **Network Name** | Robinhood Chain |
| **Chain ID** | `4663` (`0x1237`) |
| **RPC URL** | `https://rpc.mainnet.chain.robinhood.com` |
| **Block Explorer** | [https://robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| **`WIFWorlds` Game Contract** | [`0xAa2dd131F596249755CCcdcc48447C1434AC109B`](https://robinhoodchain.blockscout.com/address/0xAa2dd131F596249755CCcdcc48447C1434AC109B) |
| **Official `$WIF` Token** | [`0x5173b8ea6923c2d40267890d45c46a3480954773`](https://robinhoodchain.blockscout.com/token/0x5173b8ea6923c2d40267890d45c46a3480954773) (18 decimals) |
| **Treasury & Admin Wallet** | [`0x479253b82Eb63eb36F140EcABf0237cc338084e7`](https://robinhoodchain.blockscout.com/address/0x479253b82Eb63eb36F140EcABf0237cc338084e7) |
| **Deployment Transaction** | [`0xf48366cf80a028a7e4af3c28230aceda787da19a5bda5e32713226ea5f20ea65`](https://robinhoodchain.blockscout.com/tx/0xf48366cf80a028a7e4af3c28230aceda787da19a5bda5e32713226ea5f20ea65) |
| **`$WIF` Token Approval Tx** | [`0xab6e44d34f00b86693018242cedf63fcf6761c47f05d2c3cbfcee781681357d8`](https://robinhoodchain.blockscout.com/tx/0xab6e44d34f00b86693018242cedf63fcf6761c47f05d2c3cbfcee781681357d8) |

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
