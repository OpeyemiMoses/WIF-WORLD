# Contributing to WIF WORLDS: The Living Map

Thank you for your interest in contributing to **WIF WORLDS**! Whether you are fixing a bug, improving the 3D WebGL2 island renderer, refining smart contract gas efficiency, or enhancing documentation, your contributions are welcome.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Architecture](#project-architecture)
4. [Workflow & Pull Request Process](#workflow--pull-request-process)
5. [Coding & Onchain Safety Standards](#coding--onchain-safety-standards)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Development Environment Setup

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/<your-username>/WIF-WORLD.git
   cd WIF-WORLD
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   > **Security Note:** Never commit private keys, seed phrases, or production secrets into `.env.example` or any tracked file.

3. **Install Frontend Dependencies:**
   ```bash
   npm install
   npm run dev
   ```

4. **Run Smart Contract Tests (Foundry):**
   ```bash
   cd contracts
   forge test -vvv
   ```

---

## Project Architecture

- **`contracts/src/WIFWorlds.sol`**: Core multiplayer civilization smart contract deployed on Robinhood Chain (`4663`).
- **`lib/chain/robinhood.ts`**: Network configuration, EIP-55 address sanitization, and Blockscout explorer helpers.
- **`lib/contract/useWorldState.ts`**: Wagmi v2 / Viem hooks for batch reading all 4 regions (196 tiles), player states, and executing verified onchain transactions.
- **`components/world/IsometricWorldCanvas.tsx`**: Three.js WebGL2 interactive 3D island with 360° orbit, flick inertia, and double-click fly-to-tile camera.

---

## Workflow & Pull Request Process

1. Create a descriptive feature or bugfix branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Verify TypeScript compilation and Next.js production build before committing:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
3. If modifying smart contracts under `contracts/`, ensure all Foundry tests pass:
   ```bash
   cd contracts && forge test
   ```
4. Open a Pull Request against `main` using our [Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md).

---

## Coding & Onchain Safety Standards

- **Strict EIP-55 Address Normalization:** Always normalize EVM addresses via Viem's `getAddress(addr.toLowerCase())` before passing them to contract reads or writes.
- **No Mock Replacement of Onchain State:** Do not replace working Robinhood Chain (`4663`) contract reads or `$WIF` token flows with fake client-side state.
- **Admin Route Isolation:** Keep all administrative routes (`/admin`) and APIs (`/api/admin/*`) strictly gated by cryptographic wallet signature verification and `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`.
