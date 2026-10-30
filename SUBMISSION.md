<p align="center">
  <img src="./public/brand/logo.svg" alt="WIF WORLDS: The Living Map" width="300" />
</p>

# WIF WORLDS: The Living Map — Official Hackathon Submission Package

**Project Title:** WIF WORLDS: The Living Map  
**Tagline:** A Persistent Multiplayer Onchain Civilization & Resource Economy Built on Robinhood Chain (`4663`) Powered by `$WIF`  
**GitHub Repository:** [https://github.com/OpeyemiMoses/WIF-WORLD](https://github.com/OpeyemiMoses/WIF-WORLD)  
**Live Production URL (Vercel):** [https://wif-world.vercel.app](https://wif-world.vercel.app)  
**Live Production URL (Railway):** [https://wif-world-production.up.railway.app](https://wif-world-production.up.railway.app)  

---

## 1. Live Production & Onchain Deployment Details

| Parameter | Value | Explorer / Link |
|---|---|---|
| **Vercel Production Deployment** | Primary Edge Host | [https://wif-world.vercel.app](https://wif-world.vercel.app) |
| **Railway Production Deployment** | Containerized Host | [https://wif-world-production.up.railway.app](https://wif-world-production.up.railway.app) |
| **Network** | Robinhood Chain Mainnet | Chain ID `4663` (`0x1237`) |
| **RPC Endpoint** | `https://rpc.mainnet.chain.robinhood.com` | Live JSON-RPC |
| **Block Explorer** | Blockscout | [https://robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |
| **Deployed `WIFWorlds` Contract** | `0xaA2dd131f596249755cCcdcC48447C1434Ac109B` | [View Contract on Blockscout](https://robinhoodchain.blockscout.com/address/0xaA2dd131f596249755cCcdcC48447C1434Ac109B) |
| **Official `$WIF` Token** | `0x5173b8eA6923c2d40267890D45C46a3480954773` | [View `$WIF` Token](https://robinhoodchain.blockscout.com/token/0x5173b8eA6923c2d40267890D45C46a3480954773) |
| **Treasury & Owner Wallet** | `0x479253b82Eb63eb36F140EcABf0237cc338084e7` | [View Treasury Wallet](https://robinhoodchain.blockscout.com/address/0x479253b82Eb63eb36F140EcABf0237cc338084e7) |

---

## 2. Verified Onchain Transactions on Robinhood Chain (`4663`)

1. **`WIFWorlds` Smart Contract Deployment (4 Maps • 196 Tiles • 5 Auto-Unlocking Onchain Events • Pioneer State Preserved)**
   - **Tx Hash:** `0xf48366cf80a028a7e4af3c28230aceda787da19a5bda5e32713226ea5f20ea65`
   - **Blockscout Link:** [https://robinhoodchain.blockscout.com/tx/0xf48366cf80a028a7e4af3c28230aceda787da19a5bda5e32713226ea5f20ea65](https://robinhoodchain.blockscout.com/tx/0xf48366cf80a028a7e4af3c28230aceda787da19a5bda5e32713226ea5f20ea65)
   - **Summary:** Deploys `WIFWorlds.sol` (`0xaA2dd131f596249755cCcdcC48447C1434Ac109B`), wires all 4 regions (196 tiles: *The Heartlands*, *The Wild Frontier*, *The Highlands*, and *The Crossroads*), configures all 5 World Events (`events[1..5]`) onchain with automatic sequential unlocking (`1 -> 2 -> 3 -> 4 -> 5`) and automatic event progress on every `$WIF` action, preserves pioneer `0x78b7b043921EE70806c66905E31fc2D9E75455a6`'s territory & resources, binds `$WIF` (`0x5173b8eA6923c2d40267890D45C46a3480954773`), and sets Treasury/Admin to `0x479253b82Eb63eb36F140EcABf0237cc338084e7`.

2. **Official `$WIF` Token Approval for `WIFWorlds` (Block `#101780100`)**
   - **Tx Hash:** `0xab6e44d34f00b86693018242cedf63fcf6761c47f05d2c3cbfcee781681357d8`
   - **Blockscout Link:** [https://robinhoodchain.blockscout.com/tx/0xab6e44d34f00b86693018242cedf63fcf6761c47f05d2c3cbfcee781681357d8](https://robinhoodchain.blockscout.com/tx/0xab6e44d34f00b86693018242cedf63fcf6761c47f05d2c3cbfcee781681357d8)
   - **Summary:** Direct onchain interaction with `$WIF` (`0x5173b8eA6923c2d40267890D45C46a3480954773`) approving `WIFWorlds` (`0xaA2dd131f596249755cCcdcC48447C1434Ac109B`) to spend `$WIF` for land claims, settlements, structures, upgrades, and world events.

3. **Pioneer Land Claim & Earlier Genesis Audit Trail**
   - **Pioneer Tile #31 Claim Tx:** `0x5e8a32d3d68f765eb010b259cf4db558f8d49ed63e096d4ae323ab116cd0111d` (Player `0x78b7b043921EE70806c66905E31fc2D9E75455a6`)
   - **Genesis Deploy Tx:** `0x5fee30d78522008b67fc315ef024b5e51adf59bbb9b576daf6da445d47c0ce3b` (`0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99`)
   - **Event #1 Config Tx:** `0x0e4f8300f770507631a57067f459ae347f37d8d5de4167b4d534e19eb617f443`

---

## 3. Blockscout Browser Verification Settings (Flattened File Included)

Because Blockscout's API sits behind Cloudflare browser challenge protection, we generated a ready-to-upload flattened contract file at [`contracts/WIFWorlds.flattened.sol`](./contracts/WIFWorlds.flattened.sol).

To verify in 30 seconds in your browser:
1. Open [https://robinhoodchain.blockscout.com/address/0xaA2dd131f596249755cCcdcC48447C1434Ac109B?tab=contract](https://robinhoodchain.blockscout.com/address/0xaA2dd131f596249755cCcdcC48447C1434Ac109B?tab=contract) and click **Verify & Publish**.
2. Choose **Solidity (Flattened source code)**.
3. Set **Compiler Version:** `v0.8.24+commit.e11b9ed9`
4. Set **Optimization:** `Yes` (`200` runs) and check **Enable viaIR (`via_ir`: true)**.
5. Paste the contents of `contracts/WIFWorlds.flattened.sol`.
6. (If prompted for ABI-encoded Constructor Arguments):
   ```text
   0000000000000000000000005173b8ea6923c2d40267890d45c46a3480954773000000000000000000000000479253b82eb63eb36f140ecabf0237cc338084e7
   ```

---

## 4. Production Hosting Deployments (Vercel & Railway)

The game is live on two independent cloud infrastructures with full high availability:

1. **Vercel Production Deployment:**
   - URL: [https://wif-world.vercel.app](https://wif-world.vercel.app)
   - Features: Edge CDN caching, instant global serverless routing, zero cold starts.

2. **Railway Production Deployment:**
   - URL: [https://wif-world-production.up.railway.app](https://wif-world-production.up.railway.app)
   - Features: Dedicated containerized Node.js runtime, Nixpacks build system, automated failover.

3. **Submitting to Hackathon Portal:**
   - Submit either [https://wif-world.vercel.app](https://wif-world.vercel.app) or [https://wif-world-production.up.railway.app](https://wif-world-production.up.railway.app) to [https://worldisflat.fun/build](https://worldisflat.fun/build).
