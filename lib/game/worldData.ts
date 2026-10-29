import { parseUnits } from "viem";
import { WIF_DECIMALS } from "@/lib/chain/robinhood";

export const GRID_SIZE = 7;
export const TILES_PER_REGION = GRID_SIZE * GRID_SIZE; // 49 tiles per region
export const TOTAL_TILES = TILES_PER_REGION;
export const MAX_SETTLEMENTS_PER_REGION = 3;
export const MIN_SETTLEMENT_MANHATTAN_DISTANCE = 2;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export enum TerrainType {
  Plains = 0,
  Forest = 1,
  Hills = 2,
  Water = 3,
  Rocky = 4,
  Landmark = 5,
}

export enum StructureType {
  None = 0,
  Outpost = 1,
  Workshop = 2,
  Beacon = 3,
}

export type WorldActionKind = "claim" | "settlement" | "upgrade" | "structure";

export interface RegionConfig {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  unlockRequirementLabel: string;
  unlockedAtGenesis: boolean;
  mvpPlayable: boolean; // Regions 0 & 1 have initialized 49-tile grids in MVP contract
  landmarkTileLocalId: number;
  landmarkName: string;
}

export const REGIONS: RegionConfig[] = [
  {
    id: 0,
    slug: "heartlands",
    name: "The Heartlands",
    subtitle: "Starting Cradle • 7 × 7",
    description:
      "Fertile river plains, ancient timber forests, and the Northern Beacon Spire where every civilization begins.",
    unlockRequirementLabel: "Unlocked at Genesis",
    unlockedAtGenesis: true,
    mvpPlayable: true,
    landmarkTileLocalId: 3, // (3, 0) Northern Beacon Spire
    landmarkName: "Northern Beacon Spire",
  },
  {
    id: 1,
    slug: "wild-frontier",
    name: "The Wild Frontier",
    subtitle: "Expansion Realm • 7 × 7",
    description:
      "Untamed highland passes, mineral-rich basalt ridges, and deep frontier woods awaiting pioneer settlements.",
    unlockRequirementLabel:
      "Unlocks automatically onchain when 'Build the Beacon' reaches 100%",
    unlockedAtGenesis: false,
    mvpPlayable: true,
    landmarkTileLocalId: 24, // (3, 3) Frontier Watch Sanctuary
    landmarkName: "Frontier Watch Monolith",
  },
  {
    id: 2,
    slug: "highlands",
    name: "The Highlands",
    subtitle: "Future Region • 7 × 7",
    description:
      "Elevated obsidian peaks with specialized mountain engineering milestones.",
    unlockRequirementLabel: "Planned Phase II Regional Milestone",
    unlockedAtGenesis: false,
    mvpPlayable: false,
    landmarkTileLocalId: 24,
    landmarkName: "Skyforge Summit",
  },
  {
    id: 3,
    slug: "crossroads",
    name: "The Crossroads",
    subtitle: "Future Region • 7 × 7",
    description:
      "Shared trade basin centered around multi-builder bridges and regional monuments.",
    unlockRequirementLabel: "Planned Phase III Community Objective",
    unlockedAtGenesis: false,
    mvpPlayable: false,
    landmarkTileLocalId: 24,
    landmarkName: "Grand Causeway",
  },
];

export interface TerrainMeta {
  type: TerrainType;
  name: string;
  tagline: string;
  description: string;
  claimable: boolean;
  elevation: number;
  accentColor: string;
  allowedStructures: StructureType[];
}

