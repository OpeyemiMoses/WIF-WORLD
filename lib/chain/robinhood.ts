import { defineChain } from "viem";

export const ROBINHOOD_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID || "4663"
);

export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export const ROBINHOOD_EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  "https://robinhoodchain.blockscout.com";

export const WIF_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_WIF_TOKEN_ADDRESS ||
  "0x5173b8ea6923c2d40267890d45c46a3480954773") as `0x${string}`;

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
  "0x479253b82eb63eb36f140ecabf0237cc338084e7") as `0x${string}`;

export const ADMIN_WALLET_ADDRESS = (process.env
  .NEXT_PUBLIC_ADMIN_WALLET_ADDRESS ||
  TREASURY_ADDRESS) as `0x${string}`;

export const WIF_DECIMALS = 18;

const rawContract = (
  process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_WIF_WORLDS_CONTRACT ||
  "0x8936a00177AeB875c67C03EA019b1577aD8C0aa1"
).trim();

export const WIF_WORLDS_CONTRACT_ADDRESS: `0x${string}` | null =
  /^0x[a-fA-F0-9]{40}$/.test(rawContract)
    ? (rawContract as `0x${string}`)
    : "0x8936a00177AeB875c67C03EA019b1577aD8C0aa1";

export function isAuthorizedAdminAddress(
  address?: string | null
): boolean {
  if (!address || !ADMIN_WALLET_ADDRESS) return false;
  return address.trim().toLowerCase() === ADMIN_WALLET_ADDRESS.trim().toLowerCase();
}

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ROBINHOOD_RPC_URL],
    },
    public: {
      http: [ROBINHOOD_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: ROBINHOOD_EXPLORER_URL,
    },
  },
});

export function explorerTxUrl(txHash: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/address/${address}`;
}

export function explorerTokenUrl(address: string = WIF_TOKEN_ADDRESS): string {
  return `${ROBINHOOD_EXPLORER_URL}/token/${address}`;
}
