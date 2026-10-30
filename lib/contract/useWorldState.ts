"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { parseUnits } from "viem";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
  ROBINHOOD_RPC_URL,
  WIF_DECIMALS,
  WIF_TOKEN_ADDRESS,
  WIF_WORLDS_CONTRACT_ADDRESS,
} from "@/lib/chain/robinhood";
import {
  ERC20_ABI,
  EVENT_CONTRIBUTION_EVENT,
  REGION_UNLOCKED_EVENT,
  RESOURCES_HARVESTED_EVENT,
  SETTLEMENT_BUILT_EVENT,
  SETTLEMENT_UPGRADED_EVENT,
  STRUCTURE_BUILT_EVENT,
  TILE_CLAIMED_EVENT,
  WIF_WORLDS_ABI,
} from "@/lib/contract/abi";
import {
  BEACON_TARGET_TILE_ID,
  computeActivityScore,
  computeMaxClaimableTiles,
  computeProgressionStage,
  computeResourceStorageCap,
  createGenesisRegionTiles,
  DEFAULT_COSTS,
  evaluateMissions,
  getBuilderTitle,
  getNextSettlementCost,
  getNextSettlementResourceCost,
  getStructureProductionOnTerrain,
  manhattanDistance,
  MAX_SETTLEMENT_LEVEL,
  MAX_SETTLEMENTS_PER_REGION,
  MIN_SETTLEMENT_MANHATTAN_DISTANCE,
  MissionStatus,
  parseWorldTileId,
  PlayerStats,
  RegionalBuilderRanking,
  ResourceCost,
  SETTLEMENT_TIER_META,
  SettlementLevel,
  STRUCTURE_META,
  StructureType,
  TerrainType,
  TileState,
  VerifiedActivityItem,
  WorldEventState,
  ZERO_ADDRESS,
} from "@/lib/game/worldData";

export type TxLifecycleStage =
  | "idle"
  | "awaiting_wallet"
  | "wallet_rejected"
  | "submitted"
  | "pending"
  | "refreshing"
  | "confirmed"
  | "failed";

const SANDBOX_STORAGE_KEY = "wif_worlds_phase1_1_sandbox_v1";
const LOCAL_DEMO_PLAYER: `0x${string}` =
  "0xA11CE0000000000000000000000000000000B0B1";

const PIONEER_NEIGHBORS: Record<string, string> = {
  "0x71c8f92b4019e2a41b00d8f21349a21f88e49a21": "Vanguard Citadel",
  "0x38f4d109c7721b8e9012a4f50012c9e112344b9e": "Ironwood Timber Guild",
  "0x94a2b810e5519c0d4418f7e32901b4a09988c103": "Sungrain Agrarian Ward",
};

interface SandboxWorldStore {
  tilesByWorldId: Record<
    number,
    {
      owner: `0x${string}`;
      settlementLevel: number;
      structureType: StructureType;
      claimedAt: number;
    }
  >;
  resourcesByPlayer: Record<
    string,
    {
      wood: number;
      stone: number;
      food: number;
      lastResourceSync: number;
      eventsContributedCount: number;
      totalEventWifContributed: string;
    }
  >;
  eventTotalContributed: string;
  eventCompleted: boolean;
  region1Unlocked: boolean;
  activities: Array<{
    id: string;
    kind: VerifiedActivityItem["kind"];
    player: `0x${string}`;
    tileId?: number;
    newLevel?: number;
    structureType?: StructureType;
    eventId?: number;
    regionId?: number;
    resourcesAdded?: ResourceCost;
    wifAmount: string;
    txHash: `0x${string}`;
    blockNumber: string;
    timestamp: number;
  }>;
}

function createInitialSandboxStore(): SandboxWorldStore {
  const nowSec = Math.floor(Date.now() / 1000);
  const p1 = "0x71C8F92b4019E2A41b00D8F21349a21F88E49A21" as `0x${string}`;
  const p2 = "0x38F4D109C7721B8E9012A4F50012C9E112344B9E" as `0x${string}`;
  const p3 = "0x94A2B810E5519C0D4418F7E32901B4A09988C103" as `0x${string}`;

  return {
    tilesByWorldId: {
      // Pioneer 1: Vanguard Citadel (North-West / Central-West)
      8: {
        owner: p1,
        settlementLevel: 3,
        structureType: StructureType.LumberCamp,
        claimedAt: nowSec - 7200,
      },
      9: {
        owner: p1,
        settlementLevel: 0,
        structureType: StructureType.Farm,
        claimedAt: nowSec - 6800,
      },
      10: {
        owner: p1,
        settlementLevel: 0,
        structureType: StructureType.Quarry,
        claimedAt: nowSec - 6400,
      },
      15: {
        owner: p1,
        settlementLevel: 0,
        structureType: StructureType.Workshop,
        claimedAt: nowSec - 5800,
      },
      1: {
        owner: p1,
        settlementLevel: 0,
        structureType: StructureType.Beacon,
        claimedAt: nowSec - 5200,
      },
      // Pioneer 2: Ironwood Timber Guild (East / North-East)
      11: {
        owner: p2,
        settlementLevel: 2,
        structureType: StructureType.LumberCamp,
        claimedAt: nowSec - 6100,
      },
      12: {
        owner: p2,
        settlementLevel: 0,
        structureType: StructureType.Farm,
        claimedAt: nowSec - 5400,
      },
      13: {
        owner: p2,
        settlementLevel: 0,
        structureType: StructureType.Quarry,
        claimedAt: nowSec - 4900,
      },
      19: {
        owner: p2,
        settlementLevel: 0,
        structureType: StructureType.Outpost,
        claimedAt: nowSec - 4300,
      },
      // Pioneer 3: Sungrain Agrarian Ward (South)
      37: {
        owner: p3,
        settlementLevel: 2,
        structureType: StructureType.Farm,
        claimedAt: nowSec - 5000,
      },
      38: {
        owner: p3,
        settlementLevel: 0,
        structureType: StructureType.Workshop,
        claimedAt: nowSec - 4200,
      },
      39: {
        owner: p3,
        settlementLevel: 0,
        structureType: StructureType.LumberCamp,
        claimedAt: nowSec - 3800,
      },
    },
    resourcesByPlayer: {
      [p1.toLowerCase()]: {
        wood: 340,
        stone: 260,
        food: 310,
        lastResourceSync: nowSec - 600,
        eventsContributedCount: 2,
        totalEventWifContributed: parseUnits("250", WIF_DECIMALS).toString(),
      },
      [p2.toLowerCase()]: {
        wood: 280,
        stone: 190,
        food: 220,
        lastResourceSync: nowSec - 600,
        eventsContributedCount: 1,
        totalEventWifContributed: parseUnits("125", WIF_DECIMALS).toString(),
      },
      [p3.toLowerCase()]: {
        wood: 210,
        stone: 145,
        food: 295,
        lastResourceSync: nowSec - 600,
        eventsContributedCount: 1,
        totalEventWifContributed: parseUnits("100", WIF_DECIMALS).toString(),
      },
    },
    eventTotalContributed: parseUnits("475", WIF_DECIMALS).toString(),
    eventCompleted: false,
    region1Unlocked: false,
    activities: [
      {
        id: "seed-1",
        kind: "structure",
        player: p1,
        tileId: 1,
        structureType: StructureType.Beacon,
        wifAmount: DEFAULT_COSTS.beacon.toString(),
        txHash: "0x8a91f4c2019b7712e9401a88c3102f94e11209c84412b0091823746519283746",
        blockNumber: "1940210",
        timestamp: nowSec - 900,
      },
      {
        id: "seed-2",
        kind: "upgrade",
        player: p1,
        tileId: 8,
        newLevel: 3,
        wifAmount: DEFAULT_COSTS.upgradeToLv3.toString(),
        txHash: "0x7b82e3d1908a6601d8300b77b2091e83d00198b73301a9980712635408172635",
        blockNumber: "1940180",
        timestamp: nowSec - 1500,
      },
      {
        id: "seed-3",
        kind: "structure",
        player: p2,
        tileId: 13,
        structureType: StructureType.Quarry,
        wifAmount: DEFAULT_COSTS.quarry.toString(),
        txHash: "0x6c73d2c0897f5590c7299a66a1980d72c99087a62290f8879601524397061524",
        blockNumber: "1940145",
        timestamp: nowSec - 2100,
      },
      {
        id: "seed-4",
        kind: "structure",
        player: p3,
        tileId: 37,
        structureType: StructureType.Farm,
        wifAmount: DEFAULT_COSTS.farm.toString(),
        txHash: "0x5d64c1b9786e4489b6188f55f0879c61b88976f51189e7768590413286950413",
        blockNumber: "1940110",
        timestamp: nowSec - 2800,
      },
      {
        id: "seed-5",
        kind: "event",
        player: p1,
        eventId: 1,
        wifAmount: parseUnits("250", WIF_DECIMALS).toString(),
        txHash: "0x4e55b0a8675d3378a5077e44e9768b50a77865e40078d6657489302175849302",
        blockNumber: "1940080",
        timestamp: nowSec - 3400,
      },
    ],
  };
}