export const TERRAIN_META: Record<TerrainType, TerrainMeta> = {
  [TerrainType.Plains]: {
    type: TerrainType.Plains,
    name: "Plains",
    tagline: "Fertile heartland terrace",
    description:
      "Open grasslands suited for Settlement Halls, Outposts, and Workshops. Signal Beacons require Stronghold Hall (Lv.2+) on Plains.",
    claimable: true,
    elevation: 1,
    accentColor: "#6D945A",
    allowedStructures: [StructureType.Outpost, StructureType.Workshop, StructureType.Beacon],
  },
  [TerrainType.Forest]: {
    type: TerrainType.Forest,
    name: "Forest",
    tagline: "Ancient timber canopy",
    description:
      "Dense woodland ideal for Settlement Halls, frontier Outposts, and timber Workshops.",
    claimable: true,
    elevation: 1.35,
    accentColor: "#467852",
    allowedStructures: [StructureType.Outpost, StructureType.Workshop, StructureType.Beacon],
  },
  [TerrainType.Hills]: {
    type: TerrainType.Hills,
    name: "Hills",
    tagline: "Elevated stone highlands",
    description:
      "Commanding highland ridges supporting all structure classes including Signal Beacons without needing a local Lv.2 Hall.",
    claimable: true,
    elevation: 2.0,
    accentColor: "#7E8C69",
    allowedStructures: [StructureType.Outpost, StructureType.Workshop, StructureType.Beacon],
  },
  [TerrainType.Water]: {
    type: TerrainType.Water,
    name: "Water",
    tagline: "Abyssal strait & coastal sea",
    description:
      "Natural maritime channels shaping strategic chokepoints across each region. Water tiles cannot be claimed.",
    claimable: false,
    elevation: 0,
    accentColor: "#256D7B",
    allowedStructures: [],
  },
  [TerrainType.Rocky]: {
    type: TerrainType.Rocky,
    name: "Rocky Crags",
    tagline: "Obsidian mountain ridge",
    description:
      "Jagged volcanic peaks suited for Strongholds, Outposts, and high-altitude Signal Beacons. Too steep for Workshops.",
    claimable: true,
    elevation: 2.75,
    accentColor: "#7C7578",
    allowedStructures: [StructureType.Outpost, StructureType.Beacon],
  },
  [TerrainType.Landmark]: {
    type: TerrainType.Landmark,
    name: "Ancient Landmark",
    tagline: "Shared world sanctuary",
    description:
      "Sacred regional monument site reserved for collective World Objectives rather than private ownership.",
    claimable: false,
    elevation: 2.6,
    accentColor: "#E63946",
    allowedStructures: [],
  },
};

export interface SettlementTierMeta {
  level: 1 | 2 | 3;
  name: string;
  costWif: bigint;
  capacityBonus: number;
  unlockSummary: string;
  requirementSummary: string;
}

export const SETTLEMENT_TIER_META: Record<1 | 2 | 3, SettlementTierMeta> = {
  1: {
    level: 1,
    name: "Settlement Hall (Lv. 1)",
    costWif: parseUnits("25", WIF_DECIMALS),
    capacityBonus: 3,
    unlockSummary: "+3 Territory Capacity • Unlocks regional Workshop construction",
    requirementSummary: "Owned claimable tile + Settlement slot & spacing ≥ 2",
  },
  2: {
    level: 2,
    name: "Stronghold Hall (Lv. 2)",
    costWif: parseUnits("31.25", WIF_DECIMALS),
    capacityBonus: 2,
    unlockSummary:
      "+2 Territory Capacity • Unlocks Signal Beacons & 2nd Settlement path",
    requirementSummary: "Lv. 1 Hall on tile + own ≥ 2 tiles & ≥ 1 structure",
  },
  3: {
    level: 3,
    name: "Citadel Hall (Lv. 3)",
    costWif: parseUnits("50", WIF_DECIMALS),
    capacityBonus: 2,
    unlockSummary:
      "+2 Territory Capacity • Unlocks 3rd Settlement slot & Sovereign standing",
    requirementSummary: "Lv. 2 Stronghold on tile + own ≥ 1 Workshop",
  },
};

export interface StructureMeta {
  type: Exclude<StructureType, StructureType.None>;
  name: string;
  shortPurpose: string;
  description: string;
  unlockEffect: string;
  terrainRuleLabel: string;
  prerequisiteLabel: string;
  defaultCostWif: bigint;
  capacityBonus: number;
  activityPoints: number;
}

export const STRUCTURE_META: Record<
  Exclude<StructureType, StructureType.None>,
  StructureMeta
