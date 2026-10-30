# WIF WORLDS: The Living Map — Official Hackathon Submission Package

**Project Title:** WIF WORLDS: The Living Map  
**Tagline:** A Persistent Multiplayer Onchain Civilization & Resource Economy Built on Robinhood Chain (`4663`) Powered by `$WIF`  
**GitHub Repository:** [https://github.com/OpeyemiMoses/WIF-WORLD](https://github.com/OpeyemiMoses/WIF-WORLD)  

---

## 1. Live Onchain Deployment & Verification Details

| Parameter | Value | Explorer / Link |
|---|---|---|
| **Network** | Robinhood Chain Mainnet | Chain ID `4663` (`0x1237`) |
| **RPC Endpoint** | `https://rpc.mainnet.chain.robinhood.com` | Live JSON-RPC |
| **Block Explorer** | Blockscout | [https://robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| **Deployed `WIFWorlds` Contract** | `0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99` | [View Contract on Blockscout](https://robinhoodchain.blockscout.com/address/0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99) |
| **Official `$WIF` Token** | `0x5173b8eA6923c2d40267890D45C46a3480954773` | [View `$WIF` Token](https://robinhoodchain.blockscout.com/token/0x5173b8eA6923c2d40267890D45C46a3480954773) |
| **Treasury & Owner Wallet** | `0x479253b82Eb63eb36F140EcABf0237cc338084e7` | [View Treasury Wallet](https://robinhoodchain.blockscout.com/address/0x479253b82Eb63eb36F140EcABf0237cc338084e7) |

---

## 2. Verified Onchain Transactions on Robinhood Chain (`4663`)

1. **`WIFWorlds` Smart Contract Deployment (Block `#101754294`)**
   - **Tx Hash:** `0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b`
   - **Blockscout Link:** [https://robinhoodchain.blockscout.com/tx/0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b](https://robinhoodchain.blockscout.com/tx/0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b)
   - **Summary:** Deploys `WIFWorlds.sol`, initializes all 49 deterministic tiles in *Region 0: The Heartlands* and 49 frontier tiles in *Region 1: The Wild Frontier*, binds `$WIF` (`0x5173b8eA6923c2d40267890D45C46a3480954773`), and sets Treasury/Admin to `0x479253b82Eb63eb36F140EcABf0237cc338084e7`.

2. **Official `$WIF` Token Approval for `WIFWorlds` (Block `#101755527`)**
   - **Tx Hash:** `0x2127fdfd12dc09d515dd9ceda8595e99636f7f030d98966df0a0d778db240f46`
   - **Blockscout Link:** [https://robinhoodchain.blockscout.com/tx/0x2127fdfd12dc09d515dd9ceda8595e99636f7f030d98966df0a0d778db240f46](https://robinhoodchain.blockscout.com/tx/0x2127fdfd12dc09d515dd9ceda8595e99636f7f030d98966df0a0d778db240f46)
   - **Summary:** Direct onchain interaction with `$WIF` (`0x5173b8eA6923c2d40267890D45C46a3480954773`) approving `WIFWorlds` (`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`) to spend `$WIF` for land claims, settlements, structures, upgrades, and world events.

3. **World Event #1 (*The Great Bridge*) Onchain Configuration (Block `#101755583`)**
   - **Tx Hash:** `0x0e4f8300f770507631a57067f459ae347f37d8d5de4167b4d534e19eb617f443`
   - **Blockscout Link:** [https://robinhoodchain.blockscout.com/tx/0x0e4f8300f770507631a57067f459ae347f37d8d5de4167b4d534e19eb617f443](https://robinhoodchain.blockscout.com/tx/0x0e4f8300f770507631a57067f459ae347f37d8d5de4167b4d534e19eb617f443)
   - **Summary:** Emits `EventConfigured(1, "The Great Bridge", 1250000000000000000000, 1, true)` on `WIFWorlds` (`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`).

---

## 3. Blockscout Browser Verification Settings (Flattened File Included)

Because Blockscout's API sits behind Cloudflare browser challenge protection, we generated a ready-to-upload flattened contract file at [`contracts/WIFWorlds.flattened.sol`](./contracts/WIFWorlds.flattened.sol).

To verify in 30 seconds in your browser:
1. Open [https://robinhoodchain.blockscout.com/address/0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99?tab=contract](https://robinhoodchain.blockscout.com/address/0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99?tab=contract) and click **Verify & Publish**.
2. Choose **Solidity (Flattened source code)**.
3. Set **Compiler Version:** `v0.8.24+commit.e11b9ed9`
4. Set **Optimization:** `Yes` (`200` runs) and check **Enable viaIR (`via_ir`: true)**.
5. Paste the contents of `contracts/WIFWorlds.flattened.sol`.
6. (If prompted for ABI-encoded Constructor Arguments):
   ```text
   0000000000000000000000005173b8ea6923c2d40267890d45c46a3480954773000000000000000000000000479253b82eb63eb36f140ecabf0237cc338084e7
   ```

---

## 4. Production Hosting Deployment (Vercel)

All environment defaults (`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`, `$WIF`, Treasury, RPC, and Explorer) are pre-wired in `lib/chain/robinhood.ts` and `.env.example`:

1. Import `https://github.com/OpeyemiMoses/WIF-WORLD` on [Vercel](https://vercel.com/new).
2. Click **Deploy** (zero manual configuration required; optionally add `ADMIN_SESSION_SECRET` for admin cookie signing).
3. Submit the resulting live `.vercel.app` URL to [https://worldisflat.fun/build](https://worldisflat.fun/build).
