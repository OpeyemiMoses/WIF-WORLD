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
  LEGACY_WIF_WORLDS_CONTRACTS,
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
  getStructureProductionOnTerrain,
  MissionStatus,
  parseWorldTileId,
  PlayerStats,
  RegionalBuilderRanking,
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

// Clean out any legacy local sandbox key if present in the browser
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("wif_worlds_phase1_1_sandbox_v1");
  } catch {
    // ignore
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
    effectivePlayerAddress: address,
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
  isContractDeployed: boolean
): TileState[] {
  if (!isContractDeployed || !rawMap || rawMap.length !== 49) {
    return createGenesisRegionTiles(regionId);
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

  const [nowSec, setNowSec] = useState<number>(() =>
    Math.floor(Date.now() / 1000)
  );

  // 1-second live resource accrual ticker (ticks only when player has real onchain production)
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
      // 0..3: All 4 Region Maps (49 tiles each = 196 total world tiles)
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
        functionName: "getRegionMap",
        args: [2],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getRegionMap",
        args: [3],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      // 4..7: Region Unlock Statuses (0..3)
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "isRegionUnlocked",
        args: [0],
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
        functionName: "isRegionUnlocked",
        args: [2],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "isRegionUnlocked",
        args: [3],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      // 8..21: Live Onchain Economy Costs
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "claimCost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "settlementSlot1Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "settlementSlot2Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "settlementSlot3Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "upgradeToLv2Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "upgradeToLv3Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "upgradeToLv4Cost",
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "upgradeToLv5Cost",
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
        functionName: "structureCost",
        args: [StructureType.LumberCamp],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "structureCost",
        args: [StructureType.Quarry],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "structureCost",
        args: [StructureType.Farm],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      // 22..23: Treasury & Active Event ID
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
      // 24..28: All 5 Onchain World Events (events[1..5])
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getEvent",
        args: [1n],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getEvent",
        args: [2n],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getEvent",
        args: [3n],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getEvent",
        args: [4n],
        chainId: ROBINHOOD_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: WIF_WORLDS_ABI,
        functionName: "getEvent",
        args: [5n],
        chainId: ROBINHOOD_CHAIN_ID,
      },
    ],
    query: {
      enabled: isContractDeployed,
      refetchInterval: 15_000,
    },
  });

  const activeEventId =
    (batchData?.[23]?.result as bigint | undefined) ?? 1n;

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

  const [activities, setActivities] = useState<VerifiedActivityItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchVerifiedLogs = useCallback(async () => {
    if (!isContractDeployed || !WIF_WORLDS_CONTRACT_ADDRESS || !publicClient) {
      setActivities([]);
      return;
    }
    setIsLoadingLogs(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > 50_000n ? latestBlock - 50_000n : 0n;
      const logAddresses = [
        WIF_WORLDS_CONTRACT_ADDRESS,
        ...LEGACY_WIF_WORLDS_CONTRACTS,
      ];

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
          address: logAddresses,
          event: TILE_CLAIMED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: SETTLEMENT_BUILT_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: SETTLEMENT_UPGRADED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: STRUCTURE_BUILT_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: EVENT_CONTRIBUTION_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: REGION_UNLOCKED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
        publicClient.getLogs({
          address: logAddresses,
          event: RESOURCES_HARVESTED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        }),
      ]);

      const seenIds = new Set<string>();
      const seenClaimKeys = new Set<string>();
      const items: VerifiedActivityItem[] = [];
      const pushUnique = (item: VerifiedActivityItem) => {
        if (seenIds.has(item.id)) return;
        if (item.kind === "claim" && item.tileId !== undefined) {
          const claimKey = `${item.player.toLowerCase()}-${item.tileId}`;
          if (seenClaimKeys.has(claimKey)) return;
          seenClaimKeys.add(claimKey);
        }
        seenIds.add(item.id);
        items.push(item);
      };

      // Sort claimLogs ascending by blockNumber first so the original player txHash is preferred over constructor migration
      const sortedClaimLogs = [...claimLogs].sort((a, b) =>
        Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n))
      );

      for (const l of sortedClaimLogs) {
        if (!l.transactionHash || !l.args.player) continue;
        pushUnique({
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
        pushUnique({
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
        pushUnique({
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
        pushUnique({
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
        pushUnique({
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
        pushUnique({
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
        pushUnique({
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
      setActivities(items);
    } catch {
      // Preserve last verified logs on transient RPC hiccup
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isContractDeployed, publicClient]);

  useEffect(() => {
    fetchVerifiedLogs();
  }, [fetchVerifiedLogs]);

  const heartlandsTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[0]?.result as never,
        0,
        isContractDeployed
      ),
    [batchData, isContractDeployed]
  );

  const frontierTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[1]?.result as never,
        1,
        isContractDeployed
      ),
    [batchData, isContractDeployed]
  );

  const highlandsTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[2]?.result as never,
        2,
        isContractDeployed
      ),
    [batchData, isContractDeployed]
  );

  const crossroadsTiles = useMemo(
    () =>
      mapRawRegionTiles(
        batchData?.[3]?.result as never,
        3,
        isContractDeployed
      ),
    [batchData, isContractDeployed]
  );

  const isHeartlandsUnlocked = Boolean(
    !isContractDeployed || batchData?.[4]?.result !== false
  );
  const isWildFrontierUnlocked = Boolean(
    isContractDeployed && batchData?.[5]?.result === true
  );
  const isHighlandsUnlocked = Boolean(
    isContractDeployed && batchData?.[6]?.result === true
  );
  const isCrossroadsUnlocked = Boolean(
    isContractDeployed && batchData?.[7]?.result === true
  );

  const regionUnlockedMap: Record<number, boolean> = useMemo(
    () => ({
      0: isHeartlandsUnlocked,
      1: isWildFrontierUnlocked,
      2: isHighlandsUnlocked,
      3: isCrossroadsUnlocked,
    }),
    [
      isCrossroadsUnlocked,
      isHeartlandsUnlocked,
      isHighlandsUnlocked,
      isWildFrontierUnlocked,
    ]
  );

  const tiles: TileState[] = useMemo(() => {
    if (activeRegionId === 3) return crossroadsTiles;
    if (activeRegionId === 2) return highlandsTiles;
    if (activeRegionId === 1) return frontierTiles;
    return heartlandsTiles;
  }, [
    activeRegionId,
    crossroadsTiles,
    frontierTiles,
    heartlandsTiles,
    highlandsTiles,
  ]);

  const allPlayableTiles: TileState[] = useMemo(
    () => [
      ...heartlandsTiles,
      ...frontierTiles,
      ...highlandsTiles,
      ...crossroadsTiles,
    ],
    [crossroadsTiles, frontierTiles, heartlandsTiles, highlandsTiles]
  );

  const costs = useMemo(
    () => ({
      claim:
        (batchData?.[8]?.result as bigint | undefined) ?? DEFAULT_COSTS.claim,
      settlementSlot1:
        (batchData?.[9]?.result as bigint | undefined) ??
        DEFAULT_COSTS.settlementSlot1,
      settlementSlot2:
        (batchData?.[10]?.result as bigint | undefined) ??
        DEFAULT_COSTS.settlementSlot2,
      settlementSlot3:
        (batchData?.[11]?.result as bigint | undefined) ??
        DEFAULT_COSTS.settlementSlot3,
      upgradeToLv2:
        (batchData?.[12]?.result as bigint | undefined) ??
        DEFAULT_COSTS.upgradeToLv2,
      upgradeToLv3:
        (batchData?.[13]?.result as bigint | undefined) ??
        DEFAULT_COSTS.upgradeToLv3,
      upgradeToLv4:
        (batchData?.[14]?.result as bigint | undefined) ??
        DEFAULT_COSTS.upgradeToLv4,
      upgradeToLv5:
        (batchData?.[15]?.result as bigint | undefined) ??
        DEFAULT_COSTS.upgradeToLv5,
      outpost:
        (batchData?.[16]?.result as bigint | undefined) ??
        DEFAULT_COSTS.outpost,
      workshop:
        (batchData?.[17]?.result as bigint | undefined) ??
        DEFAULT_COSTS.workshop,
      beacon:
        (batchData?.[18]?.result as bigint | undefined) ?? DEFAULT_COSTS.beacon,
      lumberCamp:
        (batchData?.[19]?.result as bigint | undefined) ??
        DEFAULT_COSTS.lumberCamp,
      quarry:
        (batchData?.[20]?.result as bigint | undefined) ?? DEFAULT_COSTS.quarry,
      farm:
        (batchData?.[21]?.result as bigint | undefined) ?? DEFAULT_COSTS.farm,
    }),
    [batchData]
  );

  const treasuryAddress =
    (batchData?.[22]?.result as `0x${string}` | undefined) ?? null;

  const allWorldEvents: WorldEventState[] = useMemo(() => {
    const defaults: WorldEventState[] = [
      {
        id: 1,
        title: "The Great Bridge",
        description:
          "Two regions — The Heartlands and The Wild Frontier — are separated by a deep northern strait. Contribute $WIF to construct The Great Bridge at (3, 0) and unlock Region 1: The Wild Frontier (49 new tiles) for every player.",
        targetTileId: 3,
        unlocksRegionId: 1,
        targetAmount: parseUnits("1250", WIF_DECIMALS),
        totalContributed: 0n,
        deadline: 0,
        completed: false,
        active: true,
      },
      {
        id: 2,
        title: "The Great Harvest",
        description:
          "Unite regional Farms and granaries across The Heartlands to stockpile winter provisions at Central Sanctuary (3, 3) and permanently boost regional Food storage capacity.",
        targetTileId: 24,
        unlocksRegionId: null,
        targetAmount: parseUnits("750", WIF_DECIMALS),
        totalContributed: 0n,
        deadline: 0,
        completed: false,
        active: true,
      },
      {
        id: 3,
        title: "The Frontier",
        description:
          "Establish fortified frontier outposts and supply roads across The Wild Frontier at Monolith (3, 3) to unlock Region 2: The Highlands.",
        targetTileId: 73,
        unlocksRegionId: 2,
        targetAmount: parseUnits("1000", WIF_DECIMALS),
        totalContributed: 0n,
        deadline: 0,
        completed: false,
        active: true,
      },
      {
        id: 4,
        title: "The Forgotten Monument",
        description:
          "Excavate and restore the ancient obsidian monolith at Skyforge Summit in The Highlands to awaken realm-wide Signal Beacon resonance.",
        targetTileId: 122,
        unlocksRegionId: null,
        targetAmount: parseUnits("1250", WIF_DECIMALS),
        totalContributed: 0n,
        deadline: 0,
        completed: false,
        active: true,
      },
      {
        id: 5,
        title: "The Northern Passage",
        description:
          "Carve a high-altitude stone causeway through the northern crags to unlock Region 3: The Crossroads for master builders.",
        targetTileId: 171,
        unlocksRegionId: 3,
        targetAmount: parseUnits("1500", WIF_DECIMALS),
        totalContributed: 0n,
        deadline: 0,
        completed: false,
        active: true,
      },
    ];

    if (!isContractDeployed) return defaults;

    return defaults.map((def, idx) => {
      const raw = batchData?.[24 + idx]?.result as
        | readonly [
            string,
            number,
            number,
            bigint,
            bigint,
            bigint,
            boolean,
            boolean
          ]
        | undefined;
      if (!raw || !raw[0]) return def;
      const [
        title,
        targetWorldTileId,
        unlocksRegionId,
        targetAmount,
        totalContributed,
        deadline,
        completed,
        active,
      ] = raw;
      return {
        id: def.id,
        title: title || def.title,
        description: def.description,
        targetTileId: Number(targetWorldTileId),
        unlocksRegionId:
          unlocksRegionId === 255 ? null : Number(unlocksRegionId),
        targetAmount: targetAmount > 0n ? targetAmount : def.targetAmount,
        totalContributed,
        deadline: Number(deadline),
        completed,
        active,
      };
    });
  }, [batchData, isContractDeployed]);

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
        title: title || "The Great Bridge",
        description:
          "Two regions — The Heartlands and The Wild Frontier — are separated by a deep northern strait. Contribute $WIF to construct The Great Bridge at (3, 0) and unlock Region 1: The Wild Frontier (49 new tiles) for every player.",
        targetTileId: Number(targetWorldTileId),
        unlocksRegionId: unlocksRegionId === 255 ? null : Number(unlocksRegionId),
        targetAmount,
        totalContributed,
        deadline: Number(deadline),
        completed,
        active,
      };
    }

    return {
      id: 1,
      title: "The Great Bridge",
      description:
        "Two regions — The Heartlands and The Wild Frontier — are separated by a deep northern strait. Contribute $WIF to construct The Great Bridge at Heartlands (3, 0) and unlock Region 1: The Wild Frontier (49 new tiles) onchain for all builders.",
      targetTileId: BEACON_TARGET_TILE_ID,
      unlocksRegionId: 1,
      targetAmount: parseUnits("1250", WIF_DECIMALS),
      totalContributed: 0n,
      deadline: 0,
      completed: false,
      active: false,
    };
  }, [activeEventId, eventRaw, isContractDeployed]);

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
      unlockedRegionsCount:
        (isHeartlandsUnlocked ? 1 : 0) +
        (isWildFrontierUnlocked ? 1 : 0) +
        (isHighlandsUnlocked ? 1 : 0) +
        (isCrossroadsUnlocked ? 1 : 0),
    };
  }, [
    allPlayableTiles,
    isCrossroadsUnlocked,
    isHeartlandsUnlocked,
    isHighlandsUnlocked,
    isWildFrontierUnlocked,
  ]);

  const computePlayerStatsForAddress = useCallback(
    (addr?: `0x${string}`): PlayerStats => {
      if (!addr) {
        return {
          tilesClaimed: 0,
          settlementsBuilt: 0,
          totalSettlementUpgrades: 0,
          structuresBuilt: 0,
          outpostsBuilt: 0,
          workshopsBuilt: 0,
          beaconsBuilt: 0,
          lumberCampsBuilt: 0,
          quarriesBuilt: 0,
          farmsBuilt: 0,
          maxSettlementLevel: 0,
          eventsContributedCount: 0,
          totalEventWifContributed: 0n,
          wood: 0,
          stone: 0,
          food: 0,
          woodPerHour: 0,
          stonePerHour: 0,
          foodPerHour: 0,
          storageCap: 300,
          lastResourceSync: 0,
          maxClaimableTiles: 3,
          activityScore: 0,
          progressionStage: 1,
        };
      }

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

        const lastSync = Number(s.lastResourceSync ?? 0);
        const elapsed = lastSync > 0 ? Math.max(0, nowSec - lastSync) : 0;
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

      // Derive strictly from verified onchain tiles & event logs
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

      const playerEvents = activities.filter(
        (a) => a.kind === "event" && a.player.toLowerCase() === lower
      );
      const totalEventWifContributed = playerEvents.reduce(
        (acc, item) => acc + item.wifAmount,
        0n
      );

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
        eventsContributedCount: playerEvents.length,
        totalEventWifContributed,
        wood: 0,
        stone: 0,
        food: 0,
        woodPerHour: rates.woodPerHour,
        stonePerHour: rates.stonePerHour,
        foodPerHour: rates.foodPerHour,
        storageCap,
        lastResourceSync: 0,
      };

      return {
        ...base,
        maxClaimableTiles: computeMaxClaimableTiles(base),
        activityScore: computeActivityScore(base),
        progressionStage: computeProgressionStage(base),
      };
    },
    [
      activities,
      allPlayableTiles,
      isContractDeployed,
      nowSec,
      playerStateRaw,
      targetProfileAddress,
    ]
  );

  const playerStats: PlayerStats = useMemo(
    () => computePlayerStatsForAddress(targetProfileAddress),
    [computePlayerStatsForAddress, targetProfileAddress]
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
    for (const act of activities) {
      if (act.player && act.player.toLowerCase() !== ZERO_ADDRESS) {
        owners.add(act.player);
      }
    }

    const rankings: RegionalBuilderRanking[] = [];
    for (const ownerAddr of owners) {
      const st = computePlayerStatsForAddress(ownerAddr as `0x${string}`);
      if (st.tilesClaimed === 0 && st.eventsContributedCount === 0) continue;
      const lower = ownerAddr.toLowerCase();
      const isCurrent =
        Boolean(targetProfileAddress) &&
        lower === targetProfileAddress?.toLowerCase();

      rankings.push({
        address: ownerAddr as `0x${string}`,
        displayName: isCurrent
          ? "Your Civilization"
          : `${ownerAddr.slice(0, 6)}...${ownerAddr.slice(-4)}`,
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
    activities,
    allPlayableTiles,
    computePlayerStatsForAddress,
    targetProfileAddress,
  ]);

  const refreshAllWorldState = useCallback(async () => {
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
    effectiveProfileAddress: targetProfileAddress,
    tiles,
    heartlandsTiles,
    frontierTiles,
    highlandsTiles,
    crossroadsTiles,
    allPlayableTiles,
    regionUnlockedMap,
    isWildFrontierUnlocked,
    isHighlandsUnlocked,
    isCrossroadsUnlocked,
    costs,
    worldEvent,
    allWorldEvents,
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
  _activePlayerAddress?: `0x${string}`
) {
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [stage, setStage] = useState<TxLifecycleStage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string | null>(null);

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
        setStage("failed");
        setErrorMessage(
          "WIFWorlds contract is not yet deployed on Robinhood Chain."
        );
        return false;
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
        setStage("failed");
        setErrorMessage(
          "WIFWorlds contract is awaiting deployment on Robinhood Chain."
        );
        return false;
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
    [onSuccessRefresh, publicClient, writeContractAsync]
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