> = {
  [StructureType.Outpost]: {
    type: StructureType.Outpost,
    name: "Outpost",
    shortPurpose: "Frontier foothold & +2 Territory Capacity",
    description:
      "Establishes a frontier watchtower on any claimed tile you own — even far ahead of your Settlement Halls.",
    unlockEffect: "+2 Territory Capacity • Satisfies Stronghold & Expansion milestones",
    terrainRuleLabel: "Plains, Forest, Hills, or Rocky Crags",
    prerequisiteLabel: "Any claimed tile you own (no Settlement Hall required)",
    defaultCostWif: parseUnits("12.5", WIF_DECIMALS),
    capacityBonus: 2,
    activityPoints: 120,
  },
  [StructureType.Workshop]: {
    type: StructureType.Workshop,
    name: "Workshop",
    shortPurpose: "Artisan industry & Citadel prerequisite",
    description:
      "Constructs a timber-and-iron forge supporting advanced civilization engineering across your regional network.",
    unlockEffect: "Unlocks Citadel Hall (Lv. 3) upgrades & expansion milestones",
    terrainRuleLabel: "Plains, Forest, or Hills (not sheer Rocky Crags)",
    prerequisiteLabel: "At least 1 Settlement Hall established in this region",
    defaultCostWif: parseUnits("18.75", WIF_DECIMALS),
    capacityBonus: 0,
    activityPoints: 180,
  },
  [StructureType.Beacon]: {
    type: StructureType.Beacon,
    name: "Signal Beacon",
    shortPurpose: "Regional relay & World Influence spire",
    description:
      "Raises a crimson signal relay linking your settlement network to shared Regional Objectives.",
    unlockEffect: "Amplifies regional builder standing & Stage 4 mastery",
    terrainRuleLabel: "Hills, Rocky Crags, or any tile with Stronghold Lv.2+",
    prerequisiteLabel: "At least 1 Stronghold Hall (Lv. 2+) in your civilization",
    defaultCostWif: parseUnits("31.25", WIF_DECIMALS),
    capacityBonus: 0,
    activityPoints: 260,
  },
};

export const DEFAULT_COSTS = {
  claim: parseUnits("6.25", WIF_DECIMALS),
  settlementSlot1: parseUnits("25", WIF_DECIMALS),
  settlementSlot2: parseUnits("43.75", WIF_DECIMALS),
  settlementSlot3: parseUnits("62.5", WIF_DECIMALS),
  upgradeToLv2: parseUnits("31.25", WIF_DECIMALS),
  upgradeToLv3: parseUnits("50", WIF_DECIMALS),
  outpost: STRUCTURE_META[StructureType.Outpost].defaultCostWif,
  workshop: STRUCTURE_META[StructureType.Workshop].defaultCostWif,
  beacon: STRUCTURE_META[StructureType.Beacon].defaultCostWif,
};

export const BEACON_TARGET_TILE_ID = 3; // Region 0, Row 0, Col 3 — Northern Spire
export const HEARTSTONE_TILE_ID = 24;   // Region 0, Row 3, Col 3 — Central Crucible

/**
 * Region 0: The Heartlands (worldTileId 0..48)
 */
export const HEARTLANDS_TERRAIN_GRID: TerrainType[] = [
  TerrainType.Water, TerrainType.Rocky, TerrainType.Hills, TerrainType.Landmark, TerrainType.Hills, TerrainType.Rocky, TerrainType.Water,
  TerrainType.Rocky, TerrainType.Forest, TerrainType.Plains, TerrainType.Hills, TerrainType.Forest, TerrainType.Plains, TerrainType.Hills,
  TerrainType.Water, TerrainType.Plains, TerrainType.Forest, TerrainType.Plains, TerrainType.Hills, TerrainType.Forest, TerrainType.Plains,
  TerrainType.Plains, TerrainType.Hills, TerrainType.Plains, TerrainType.Landmark, TerrainType.Plains, TerrainType.Hills, TerrainType.Water,
  TerrainType.Forest, TerrainType.Plains, TerrainType.Hills, TerrainType.Forest, TerrainType.Plains, TerrainType.Forest, TerrainType.Rocky,
  TerrainType.Hills, TerrainType.Forest, TerrainType.Plains, TerrainType.Plains, TerrainType.Forest, TerrainType.Hills, TerrainType.Water,
  TerrainType.Water, TerrainType.Plains, TerrainType.Forest, TerrainType.Rocky, TerrainType.Hills, TerrainType.Plains, TerrainType.Water,
];

/**
 * Region 1: The Wild Frontier (worldTileId 49..97) — Unlocked when Build the Beacon completes!
 */
export const WILD_FRONTIER_TERRAIN_GRID: TerrainType[] = [
  TerrainType.Rocky, TerrainType.Hills, TerrainType.Forest, TerrainType.Rocky, TerrainType.Forest, TerrainType.Hills, TerrainType.Water,
  TerrainType.Hills, TerrainType.Forest, TerrainType.Hills, TerrainType.Plains, TerrainType.Hills, TerrainType.Rocky, TerrainType.Hills,
  TerrainType.Forest, TerrainType.Plains, TerrainType.Rocky, TerrainType.Forest, TerrainType.Plains, TerrainType.Forest, TerrainType.Water,
  TerrainType.Water, TerrainType.Hills, TerrainType.Forest, TerrainType.Landmark, TerrainType.Hills, TerrainType.Plains, TerrainType.Rocky,
  TerrainType.Rocky, TerrainType.Forest, TerrainType.Plains, TerrainType.Hills, TerrainType.Forest, TerrainType.Hills, TerrainType.Forest,
  TerrainType.Hills, TerrainType.Plains, TerrainType.Forest, TerrainType.Rocky, TerrainType.Plains, TerrainType.Rocky, TerrainType.Hills,
  TerrainType.Water, TerrainType.Rocky, TerrainType.Hills, TerrainType.Forest, TerrainType.Hills, TerrainType.Plains, TerrainType.Water,
];

