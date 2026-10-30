# Security Policy

## Supported Versions

The following versions of **WIF WORLDS: The Living Map** are actively maintained and supported with security updates:

| Version / Component | Supported | Network |
|---|---|---|
| `WIFWorlds.sol` (`0xaA2dd131f596249755cCcdcC48447C1434Ac109B`) | :white_check_mark: | Robinhood Chain Mainnet (`4663`) |
| Next.js 14 Web Client & API (`main` branch) | :white_check_mark: | Production / Vercel |
| Legacy Genesis Contract (`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`) | :x: (Read-only historical log support) | Robinhood Chain Mainnet (`4663`) |

---

## Security Architecture & Guarantees

1. **Zero Private Key Exposure:**
   - The frontend application never requests, stores, or transmits private keys or seed phrases.
   - All environment variables prefixed with `NEXT_PUBLIC_` contain only public addresses (`NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS`, `NEXT_PUBLIC_WIF_TOKEN_ADDRESS`, `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS`).

2. **Cryptographic Admin Authentication (`/admin` & `/api/admin/*`):**
   - Frontend UI visibility is never trusted as authorization.
   - Administrative API routes require a **single-use cryptographic nonce** signed via EIP-191 (`personal_sign`) by the configured administrator wallet (`0x479253b82Eb63eb36F140EcABf0237cc338084e7`), verified server-side using `viem.verifyMessage`, and bound to an `HttpOnly`, `SameSite=Strict` session token.
   - Onchain administrative functions (`setAdmin`, `setTreasury`, `configureEvent`, `setRegionUnlocked`, `setCosts`) are independently guarded by the `onlyAdmin` modifier in `WIFWorlds.sol`.

3. **Smart Contract Safety (`WIFWorlds.sol`):**
   - Built with Solidity `0.8.24` (built-in overflow/underflow protection).
   - Strict ERC-20 `transferFrom` return value verification for `$WIF` payments directly to the designated `treasury`.
   - Anti-whale territory capacity formula and settlement distance constraints enforced onchain.

---

## Reporting a Vulnerability

If you discover a security vulnerability in the smart contract, authentication flow, or web application:

1. **Do NOT open a public GitHub issue.**
2. Please report the vulnerability privately using [GitHub Private Vulnerability Reporting](https://github.com/OpeyemiMoses/WIF-WORLD/security/advisories/new) on this repository.
3. Include:
   - A clear description of the vulnerability and affected component (`WIFWorlds.sol`, `/api/admin/*`, or frontend).
   - Step-by-step reproduction instructions or a Foundry proof-of-concept test (`contracts/test/`).
   - Potential impact assessment.

We will acknowledge receipt within **48 hours** and coordinate a fix and disclosure timeline with you.
