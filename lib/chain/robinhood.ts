import { defineChain, getAddress, isAddress } from "viem";

export const ROBINHOOD_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID || "4663"
);

export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export const ROBINHOOD_EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  "https://robinhoodchain.blockscout.com";

function safeChecksumAddress(val?: string | null, fallback?: `0x${string}`): `0x${string}` | null {
  if (!val) return fallback ?? null;
  const trimmed = val.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return fallback ?? null;
  try {
    return getAddress(trimmed.toLowerCase());
  } catch {
    return fallback ?? null;
  }
}

export const WIF_TOKEN_ADDRESS = safeChecksumAddress(
  process.env.NEXT_PUBLIC_WIF_TOKEN_ADDRESS,
  "0x5173b8eA6923c2d40267890D45C46a3480954773"
)!;

export const TREASURY_ADDRESS = safeChecksumAddress(
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  "0x479253b82Eb63eb36F140EcABf0237cc338084e7"
)!;

export const ADMIN_WALLET_ADDRESS = safeChecksumAddress(
  process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
  TREASURY_ADDRESS
)!;

export const WIF_DECIMALS = 18;

const rawContract =
  process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_WIF_WORLDS_CONTRACT ||
  "0xaA2dd131f596249755cCcdcC48447C1434Ac109B";

export const WIF_WORLDS_CONTRACT_ADDRESS: `0x${string}` | null =
  safeChecksumAddress(
    rawContract,
    "0xaA2dd131f596249755cCcdcC48447C1434Ac109B"
  );

export const LEGACY_WIF_WORLDS_CONTRACTS: `0x${string}`[] = [
  "0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99",
];

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