export function getWorldTileId(regionId: number, localTileId: number): number {
  return regionId * TILES_PER_REGION + localTileId;
}

export function parseWorldTileId(worldTileId: number): {
  regionId: number;
  localTileId: number;
  row: number;
  col: number;
} {
  const regionId = Math.floor(worldTileId / TILES_PER_REGION);
  const localTileId = worldTileId % TILES_PER_REGION;
  return {
    regionId,
    localTileId,
    row: Math.floor(localTileId / GRID_SIZE),
    col: localTileId % GRID_SIZE,
  };
}

export function getTileCoords(worldTileId: number): { row: number; col: number } {
  const { row, col } = parseWorldTileId(worldTileId);
  return { row, col };
}

export function formatCoords(worldTileId: number): string {
  const { row, col } = parseWorldTileId(worldTileId);
  return `(${col}, ${row})`;
}

export function manhattanDistance(tileIdA: number, tileIdB: number): number {
  const a = parseWorldTileId(tileIdA);
  const b = parseWorldTileId(tileIdB);
  if (a.regionId !== b.regionId) return 999;
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function getRegionLabel(worldTileId: number): string {
  const { regionId, localTileId, row, col } = parseWorldTileId(worldTileId);
  if (regionId === 0) {
    if (localTileId === 3) return "Northern Beacon Spire • Heartlands";
    if (localTileId === 24) return "The Ember Crucible • Heartlands";
    if (row <= 1) return "Northern Frostmarch • Heartlands";
    if (row >= 5) return "Southern Lowlands • Heartlands";
    if (col <= 1) return "Western Mistcoast • Heartlands";
    if (col >= 5) return "Eastern Ironreach • Heartlands";
    return "Central Crownlands • Heartlands";
  }
  if (regionId === 1) {
    if (localTileId === 24) return "Frontier Watch Monolith • Wild Frontier";
    if (row <= 1) return "Shattered Ridges • Wild Frontier";
    if (row >= 5) return "Timberfall March • Wild Frontier";
    return "Untamed Basin • Wild Frontier";
  }
  return REGIONS[regionId]?.name ?? `Region ${regionId}`;
}

export interface TileState {
  id: number;          // worldTileId (0..48 for Region 0, 49..97 for Region 1)
  localId: number;     // 0..48 within region
  regionId: number;
  row: number;
  col: number;
  terrain: TerrainType;
  owner: `0x${string}`;
  settlementLevel: number; // 0 = none, 1 = Hall, 2 = Stronghold, 3 = Citadel
  hasSettlement: boolean;  // convenience: settlementLevel > 0
  structureType: StructureType;
  claimedAt: number;
  isEventTarget: boolean;
}

export function createGenesisRegionTiles(regionId: number): TileState[] {
  const grid =
    regionId === 1 ? WILD_FRONTIER_TERRAIN_GRID : HEARTLANDS_TERRAIN_GRID;

  return grid.map((terrain, localId) => {
    const id = getWorldTileId(regionId, localId);
    const row = Math.floor(localId / GRID_SIZE);
    const col = localId % GRID_SIZE;
    return {
      id,
      localId,
      regionId,
      row,
      col,
      terrain,
      owner: ZERO_ADDRESS as `0x${string}`,
      settlementLevel: 0,
      hasSettlement: false,
      structureType: StructureType.None,
      claimedAt: 0,
      isEventTarget: id === BEACON_TARGET_TILE_ID,
    };
  });
}

export interface WorldEventState {
  id: number;
  title: string;
  description: string;
  targetTileId: number;
  unlocksRegionId: number | null;
  targetAmount: bigint;
  totalContributed: bigint;
  deadline: number;
  completed: boolean;
  active: boolean;
}

export interface VerifiedActivityItem {
  id: string;
  kind: "claim" | "settlement" | "upgrade" | "structure" | "event" | "region_unlock";
  player: `0x${string}`;
  tileId?: number;
  newLevel?: number;
  structureType?: StructureType;
  eventId?: number;
  regionId?: number;
  wifAmount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: number;
}

export interface PlayerStats {
  tilesClaimed: number;
  settlementsBuilt: number;
  totalSettlementUpgrades: number;
  structuresBuilt: number;
  outpostsBuilt: number;
  workshopsBuilt: number;
  beaconsBuilt: number;
  maxSettlementLevel: number;
  eventsContributedCount: number;
  totalEventWifContributed: bigint;
  maxClaimableTiles: number;
  activityScore: number;
  progressionStage: 1 | 2 | 3 | 4 | 5;
}

/**
 * Anti-whale Territory Capacity Formula:
 * Base 3 + 3 per Settlement + 2 per Hall Upgrade + 2 per Outpost
 */
export function computeMaxClaimableTiles(params: {
  settlementsBuilt: number;
  totalSettlementUpgrades: number;
  outpostsBuilt: number;
}): number {
  return (
    3 +
    params.settlementsBuilt * 3 +
    params.totalSettlementUpgrades * 2 +
    params.outpostsBuilt * 2
  );
}

export function getNextSettlementCost(currentSettlementsCount: number): bigint {
  if (currentSettlementsCount === 0) return DEFAULT_COSTS.settlementSlot1;
  if (currentSettlementsCount === 1) return DEFAULT_COSTS.settlementSlot2;
  return DEFAULT_COSTS.settlementSlot3;
}

export function computeActivityScore(stats: {
  tilesClaimed: number;
  settlementsBuilt: number;
  totalSettlementUpgrades: number;
  structuresBuilt: number;
  eventsContributedCount: number;
}): number {
  return (
    stats.tilesClaimed * 50 +
    stats.settlementsBuilt * 200 +
    stats.totalSettlementUpgrades * 175 +
    stats.structuresBuilt * 150 +
    stats.eventsContributedCount * 100
  );
}

export interface ProgressionStageInfo {
  stage: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortGoal: string;
  nextMilestoneHint: string;
}

export const PROGRESSION_STAGES: Record<1 | 2 | 3 | 4 | 5, Omit<ProgressionStageInfo, "stage">> = {
  1: {
    title: "Stage 1: Found First Settlement",
    shortGoal: "Claim land & raise a Settlement Hall (Lv. 1)",
    nextMilestoneHint:
      "Claim an eligible tile in The Heartlands (6.25 $WIF) and establish your first Settlement Hall (25 $WIF).",
  },
  2: {
    title: "Stage 2: Develop Your Settlement",
    shortGoal: "Build structures & upgrade to Stronghold (Lv. 2)",
    nextMilestoneHint:
      "Construct an Outpost (+2 tile cap) or Workshop, then upgrade your hall to Stronghold Hall (Lv. 2).",
  },
  3: {
    title: "Stage 3: Expand Your Territory",
    shortGoal: "Earn & establish your 2nd Settlement",
    nextMilestoneHint:
      "With a Lv. 2 Stronghold, 2+ structures, and 3+ tiles, found a 2nd Settlement at distance ≥ 2.",
  },
  4: {
    title: "Stage 4: Regional Network",
    shortGoal: "Upgrade to Citadel (Lv. 3) & back the World Event",
    nextMilestoneHint:
      "Build a Workshop to unlock Citadel Hall (Lv. 3), raise a Signal Beacon, and contribute $WIF to Build the Beacon.",
  },
  5: {
    title: "Stage 5: Frontier Sovereign",
    shortGoal: "Expand into The Wild Frontier",
    nextMilestoneHint:
      "Help the community finish Build the Beacon to unlock Region 1: The Wild Frontier and pioneer new territory.",
  },
};

export function computeProgressionStage(stats: {
  settlementsBuilt: number;
  structuresBuilt: number;
  maxSettlementLevel: number;
  eventsContributedCount: number;
}): 1 | 2 | 3 | 4 | 5 {
  if (stats.settlementsBuilt === 0) return 1;
  if (stats.maxSettlementLevel < 2 || stats.structuresBuilt < 2) return 2;
  if (stats.settlementsBuilt < 2) return 3;
  if (stats.maxSettlementLevel < 3 || stats.eventsContributedCount < 1) return 4;
  return 5;
}

export function getBuilderTitle(score: number): string {
  if (score === 0) return "Uncharted Wanderer";
  if (score < 250) return "Frontier Pioneer";
  if (score < 650) return "Settlement Warden";
  if (score < 1300) return "Domain Architect";
  return "Sovereign of the Realm";
}