function loadSandboxStore(): SandboxWorldStore {
  if (typeof window === "undefined") return createInitialSandboxStore();
  try {
    const raw = window.localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) {
      const init = createInitialSandboxStore();
      window.localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw) as SandboxWorldStore;
  } catch {
    return createInitialSandboxStore();
  }
}

function saveSandboxStore(store: SandboxWorldStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("wif-sandbox-updated"));
  } catch {
    // ignore storage quota errors
  }
}

export function useRobinhoodWallet() {
  const { address, isConnected, chainId, status } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isWrongNetwork = Boolean(
    isConnected && chainId !== undefined && chainId !== ROBINHOOD_CHAIN_ID
  );

  const {
    data: ethBalanceData,
    refetch: refetchEthBalance,
    isLoading: isLoadingEth,
  } = useBalance({
    address,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const {
    data: wifBalanceRaw,
    refetch: refetchWifBalance,
    isLoading: isLoadingWif,
    isError: isWifReadError,
  } = useReadContract({
    address: WIF_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const { data: wifAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: WIF_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && WIF_WORLDS_CONTRACT_ADDRESS
        ? [address, WIF_WORLDS_CONTRACT_ADDRESS]
        : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: Boolean(address && WIF_WORLDS_CONTRACT_ADDRESS) },
  });

  const switchToRobinhood = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (
        code === 4902 &&
        typeof window !== "undefined" &&
        (
          window as unknown as {
            ethereum?: { request: (args: unknown) => Promise<unknown> };
          }
        ).ethereum
      ) {
        const eth = (
          window as unknown as {
            ethereum: { request: (args: unknown) => Promise<unknown> };
          }
        ).ethereum;
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${ROBINHOOD_CHAIN_ID.toString(16)}`,
              chainName: "Robinhood Chain",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [ROBINHOOD_RPC_URL],
              blockExplorerUrls: [ROBINHOOD_EXPLORER_URL],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }, [switchChainAsync]);

  return {
    address,
    effectivePlayerAddress: (address ?? LOCAL_DEMO_PLAYER) as `0x${string}`,
    isConnected,
    status,
    chainId,
    isWrongNetwork,
    isSwitchingChain,
    switchToRobinhood,
    ethBalance: ethBalanceData?.value ?? 0n,
    wifBalance: (wifBalanceRaw as bigint | undefined) ?? 0n,
    wifAllowance: (wifAllowanceRaw as bigint | undefined) ?? 0n,
    isLoadingBalances: isLoadingEth || isLoadingWif,
    isWifReadError,
    refetchBalances: async () => {
      await Promise.all([
        refetchEthBalance(),
        refetchWifBalance(),
        refetchAllowance(),
      ]);
    },
  };
}

function computeRatesFromTiles(
  playerTiles: TileState[]
): { woodPerHour: number; stonePerHour: number; foodPerHour: number } {
  let woodPerHour = playerTiles.length > 0 ? 10 : 0;
  let stonePerHour = playerTiles.length > 0 ? 5 : 0;
  let foodPerHour = playerTiles.length > 0 ? 10 : 0;

  for (const t of playerTiles) {
    if (t.settlementLevel >= 1) {
      woodPerHour += 20;
      stonePerHour += 10;
      foodPerHour += 20;
    }
    if (t.settlementLevel >= 2) {
      woodPerHour += 15;
      stonePerHour += 10;
      foodPerHour += 15;
    }
    if (t.settlementLevel >= 3) {
      woodPerHour += 25;
      stonePerHour += 20;
      foodPerHour += 25;
    }
    if (t.settlementLevel >= 4) {
      woodPerHour += 35;
      stonePerHour += 30;
      foodPerHour += 35;
    }
    if (t.settlementLevel >= 5) {
      woodPerHour += 50;
      stonePerHour += 45;
      foodPerHour += 50;
    }

    if (t.structureType !== StructureType.None) {
      const prod = getStructureProductionOnTerrain(t.structureType, t.terrain);
      woodPerHour += prod.wood;
      stonePerHour += prod.stone;
      foodPerHour += prod.food;
    }
  }

  return { woodPerHour, stonePerHour, foodPerHour };
}

function mapRawRegionTiles(
  rawMap:
    | ReadonlyArray<{
        worldTileId: number;
        regionId: number;
        terrain: number;
        owner: `0x${string}`;
        settlementLevel: number;
        structureType: number;
        claimedAt: number;
      }>
    | undefined,
  regionId: number,
  isContractDeployed: boolean,
  sandboxStore: SandboxWorldStore | null
): TileState[] {
  const baseTiles = createGenesisRegionTiles(regionId);

  if (!isContractDeployed || !rawMap || rawMap.length !== 49) {
    if (!sandboxStore) return baseTiles;
    return baseTiles.map((tile) => {
      const ov = sandboxStore.tilesByWorldId[tile.id];
      if (!ov) return tile;
      return {
        ...tile,
        owner: ov.owner,
        settlementLevel: ov.settlementLevel,
        hasSettlement: ov.settlementLevel > 0,
        structureType: ov.structureType,
        claimedAt: ov.claimedAt,
      };
    });
  }

  return rawMap.map((t, idx) => {
    const worldId = Number(t.worldTileId ?? regionId * 49 + idx);
    const { localTileId, row, col } = parseWorldTileId(worldId);
    const settlementLevel = Number(t.settlementLevel ?? 0);
    return {
      id: worldId,
      localId: localTileId,
      regionId: Number(t.regionId ?? regionId),
      row,
      col,
      terrain: Number(t.terrain) as TerrainType,
      owner: t.owner,
      settlementLevel,
      hasSettlement: settlementLevel > 0,
      structureType: Number(t.structureType) as StructureType,
      claimedAt: Number(t.claimedAt),
      isEventTarget: worldId === BEACON_TARGET_TILE_ID,
    };
  });
}

export function useWorldData(
  targetProfileAddress?: `0x${string}`,
  activeRegionId = 0
) {
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const isContractDeployed = Boolean(WIF_WORLDS_CONTRACT_ADDRESS);
  const contractAddress = (WIF_WORLDS_CONTRACT_ADDRESS ??
    ZERO_ADDRESS) as `0x${string}`;

  const effectiveProfileAddress = (targetProfileAddress ??
    LOCAL_DEMO_PLAYER) as `0x${string}`;

  const [sandboxStore, setSandboxStore] = useState<SandboxWorldStore | null>(
    null
  );
  const [nowSec, setNowSec] = useState<number>(() =>
    Math.floor(Date.now() / 1000)
  );

  useEffect(() => {
    setSandboxStore(loadSandboxStore());
    const onSandboxUpdate = () => setSandboxStore(loadSandboxStore());
    window.addEventListener("wif-sandbox-updated", onSandboxUpdate);
    return () =>
      window.removeEventListener("wif-sandbox-updated", onSandboxUpdate);
  }, []);

  // 1-second live resource accrual ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: batchData,
    isLoading: isLoadingWorld,
    isError: isWorldReadError,
    refetch: refetchWorldContracts,
  } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getRegionMap",
        args: [0],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getRegionMap",
        args: [1],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "isRegionUnlocked",
        args: [1],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "claimCost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "structureCost",
        args: [StructureType.Outpost],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "structureCost",
        args: [StructureType.Workshop],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "structureCost",
        args: [StructureType.Beacon],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "treasury",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "activeEventId",
        chainId: ROBINHOOD_CHAIN_ID,
      },
    ],
    query: {
      enabled: isContractDeployed,
      refetchInterval: 15_000,
    },
  });

  const activeEventId =
    (batchData?.[8]?.result as bigint | undefined) ?? 1n;

  const { data: eventRaw, refetch: refetchEvent } = useReadContract({
    address: contractAddress,
    abi: WIF_WORLDS_ABI,
    functionName: "getEvent",
    args: [activeEventId],
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: isContractDeployed && activeEventId > 0n,
      refetchInterval: 15_000,
    },
  });

  const { data: playerStateRaw, refetch: refetchPlayerStats } = useReadContract({
    address: contractAddress,
    abi: WIF_WORLDS_ABI,
    functionName: "getPlayerState",
    args: targetProfileAddress ? [targetProfileAddress] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: Boolean(isContractDeployed && targetProfileAddress),
    },
  });

  const [onchainActivities, setOnchainActivities] = useState<
    VerifiedActivityItem[]
  >([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchVerifiedLogs = useCallback(async () => {
    if (!isContractDeployed || !WIF_WORLDS_CONTRACT_ADDRESS || !publicClient) {
      setOnchainActivities([]);
      return;
    }
    setIsLoadingLogs(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > 50_000n ? latestBlock - 50_000n : 0n;

      const [
        claimLogs,
        settlementLogs,
        upgradeLogs,
        structureLogs,
        eventLogs,
        regionLogs,
        harvestLogs,
      ] = await Promise.all([
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: TILE_CLAIMED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: SETTLEMENT_BUILT_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: SETTLEMENT_UPGRADED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: STRUCTURE_BUILT_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: EVENT_CONTRIBUTION_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: REGION_UNLOCKED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: WIF_WORLDS_CONTRACT_ADDRESS,
          event: RESOURCES_HARVESTED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
      ]);

      const items: VerifiedActivityItem[] = [];

      for (const l of claimLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "claim",
          player: l.args.player,
          tileId: Number(l.args.worldTileId ?? 0n),
          regionId: Number(l.args.regionId ?? 0),
          wifAmount: l.args.cost ?? 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of settlementLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "settlement",
          player: l.args.player,
          tileId: Number(l.args.worldTileId ?? 0n),
          newLevel: 1,
          wifAmount: l.args.cost ?? 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of upgradeLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "upgrade",
          player: l.args.player,
          tileId: Number(l.args.worldTileId ?? 0n),
          newLevel: Number(l.args.newLevel ?? 2),
          wifAmount: l.args.cost ?? 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of structureLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "structure",
          player: l.args.player,
          tileId: Number(l.args.worldTileId ?? 0n),
          structureType: Number(l.args.structureType ?? 1) as StructureType,
          wifAmount: l.args.cost ?? 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of eventLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "event",
          player: l.args.player,
          eventId: Number(l.args.eventId ?? 1n),
          wifAmount: l.args.amount ?? 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of regionLogs) {
        if (!l.transactionHash) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "region_unlock",
          player: ZERO_ADDRESS as `0x${string}`,
          regionId: Number(l.args.regionId ?? 1),
          wifAmount: 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      for (const l of harvestLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        items.push({
          id: `${l.transactionHash}-${l.logIndex}`,
          kind: "harvest",
          player: l.args.player,
          resourcesAdded: {
            wood: Number(l.args.woodAdded ?? 0),
            stone: Number(l.args.stoneAdded ?? 0),
            food: Number(l.args.foodAdded ?? 0),
          },
          wifAmount: 0n,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber ?? 0n,
        });
      }

      items.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
      setOnchainActivities(items);
    } catch {
      // Preserve last verified logs on transient RPC hiccup
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isContractDeployed, publicClient]);

  useEffect(() => {
    fetchVerifiedLogs();
  }, [fetchVerifiedLogs]);

  const activities: VerifiedActivityItem[] = useMemo(() => {
    if (isContractDeployed) return onchainActivities;
    if (!sandboxStore) return [];
    return sandboxStore.activities.map((a) => ({
      id: a.id,
      kind: a.kind,
      player: a.player,
      tileId: a.tileId,
      newLevel: a.newLevel,
      structureType: a.structureType,
      eventId: a.eventId,
      regionId: a.regionId,
      resourcesAdded: a.resourcesAdded,
      wifAmount: BigInt(a.wifAmount),
      txHash: a.txHash,
      blockNumber: BigInt(a.blockNumber),
      timestamp: a.timestamp,
      isSimulated: true,
    }));
  }, [isContractDeployed, onchainActivities, sandboxStore]);

  const heartlandsTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[0]?.result as never,
        0,
        isContractDeployed,
        sandboxStore
      ),
    [batchData, isContractDeployed, sandboxStore]
  );

  const frontierTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[1]?.result as never,
        1,
        isContractDeployed,
        sandboxStore
      ),
    [batchData, isContractDeployed, sandboxStore]
  );

  const isWildFrontierUnlocked = Boolean(
    isContractDeployed
      ? batchData?.[2]?.result === true
      : sandboxStore?.region1Unlocked
  );

  const regionUnlockedMap: Record<number, boolean> = useMemo(
    () => ({
      0: true,
      1: isWildFrontierUnlocked,
      2: false,
      3: false,
    }),
    [isWildFrontierUnlocked]
  );

  const tiles: TileState[] = useMemo(() => {
    if (activeRegionId === 1) return frontierTiles;
    return heartlandsTiles;
  }, [activeRegionId, frontierTiles, heartlandsTiles]);

  const allPlayableTiles: TileState[] = useMemo(
    () => [...heartlandsTiles, ...frontierTiles],
    [frontierTiles, heartlandsTiles]
  );

  const costs = useMemo(
    () => ({
      claim: (batchData?.[3]?.result as bigint | undefined) ?? DEFAULT_COSTS.claim,
      settlementSlot1: DEFAULT_COSTS.settlementSlot1,
      settlementSlot2: DEFAULT_COSTS.settlementSlot2,
      settlementSlot3: DEFAULT_COSTS.settlementSlot3,
      upgradeToLv2: DEFAULT_COSTS.upgradeToLv2,
      upgradeToLv3: DEFAULT_COSTS.upgradeToLv3,
      upgradeToLv4: DEFAULT_COSTS.upgradeToLv4,
      upgradeToLv5: DEFAULT_COSTS.upgradeToLv5,
      outpost:
        (batchData?.[4]?.result as bigint | undefined) ?? DEFAULT_COSTS.outpost,
      workshop:
        (batchData?.[5]?.result as bigint | undefined) ?? DEFAULT_COSTS.workshop,
      beacon:
        (batchData?.[6]?.result as bigint | undefined) ?? DEFAULT_COSTS.beacon,
      lumberCamp: DEFAULT_COSTS.lumberCamp,
      quarry: DEFAULT_COSTS.quarry,
      farm: DEFAULT_COSTS.farm,
    }),
    [batchData]
  );

  const treasuryAddress =
    (batchData?.[7]?.result as `0x${string}` | undefined) ?? null;

  const worldEvent: WorldEventState = useMemo(() => {
    if (isContractDeployed && eventRaw) {
      const [
        title,
        targetWorldTileId,
        unlocksRegionId,
        targetAmount,
        totalContributed,
        deadline,
        completed,
        active,
      ] = eventRaw as readonly [
        string,
        number,
        number,
        bigint,
        bigint,
        bigint,
        boolean,
        boolean
      ];
      return {
        id: Number(activeEventId),
        title: title || "Build the Beacon",
        description:
          "Complete the Northern Beacon at Heartlands (3, 0). Reaching 100% unlocks Region 1: The Wild Frontier (49 new tiles) onchain for every player.",
        targetTileId: Number(targetWorldTileId),
        unlocksRegionId: unlocksRegionId === 255 ? null : Number(unlocksRegionId),
        targetAmount,
        totalContributed,
        deadline: Number(deadline),
        completed,
        active,
      };
    }

    const simContrib = sandboxStore
      ? BigInt(sandboxStore.eventTotalContributed)
      : parseUnits("475", WIF_DECIMALS);

    return {
      id: 1,
      title: "Build the Beacon",
      description:
        "Complete the Northern Beacon at Heartlands (3, 0). Reaching 100% automatically unlocks Region 1: The Wild Frontier (49 new tiles) for all builders.",
      targetTileId: BEACON_TARGET_TILE_ID,
      unlocksRegionId: 1,
      targetAmount: parseUnits("1250", WIF_DECIMALS),
      totalContributed: simContrib,
      deadline: 0,
      completed: Boolean(sandboxStore?.eventCompleted),
      active: true,
    };
  }, [activeEventId, eventRaw, isContractDeployed, sandboxStore]);

  const worldSummary = useMemo(() => {
    let claimedTiles = 0;
    let settlements = 0;
    let structures = 0;
    const uniqueBuilders = new Set<string>();

    for (const tile of allPlayableTiles) {
      if (tile.owner && tile.owner.toLowerCase() !== ZERO_ADDRESS) {
        claimedTiles += 1;
        uniqueBuilders.add(tile.owner.toLowerCase());
      }
      if (tile.settlementLevel > 0) settlements += 1;
      if (tile.structureType !== StructureType.None) structures += 1;
    }

    return {
      claimedTiles,
      settlements,
      structures,
      uniqueBuilders: uniqueBuilders.size,
      unlockedRegionsCount: isWildFrontierUnlocked ? 2 : 1,
    };
  }, [allPlayableTiles, isWildFrontierUnlocked]);

  const computePlayerStatsForAddress = useCallback(
    (addr: `0x${string}`): PlayerStats => {
      const lower = addr.toLowerCase();

      if (
        isContractDeployed &&
        playerStateRaw &&
        targetProfileAddress &&
        targetProfileAddress.toLowerCase() === lower
      ) {
        const s = playerStateRaw as {
          tilesClaimed: number;
          settlementsBuilt: number;
          totalSettlementUpgrades: number;
          structuresBuilt: number;
          outpostsBuilt: number;
          workshopsBuilt: number;
          beaconsBuilt: number;
          lumberCampsBuilt?: number;
          quarriesBuilt?: number;
          farmsBuilt?: number;
          eventsContributed: number;
          maxSettlementLevel: number;
          wood?: number;
          stone?: number;
          food?: number;
          woodPerHour?: number;
          stonePerHour?: number;
          foodPerHour?: number;
          lastResourceSync?: number;
          totalEventWifContributed: bigint;
        };

        const settlementsBuilt = Number(s.settlementsBuilt);
        const totalSettlementUpgrades = Number(s.totalSettlementUpgrades);
        const workshopsBuilt = Number(s.workshopsBuilt);
        const storageCap = computeResourceStorageCap({
          settlementsBuilt,
          totalSettlementUpgrades,
          workshopsBuilt,
        });

        const lastSync = Number(s.lastResourceSync ?? nowSec);
        const elapsed = Math.max(0, nowSec - lastSync);
        const woodPerHour = Number(s.woodPerHour ?? 0);
        const stonePerHour = Number(s.stonePerHour ?? 0);
        const foodPerHour = Number(s.foodPerHour ?? 0);

        const wood = Math.min(
          storageCap,
          Number(s.wood ?? 0) + (elapsed * woodPerHour) / 3600
        );
        const stone = Math.min(
          storageCap,
          Number(s.stone ?? 0) + (elapsed * stonePerHour) / 3600
        );
        const food = Math.min(
          storageCap,
          Number(s.food ?? 0) + (elapsed * foodPerHour) / 3600
        );

        const base = {
          tilesClaimed: Number(s.tilesClaimed),
          settlementsBuilt,
          totalSettlementUpgrades,
          structuresBuilt: Number(s.structuresBuilt),
          outpostsBuilt: Number(s.outpostsBuilt),
          workshopsBuilt,
          beaconsBuilt: Number(s.beaconsBuilt),
          lumberCampsBuilt: Number(s.lumberCampsBuilt ?? 0),
          quarriesBuilt: Number(s.quarriesBuilt ?? 0),
          farmsBuilt: Number(s.farmsBuilt ?? 0),
          maxSettlementLevel: Number(s.maxSettlementLevel),
          eventsContributedCount: Number(s.eventsContributed),
          totalEventWifContributed: s.totalEventWifContributed,
          wood,
          stone,
          food,
          woodPerHour,
          stonePerHour,
          foodPerHour,
          storageCap,
          lastResourceSync: lastSync,
        };

        return {
          ...base,
          maxClaimableTiles: computeMaxClaimableTiles(base),
          activityScore: computeActivityScore(base),
          progressionStage: computeProgressionStage(base),
        };
      }

      // Derive from map tiles + sandbox resource store
      const ownedTiles = allPlayableTiles.filter(
        (t) => t.owner.toLowerCase() === lower
      );

      let settlementsBuilt = 0;
      let totalSettlementUpgrades = 0;
      let structuresBuilt = 0;
      let outpostsBuilt = 0;
      let workshopsBuilt = 0;
      let beaconsBuilt = 0;
      let lumberCampsBuilt = 0;
      let quarriesBuilt = 0;
      let farmsBuilt = 0;
      let maxSettlementLevel = 0;

      for (const t of ownedTiles) {
        if (t.settlementLevel > 0) {
          settlementsBuilt += 1;
          totalSettlementUpgrades += t.settlementLevel - 1;
          if (t.settlementLevel > maxSettlementLevel) {
            maxSettlementLevel = t.settlementLevel;
          }
        }
        if (t.structureType !== StructureType.None) {
          structuresBuilt += 1;
          if (t.structureType === StructureType.Outpost) outpostsBuilt += 1;
          if (t.structureType === StructureType.Workshop) workshopsBuilt += 1;
          if (t.structureType === StructureType.Beacon) beaconsBuilt += 1;
          if (t.structureType === StructureType.LumberCamp)
            lumberCampsBuilt += 1;
          if (t.structureType === StructureType.Quarry) quarriesBuilt += 1;
          if (t.structureType === StructureType.Farm) farmsBuilt += 1;
        }
      }

      const rates = computeRatesFromTiles(ownedTiles);
      const storageCap = computeResourceStorageCap({
        settlementsBuilt,
        totalSettlementUpgrades,
        workshopsBuilt,
      });

      const storedRes = sandboxStore?.resourcesByPlayer[lower];
      const lastSync = storedRes?.lastResourceSync ?? nowSec;
      const elapsed = Math.max(0, nowSec - lastSync);

      const baseWood = storedRes ? storedRes.wood : ownedTiles.length > 0 ? 160 : 0;
      const baseStone = storedRes ? storedRes.stone : ownedTiles.length > 0 ? 120 : 0;
      const baseFood = storedRes ? storedRes.food : ownedTiles.length > 0 ? 140 : 0;

      const wood = Math.min(
        storageCap,
        baseWood + (elapsed * rates.woodPerHour) / 3600
      );
      const stone = Math.min(
        storageCap,
        baseStone + (elapsed * rates.stonePerHour) / 3600
      );
      const food = Math.min(
        storageCap,
        baseFood + (elapsed * rates.foodPerHour) / 3600
      );

      const eventsContributedCount = storedRes?.eventsContributedCount ?? 0;
      const totalEventWifContributed = storedRes
        ? BigInt(storedRes.totalEventWifContributed)
        : 0n;

      const base = {
        tilesClaimed: ownedTiles.length,
        settlementsBuilt,
        totalSettlementUpgrades,
        structuresBuilt,
        outpostsBuilt,
        workshopsBuilt,
        beaconsBuilt,
        lumberCampsBuilt,
        quarriesBuilt,
        farmsBuilt,
        maxSettlementLevel,
        eventsContributedCount,
        totalEventWifContributed,
        wood,
        stone,
        food,
        woodPerHour: rates.woodPerHour,
        stonePerHour: rates.stonePerHour,
        foodPerHour: rates.foodPerHour,
        storageCap,
        lastResourceSync: lastSync,
      };

      return {
        ...base,
        maxClaimableTiles: computeMaxClaimableTiles(base),
        activityScore: computeActivityScore(base),
        progressionStage: computeProgressionStage(base),
      };
    },
    [
      allPlayableTiles,
      isContractDeployed,
      nowSec,
      playerStateRaw,
      sandboxStore,
      targetProfileAddress,
    ]
  );

  const playerStats: PlayerStats = useMemo(
    () => computePlayerStatsForAddress(effectiveProfileAddress),
    [computePlayerStatsForAddress, effectiveProfileAddress]
  );

  const missions: MissionStatus[] = useMemo(
    () => evaluateMissions(playerStats, worldEvent),
    [playerStats, worldEvent]
  );

  const regionalRankings: RegionalBuilderRanking[] = useMemo(() => {
    const owners = new Set<string>();
    for (const t of allPlayableTiles) {
      if (t.owner && t.owner.toLowerCase() !== ZERO_ADDRESS) {
        owners.add(t.owner);
      }
    }
    if (effectiveProfileAddress) {
      owners.add(effectiveProfileAddress);
    }

    const rankings: RegionalBuilderRanking[] = [];
    for (const ownerAddr of owners) {
      const st = computePlayerStatsForAddress(ownerAddr as `0x${string}`);
      if (
        st.tilesClaimed === 0 &&
        ownerAddr.toLowerCase() !== effectiveProfileAddress.toLowerCase()
      ) {
        continue;
      }
      const lower = ownerAddr.toLowerCase();
      const isCurrent = lower === effectiveProfileAddress.toLowerCase();
      const pioneerName = PIONEER_NEIGHBORS[lower];
      const displayName = isCurrent
        ? "Your Civilization"
        : pioneerName ||
          `${ownerAddr.slice(0, 6)}...${ownerAddr.slice(-4)}`;

      rankings.push({
        address: ownerAddr as `0x${string}`,
        displayName,
        title: getBuilderTitle(st.activityScore),
        tilesClaimed: st.tilesClaimed,
        settlementsBuilt: st.settlementsBuilt,
        maxSettlementLevel: st.maxSettlementLevel,
        structuresBuilt: st.structuresBuilt,
        totalProductionPerHour:
          st.woodPerHour + st.stonePerHour + st.foodPerHour,
        woodPerHour: st.woodPerHour,
        stonePerHour: st.stonePerHour,
        foodPerHour: st.foodPerHour,
        eventContributedWif: st.totalEventWifContributed,
        activityScore: st.activityScore,
        isCurrentPlayer: isCurrent,
      });
    }

    rankings.sort((a, b) => b.activityScore - a.activityScore);
    return rankings;
  }, [
    allPlayableTiles,
    computePlayerStatsForAddress,
    effectiveProfileAddress,
  ]);

  const refreshAllWorldState = useCallback(async () => {
    setSandboxStore(loadSandboxStore());
    if (isContractDeployed) {
      await Promise.all([
        refetchWorldContracts(),
        refetchEvent(),
        refetchPlayerStats(),
        fetchVerifiedLogs(),
      ]);
    }
  }, [
    fetchVerifiedLogs,
    isContractDeployed,
    refetchEvent,
    refetchPlayerStats,
    refetchWorldContracts,
  ]);

  return {
    isContractDeployed,
    contractAddress: WIF_WORLDS_CONTRACT_ADDRESS,
    treasuryAddress,
    effectiveProfileAddress,
    tiles,
    heartlandsTiles,
    frontierTiles,
    allPlayableTiles,
    regionUnlockedMap,
    isWildFrontierUnlocked,
    costs,
    worldEvent,
    worldSummary,
    playerStats,
    missions,
    regionalRankings,
    computePlayerStatsForAddress,
    activities,
    isLoadingWorld,
    isLoadingLogs,
    isWorldReadError,
    refreshAllWorldState,
  };
}

export function useWorldActionExecutor(
  onSuccessRefresh: () => Promise<void>,
  activePlayerAddress?: `0x${string}`
) {
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [stage, setStage] = useState<TxLifecycleStage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string | null>(null);

  const playerAddr = (activePlayerAddress ??
    LOCAL_DEMO_PLAYER) as `0x${string}`;

  const resetTxState = useCallback(() => {
    setStage("idle");
    setTxHash(null);
    setErrorMessage(null);
    setStepLabel(null);
  }, []);

  const isUserRejection = (err: unknown): boolean => {
    const msg = String(
      (err as { message?: string })?.message || ""
    ).toLowerCase();
    const code = (err as { code?: number })?.code;
    return (
      code === 4001 ||
      msg.includes("user rejected") ||
      msg.includes("user denied") ||
      msg.includes("rejected the request")
    );
  };

  const approveExactWif = useCallback(
    async (requiredAmount: bigint) => {
      if (!WIF_WORLDS_CONTRACT_ADDRESS || !publicClient) {
        // In sandbox mode before deployment, approval is instant
        return true;
      }

      setErrorMessage(null);
      setTxHash(null);
      setStepLabel("Approving $WIF spend...");
      setStage("awaiting_wallet");

      try {
        const hash = await writeContractAsync({
          address: WIF_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [WIF_WORLDS_CONTRACT_ADDRESS, requiredAmount],
          chainId: ROBINHOOD_CHAIN_ID,
        });

        setTxHash(hash);
        setStage("pending");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          setStage("failed");
          setErrorMessage("Token approval reverted on Robinhood Chain.");
          return false;
        }

        setStage("refreshing");
        await onSuccessRefresh();
        setStage("idle");
        setStepLabel(null);
        return true;
      } catch (err: unknown) {
        if (isUserRejection(err)) {
          setStage("wallet_rejected");
          setErrorMessage("You cancelled the approval request in your wallet.");
        } else {
          setStage("failed");
          setErrorMessage(
            (err as { shortMessage?: string })?.shortMessage ||
              "Token approval failed. Verify your ETH balance for gas on Robinhood Chain."
          );
        }
        return false;
      }
    },
    [onSuccessRefresh, publicClient, writeContractAsync]
  );

  const executeSandboxAction = useCallback(
    async (
      params:
        | { action: "claim"; tileId: number }
        | { action: "settlement"; tileId: number }
        | { action: "upgrade"; tileId: number }
        | { action: "structure"; tileId: number; structureType: StructureType }
        | { action: "event"; eventId: number; amount: bigint }
        | { action: "harvest" }
    ) => {
      setErrorMessage(null);
      setStepLabel("Executing world action...");
      setStage("pending");

      await new Promise((r) => setTimeout(r, 380));

      const store = loadSandboxStore();
      const nowSec = Math.floor(Date.now() / 1000);
      const lower = playerAddr.toLowerCase();

      // Reconstruct current tiles to compute rates & caps
      const allTiles = [
        ...createGenesisRegionTiles(0),
        ...createGenesisRegionTiles(1),
      ].map((t) => {
        const ov = store.tilesByWorldId[t.id];
        return ov
          ? {
              ...t,
              owner: ov.owner,
              settlementLevel: ov.settlementLevel,
              hasSettlement: ov.settlementLevel > 0,
              structureType: ov.structureType,
              claimedAt: ov.claimedAt,
            }
          : t;
      });

      const ownedTiles = allTiles.filter(
        (t) => t.owner.toLowerCase() === lower
      );

      let settlementsBuilt = 0;
      let totalSettlementUpgrades = 0;
      let structuresBuilt = 0;
      let outpostsBuilt = 0;
      let workshopsBuilt = 0;
      let beaconsBuilt = 0;
      let maxSettlementLevel = 0;

      for (const t of ownedTiles) {
        if (t.settlementLevel > 0) {
          settlementsBuilt += 1;
          totalSettlementUpgrades += t.settlementLevel - 1;
          if (t.settlementLevel > maxSettlementLevel) {
            maxSettlementLevel = t.settlementLevel;
          }
        }
        if (t.structureType !== StructureType.None) {
          structuresBuilt += 1;
          if (t.structureType === StructureType.Outpost) outpostsBuilt += 1;
          if (t.structureType === StructureType.Workshop) workshopsBuilt += 1;
          if (t.structureType === StructureType.Beacon) beaconsBuilt += 1;
        }
      }

      const rates = computeRatesFromTiles(ownedTiles);
      const cap = computeResourceStorageCap({
        settlementsBuilt,
        totalSettlementUpgrades,
        workshopsBuilt,
      });

      const existingRes = store.resourcesByPlayer[lower] ?? {
        wood: ownedTiles.length > 0 ? 160 : 0,
        stone: ownedTiles.length > 0 ? 120 : 0,
        food: ownedTiles.length > 0 ? 140 : 0,
        lastResourceSync: nowSec,
        eventsContributedCount: 0,
        totalEventWifContributed: "0",
      };

      const elapsed = Math.max(0, nowSec - existingRes.lastResourceSync);
      const addW = Math.floor((elapsed * rates.woodPerHour) / 3600);
      const addS = Math.floor((elapsed * rates.stonePerHour) / 3600);
      const addF = Math.floor((elapsed * rates.foodPerHour) / 3600);

      let wood = Math.min(cap, Math.floor(existingRes.wood) + addW);
      let stone = Math.min(cap, Math.floor(existingRes.stone) + addS);
      let food = Math.min(cap, Math.floor(existingRes.food) + addF);

      const simHash = `0x${Math.random()
        .toString(16)
        .slice(2)
        .padEnd(64, "a")}` as `0x${string}`;

      try {
        if (params.action === "harvest") {
          // Ensure a gratifying minimum harvest when clicking Harvest in sandbox
          const bonusW = Math.max(addW, rates.woodPerHour > 0 ? 15 : 0);
          const bonusS = Math.max(addS, rates.stonePerHour > 0 ? 10 : 0);
          const bonusF = Math.max(addF, rates.foodPerHour > 0 ? 15 : 0);
          wood = Math.min(cap, Math.floor(existingRes.wood) + bonusW);
          stone = Math.min(cap, Math.floor(existingRes.stone) + bonusS);
          food = Math.min(cap, Math.floor(existingRes.food) + bonusF);

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "harvest",
            player: playerAddr,
            resourcesAdded: { wood: bonusW, stone: bonusS, food: bonusF },
            wifAmount: "0",
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });
        } else if (params.action === "claim") {
          const target = allTiles.find((t) => t.id === params.tileId);
          if (!target) throw new Error("Invalid tile ID.");
          if (target.regionId === 1 && !store.region1Unlocked) {
            throw new Error("The Wild Frontier is still locked.");
          }
          if (
            target.terrain === TerrainType.Water ||
            target.terrain === TerrainType.Landmark
          ) {
            throw new Error("This terrain cannot be claimed.");
          }
          if (target.owner.toLowerCase() !== ZERO_ADDRESS) {
            throw new Error("Tile is already claimed.");
          }
          const maxCap = computeMaxClaimableTiles({
            settlementsBuilt,
            totalSettlementUpgrades,
            outpostsBuilt,
          });
          if (ownedTiles.length >= maxCap) {
            throw new Error(
              "Territory capacity full. Build a Settlement, Upgrade a Hall, or construct an Outpost."
            );
          }

          if (ownedTiles.length === 0) {
            wood += 160;
            stone += 120;
            food += 140;
          }

          store.tilesByWorldId[params.tileId] = {
            owner: playerAddr,
            settlementLevel: 0,
            structureType: StructureType.None,
            claimedAt: nowSec,
          };

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "claim",
            player: playerAddr,
            tileId: params.tileId,
            regionId: target.regionId,
            wifAmount: DEFAULT_COSTS.claim.toString(),
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });
        } else if (params.action === "settlement") {
          const target = allTiles.find((t) => t.id === params.tileId);
          if (!target || target.owner.toLowerCase() !== lower) {
            throw new Error("You must own this tile first.");
          }
          if (target.settlementLevel > 0) {
            throw new Error("Settlement already built on this tile.");
          }

          const regionSettlements = ownedTiles.filter(
            (t) => t.regionId === target.regionId && t.settlementLevel > 0
          );
          if (regionSettlements.length >= MAX_SETTLEMENTS_PER_REGION) {
            throw new Error("Max settlements in this region reached.");
          }
          for (const s of regionSettlements) {
            if (
              manhattanDistance(s.id, target.id) <
              MIN_SETTLEMENT_MANHATTAN_DISTANCE
            ) {
              throw new Error(
                "Too close to an existing settlement (minimum Manhattan distance is 2)."
              );
            }
          }

          const resCost = getNextSettlementResourceCost(settlementsBuilt);
          if (
            wood < resCost.wood ||
            stone < resCost.stone ||
            food < resCost.food
          ) {
            throw new Error(
              `Insufficient resources: requires ${resCost.wood} Wood, ${resCost.stone} Stone, ${resCost.food} Food.`
            );
          }

          wood = Math.min(cap + 200, wood - resCost.wood + 40);
          stone = Math.min(cap + 200, stone - resCost.stone + 30);
          food = Math.min(cap + 200, food - resCost.food + 40);

          store.tilesByWorldId[params.tileId] = {
            owner: playerAddr,
            settlementLevel: 1,
            structureType: target.structureType,
            claimedAt: target.claimedAt || nowSec,
          };

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "settlement",
            player: playerAddr,
            tileId: params.tileId,
            newLevel: 1,
            wifAmount: getNextSettlementCost(settlementsBuilt).toString(),
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });
        } else if (params.action === "upgrade") {
          const target = allTiles.find((t) => t.id === params.tileId);
          if (!target || target.owner.toLowerCase() !== lower) {
            throw new Error("You must own this tile.");
          }
          if (
            target.settlementLevel === 0 ||
            target.settlementLevel >= MAX_SETTLEMENT_LEVEL
          ) {
            throw new Error("Cannot upgrade settlement further.");
          }

          const nextLevel = (target.settlementLevel + 1) as SettlementLevel;
          const tierMeta = SETTLEMENT_TIER_META[nextLevel];

          if (
            wood < tierMeta.resourceCost.wood ||
            stone < tierMeta.resourceCost.stone ||
            food < tierMeta.resourceCost.food
          ) {
            throw new Error(
              `Insufficient resources: requires ${tierMeta.resourceCost.wood} Wood, ${tierMeta.resourceCost.stone} Stone, ${tierMeta.resourceCost.food} Food.`
            );
          }

          wood -= tierMeta.resourceCost.wood;
          stone -= tierMeta.resourceCost.stone;
          food -= tierMeta.resourceCost.food;

          store.tilesByWorldId[params.tileId] = {
            owner: playerAddr,
            settlementLevel: nextLevel,
            structureType: target.structureType,
            claimedAt: target.claimedAt || nowSec,
          };

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "upgrade",
            player: playerAddr,
            tileId: params.tileId,
            newLevel: nextLevel,
            wifAmount: tierMeta.costWif.toString(),
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });
        } else if (params.action === "structure") {
          const target = allTiles.find((t) => t.id === params.tileId);
          if (!target || target.owner.toLowerCase() !== lower) {
            throw new Error("You must own this tile.");
          }
          if (target.structureType !== StructureType.None) {
            throw new Error("A structure is already built on this tile.");
          }
          if (params.structureType === StructureType.None) {
            throw new Error("Invalid structure type.");
          }

          const stMeta = STRUCTURE_META[params.structureType];
          if (
            wood < stMeta.resourceCost.wood ||
            stone < stMeta.resourceCost.stone ||
            food < stMeta.resourceCost.food
          ) {
            throw new Error(
              `Insufficient resources: requires ${stMeta.resourceCost.wood} Wood, ${stMeta.resourceCost.stone} Stone, ${stMeta.resourceCost.food} Food.`
            );
          }

          wood = Math.min(
            cap + stMeta.storageBonus,
            wood - stMeta.resourceCost.wood + (stMeta.immediateBonus?.wood ?? 0)
          );
          stone = Math.min(
            cap + stMeta.storageBonus,
            stone -
              stMeta.resourceCost.stone +
              (stMeta.immediateBonus?.stone ?? 0)
          );
          food = Math.min(
            cap + stMeta.storageBonus,
            food - stMeta.resourceCost.food + (stMeta.immediateBonus?.food ?? 0)
          );

          store.tilesByWorldId[params.tileId] = {
            owner: playerAddr,
            settlementLevel: target.settlementLevel,
            structureType: params.structureType,
            claimedAt: target.claimedAt || nowSec,
          };

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "structure",
            player: playerAddr,
            tileId: params.tileId,
            structureType: params.structureType,
            wifAmount: stMeta.defaultCostWif.toString(),
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });
        } else if (params.action === "event") {
          const prevTotal = BigInt(store.eventTotalContributed);
          const nextTotal = prevTotal + params.amount;
          store.eventTotalContributed = nextTotal.toString();

          existingRes.eventsContributedCount += 1;
          existingRes.totalEventWifContributed = (
            BigInt(existingRes.totalEventWifContributed) + params.amount
          ).toString();

          store.activities.unshift({
            id: `sim-${Date.now()}`,
            kind: "event",
            player: playerAddr,
            eventId: params.eventId,
            wifAmount: params.amount.toString(),
            txHash: simHash,
            blockNumber: String(1940300 + store.activities.length),
            timestamp: nowSec,
          });

          if (
            nextTotal >= parseUnits("1250", WIF_DECIMALS) &&
            !store.eventCompleted
          ) {
            store.eventCompleted = true;
            store.region1Unlocked = true;
            store.activities.unshift({
              id: `sim-unlock-${Date.now()}`,
              kind: "region_unlock",
              player: ZERO_ADDRESS as `0x${string}`,
              regionId: 1,
              wifAmount: "0",
              txHash: simHash,
              blockNumber: String(1940301 + store.activities.length),
              timestamp: nowSec,
            });
          }
        }

        store.resourcesByPlayer[lower] = {
          wood,
          stone,
          food,
          lastResourceSync: nowSec,
          eventsContributedCount: existingRes.eventsContributedCount,
          totalEventWifContributed: existingRes.totalEventWifContributed,
        };

        saveSandboxStore(store);
        setTxHash(simHash);
        setStage("refreshing");
        await onSuccessRefresh();
        setStage("confirmed");
        setStepLabel(null);
        return true;
      } catch (err: unknown) {
        setStage("failed");
        setErrorMessage(
          (err as { message?: string })?.message ||
            "Action could not be completed."
        );
        return false;
      }
    },
    [onSuccessRefresh, playerAddr]
  );

  const executeGameAction = useCallback(
    async (
      params:
        | { action: "claim"; tileId: number }
        | { action: "settlement"; tileId: number }
        | { action: "upgrade"; tileId: number }
        | { action: "structure"; tileId: number; structureType: StructureType }
        | { action: "event"; eventId: number; amount: bigint }
        | { action: "harvest" }
    ) => {
      if (!WIF_WORLDS_CONTRACT_ADDRESS || !publicClient) {
        return executeSandboxAction(params);
      }

      setErrorMessage(null);
      setTxHash(null);
      setStepLabel("Confirming world action...");
      setStage("awaiting_wallet");

      try {
        let hash: `0x${string}`;

        if (params.action === "harvest") {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "harvestResources",
            args: [],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        } else if (params.action === "claim") {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "claimTile",
            args: [BigInt(params.tileId)],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        } else if (params.action === "settlement") {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "buildSettlement",
            args: [BigInt(params.tileId)],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        } else if (params.action === "upgrade") {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "upgradeSettlement",
            args: [BigInt(params.tileId)],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        } else if (params.action === "structure") {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "buildStructure",
            args: [BigInt(params.tileId), params.structureType],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        } else {
          hash = await writeContractAsync({
            address: WIF_WORLDS_CONTRACT_ADDRESS,
            abi: WIF_WORLDS_ABI,
            functionName: "contributeToEvent",
            args: [BigInt(params.eventId), params.amount],
            chainId: ROBINHOOD_CHAIN_ID,
          });
        }

        setTxHash(hash);
        setStage("submitted");
        setStage("pending");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          setStage("failed");
          setErrorMessage(
            "Transaction reverted on Robinhood Chain. World state was not modified."
          );
          return false;
        }

        setStage("refreshing");
        await onSuccessRefresh();
        setStage("confirmed");
        setStepLabel(null);
        return true;
      } catch (err: unknown) {
        if (isUserRejection(err)) {
          setStage("wallet_rejected");
          setErrorMessage("Wallet confirmation was declined. No $WIF was spent.");
        } else {
          setStage("failed");
          setErrorMessage(
            (err as { shortMessage?: string })?.shortMessage ||
              "Transaction failed to submit. Check your $WIF allowance and ETH gas on Robinhood Chain."
          );
        }
        return false;
      }
    },
    [executeSandboxAction, onSuccessRefresh, publicClient, writeContractAsync]
  );

  return {
    stage,
    txHash,
    errorMessage,
    stepLabel,
    resetTxState,
    approveExactWif,
    executeGameAction,
  };
}
