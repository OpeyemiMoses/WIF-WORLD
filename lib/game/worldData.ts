import { parseUnits } from "viem";
import { WIF_DECIMALS } from "@/lib/chain/robinhood";

export const GRID_SIZE = 7;
export const TILES_PER_REGION = GRID_SIZE * GRID_SIZE; // 49 tiles per region
export const TOTAL_TILES = TILES_PER_REGION;
export const MAX_SETTLEMENTS_PER_REGION = 3;
export const MIN_SETTLEMENT_MANHATTAN_DISTANCE = 2;
export const MAX_SETTLEMENT_LEVEL = 5;
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
  LumberCamp = 4,
  Quarry = 5,
  Farm = 6,
}

export type ResourceKey = "wood" | "stone" | "food";

export interface ResourceCost {
  wood: number;
  stone: number;
  food: number;
}

export interface ResourceMeta {
  key: ResourceKey;
  name: string;
  role: string;
  description: string;
  primaryBuilding: string;
  bestTerrain: string;
  accentColor: string;
  badgeBg: string;
}

export const RESOURCE_META: Record<ResourceKey, ResourceMeta> = {
  wood: {
    key: "wood",
    name: "Wood",
    role: "Construction Material",
    description:
      "Timber harvested from Lumber Camps and Forest canopies. Essential for founding structures, Outposts, Workshops, and Settlement upgrades.",
    primaryBuilding: "Lumber Camp",
    bestTerrain: "Forest (+45/hr)",
    accentColor: "#D99B52",
    badgeBg: "rgba(217, 155, 82, 0.14)",
  },
  stone: {
    key: "stone",
    name: "Stone",
    role: "Advanced Buildings",
    description:
      "Quarried granite and obsidian blocks excavated from Hills and Rocky Crags. Required for Workshops, Signal Beacons, and high-tier Citadels.",
    primaryBuilding: "Quarry",
    bestTerrain: "Rocky Crags & Hills (+40/hr)",
    accentColor: "#94A3B8",
    badgeBg: "rgba(148, 163, 184, 0.14)",
  },
  food: {
    key: "food",
    role: "Settlement Development",
    name: "Food",
    description:
      "Golden grain harvested from fertile Plains Farms. Sustains population growth, Lumber Camp crews, and Settlement Hall level upgrades.",
    primaryBuilding: "Farm",
    bestTerrain: "Plains (+45/hr)",
    accentColor: "#EAB308",
    badgeBg: "rgba(234, 179, 8, 0.14)",
  },
};

export type WorldActionKind = "claim" | "settlement" | "upgrade" | "structure" | "harvest";

export interface RegionConfig {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  specialtyLabel: string;
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
    specialtyLabel: "Balanced Wood & Food (+45/hr Plains Farms & Forest Lumber)",
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
    specialtyLabel: "Abundant Stone & Timber (High-Yield Quarries & Signal Beacons)",
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
      "Elevated obsidian peaks with specialized mountain engineering milestones and deep stone veins.",
    specialtyLabel: "Obsidian Quarries & High-Altitude Relays",
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
      "Shared trade basin centered around multi-builder bridges, agricultural estates, and regional monuments.",
    specialtyLabel: "Grand Granaries & Trade Causeways",
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
  resourceAffinity: string;
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
      "Open grasslands ideal for Farms (+45 Food/hr), Settlement Halls, Outposts, and Workshops. Signal Beacons require Stronghold (Lv.2+) on Plains.",
    resourceAffinity: "+45 Food/hr (Farm Bonus) • +30 Wood/hr • +25 Stone/hr",
    claimable: true,
    elevation: 1,
    accentColor: "#6D945A",
    allowedStructures: [
      StructureType.Farm,
      StructureType.LumberCamp,
      StructureType.Quarry,
      StructureType.Outpost,
      StructureType.Workshop,
      StructureType.Beacon,
    ],
  },
  [TerrainType.Forest]: {
    type: TerrainType.Forest,
    name: "Forest",
    tagline: "Ancient timber canopy",
    description:
      "Dense woodland ideal for Lumber Camps (+45 Wood/hr), Settlement Halls, frontier Outposts, and timber Workshops.",
    resourceAffinity: "+45 Wood/hr (Lumber Bonus) • +30 Food/hr",
    claimable: true,
    elevation: 1.35,
    accentColor: "#467852",
    allowedStructures: [
      StructureType.LumberCamp,
      StructureType.Farm,
      StructureType.Outpost,
      StructureType.Workshop,
      StructureType.Beacon,
    ],
  },
  [TerrainType.Hills]: {
    type: TerrainType.Hills,
    name: "Hills",
    tagline: "Elevated stone highlands",
    description:
      "Commanding highland ridges supporting Quarries (+40 Stone/hr) and all structure classes including Signal Beacons without needing a local Lv.2 Hall.",
    resourceAffinity: "+40 Stone/hr (Quarry Bonus) • +30 Wood/hr • +30 Food/hr",
    claimable: true,
    elevation: 2.0,
    accentColor: "#7E8C69",
    allowedStructures: [
      StructureType.Quarry,
      StructureType.LumberCamp,
      StructureType.Farm,
      StructureType.Outpost,
      StructureType.Workshop,
      StructureType.Beacon,
    ],
  },
  [TerrainType.Water]: {
    type: TerrainType.Water,
    name: "Water",
    tagline: "Abyssal strait & coastal sea",
    description:
      "Natural maritime channels shaping strategic chokepoints across each region. Water tiles cannot be claimed.",
    resourceAffinity: "Unclaimable Maritime Channel",
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
      "Jagged volcanic peaks rich in mineral veins for Quarries (+40 Stone/hr), Outposts, and high-altitude Signal Beacons. Too steep for Workshops or Farms.",
    resourceAffinity: "+40 Stone/hr (Peak Quarry Bonus) • Beacon Elevation",
    claimable: true,
    elevation: 2.75,
    accentColor: "#7C7578",
    allowedStructures: [
      StructureType.Quarry,
      StructureType.Outpost,
      StructureType.Beacon,
    ],
  },
  [TerrainType.Landmark]: {
    type: TerrainType.Landmark,
    name: "Ancient Landmark",
    tagline: "Shared world sanctuary",
    description:
      "Sacred regional monument site reserved for collective World Objectives rather than private ownership.",
    resourceAffinity: "Shared Regional Monument",
    claimable: false,
    elevation: 2.6,
    accentColor: "#E63946",
    allowedStructures: [],
  },
};

export type SettlementLevel = 1 | 2 | 3 | 4 | 5;

export interface SettlementTierMeta {
  level: SettlementLevel;
  name: string;
  shortUnlock: string;
  costWif: bigint;
  resourceCost: ResourceCost;
  capacityBonus: number;
  storageBonus: number;
  productionBonus: ResourceCost;
  unlockSummary: string;
  requirementSummary: string;
}

export const SETTLEMENT_TIER_META: Record<SettlementLevel, SettlementTierMeta> = {
  1: {
    level: 1,
    name: "Settlement Hall (Lv. 1)",
    shortUnlock: "Basic structures",
    costWif: parseUnits("25", WIF_DECIMALS),
    resourceCost: { wood: 0, stone: 0, food: 0 },
    capacityBonus: 3,
    storageBonus: 200,
    productionBonus: { wood: 20, stone: 10, food: 20 },
    unlockSummary:
      "+3 Territory Cap • Unlocks Basic Structures (Lumber Camp, Quarry, Farm, Workshop) • +20W/+10S/+20F per hr",
    requirementSummary: "Owned claimable tile + Settlement slot & spacing ≥ 2",
  },
  2: {
    level: 2,
    name: "Homestead Keep (Lv. 2)",
    shortUnlock: "More building slots",
    costWif: parseUnits("31.25", WIF_DECIMALS),
    resourceCost: { wood: 30, stone: 20, food: 25 },
    capacityBonus: 2,
    storageBonus: 150,
    productionBonus: { wood: 15, stone: 10, food: 15 },
    unlockSummary:
      "+2 Territory Cap • Expands building slots & warehouse (+150 cap) • Unlocks Signal Beacons & 2nd Settlement",
    requirementSummary: "Lv. 1 Hall on tile + own ≥ 2 tiles & ≥ 1 structure + 30W / 20S / 25F",
  },
  3: {
    level: 3,
    name: "Stronghold Citadel (Lv. 3)",
    shortUnlock: "Advanced production",
    costWif: parseUnits("50", WIF_DECIMALS),
    resourceCost: { wood: 50, stone: 45, food: 40 },
    capacityBonus: 2,
    storageBonus: 150,
    productionBonus: { wood: 25, stone: 20, food: 25 },
    unlockSummary:
      "+2 Territory Cap • Advanced Production (+25W/+20S/+25F per hr) • Unlocks 3rd Settlement path",
    requirementSummary: "Lv. 2 Keep on tile + own ≥ 1 Workshop + 50W / 45S / 40F",
  },
  4: {
    level: 4,
    name: "Grand Fortress (Lv. 4)",
    shortUnlock: "Expansion settlement",
    costWif: parseUnits("75", WIF_DECIMALS),
    resourceCost: { wood: 90, stone: 80, food: 70 },
    capacityBonus: 2,
    storageBonus: 150,
    productionBonus: { wood: 35, stone: 30, food: 35 },
    unlockSummary:
      "+2 Territory Cap • Expansion Settlement Mastery (+35W/+30S/+35F per hr & +150 warehouse cap)",
    requirementSummary: "Lv. 3 Stronghold on tile + own ≥ 4 tiles & ≥ 3 structures + 90W / 80S / 70F",
  },
  5: {
    level: 5,
    name: "Sovereign Capital (Lv. 5)",
    shortUnlock: "Regional projects",
    costWif: parseUnits("100", WIF_DECIMALS),
    resourceCost: { wood: 140, stone: 120, food: 110 },
    capacityBonus: 2,
    storageBonus: 150,
    productionBonus: { wood: 50, stone: 45, food: 50 },
    unlockSummary:
      "+2 Territory Cap • Regional Projects Leadership (+50W/+45S/+50F per hr & Sovereign Crown)",
    requirementSummary:
      "Lv. 4 Fortress on tile + Signal Beacon or Regional Event contribution + 140W / 120S / 110F",
  },
};

export interface StructureMeta {
  type: Exclude<StructureType, StructureType.None>;
  category: "production" | "strategic";
  name: string;
  shortPurpose: string;
  gameplayFunction: string;
  description: string;
  unlockEffect: string;
  productionLabel: string;
  terrainRuleLabel: string;
  prerequisiteLabel: string;
  defaultCostWif: bigint;
  resourceCost: ResourceCost;
  baseProduction: ResourceCost;
  favoredTerrain?: TerrainType[];
  favoredProduction?: ResourceCost;
  immediateBonus?: ResourceCost;
  capacityBonus: number;
  storageBonus: number;
  activityPoints: number;
}

export const STRUCTURE_META: Record<
  Exclude<StructureType, StructureType.None>,
  StructureMeta
> = {
  [StructureType.LumberCamp]: {
    type: StructureType.LumberCamp,
    category: "production",
    name: "Lumber Camp",
    shortPurpose: "Produces Wood (+45/hr on Forest)",
    gameplayFunction: "Produces Wood",
    description:
      "Timber sawmill and logging camp that continuously harvests construction Wood over time. Yields +45 Wood/hr in ancient Forests (+30/hr on Plains or Hills).",
    unlockEffect: "+45 Wood/hr on Forest (+30/hr elsewhere) + 25 instant Wood felled",
    productionLabel: "+45 Wood/hr (Forest) • +30 Wood/hr (Plains/Hills)",
    terrainRuleLabel: "Forest (Best), Plains, or Hills",
    prerequisiteLabel: "Any eligible claimed tile you own",
    defaultCostWif: parseUnits("10", WIF_DECIMALS),
    resourceCost: { wood: 0, stone: 0, food: 15 },
    baseProduction: { wood: 30, stone: 0, food: 0 },
    favoredTerrain: [TerrainType.Forest],
    favoredProduction: { wood: 45, stone: 0, food: 0 },
    immediateBonus: { wood: 25, stone: 0, food: 0 },
    capacityBonus: 0,
    storageBonus: 0,
    activityPoints: 130,
  },
  [StructureType.Quarry]: {
    type: StructureType.Quarry,
    category: "production",
    name: "Quarry",
    shortPurpose: "Produces Stone (+40/hr on Crags & Hills)",
    gameplayFunction: "Produces Stone",
    description:
      "Deep stone excavation pit and crane rigging that extracts cut Stone blocks for advanced structures and high-level Settlement upgrades.",
    unlockEffect: "+40 Stone/hr on Rocky Crags & Hills (+25/hr on Plains) + 20 instant Stone",
    productionLabel: "+40 Stone/hr (Rocky/Hills) • +25 Stone/hr (Plains)",
    terrainRuleLabel: "Rocky Crags (Best), Hills (Best), or Plains",
    prerequisiteLabel: "Any eligible claimed tile you own",
    defaultCostWif: parseUnits("12.5", WIF_DECIMALS),
    resourceCost: { wood: 20, stone: 0, food: 0 },
    baseProduction: { wood: 0, stone: 25, food: 0 },
    favoredTerrain: [TerrainType.Rocky, TerrainType.Hills],
    favoredProduction: { wood: 0, stone: 40, food: 0 },
    immediateBonus: { wood: 0, stone: 20, food: 0 },
    capacityBonus: 0,
    storageBonus: 0,
    activityPoints: 140,
  },
  [StructureType.Farm]: {
    type: StructureType.Farm,
    category: "production",
    name: "Farm",
    shortPurpose: "Produces Food (+45/hr on Plains)",
    gameplayFunction: "Produces Food",
    description:
      "Irrigated golden wheat fields and windmill granary that generate Food over time to sustain Settlement growth and expansion.",
    unlockEffect: "+45 Food/hr on Plains (+30/hr on Forest/Hills) + 25 instant Food",
    productionLabel: "+45 Food/hr (Plains) • +30 Food/hr (Forest/Hills)",
    terrainRuleLabel: "Plains (Best), Forest, or Hills",
    prerequisiteLabel: "Any eligible claimed tile you own",
    defaultCostWif: parseUnits("10", WIF_DECIMALS),
    resourceCost: { wood: 15, stone: 0, food: 0 },
    baseProduction: { wood: 0, stone: 0, food: 30 },
    favoredTerrain: [TerrainType.Plains],
    favoredProduction: { wood: 0, stone: 0, food: 45 },
    immediateBonus: { wood: 0, stone: 0, food: 25 },
    capacityBonus: 0,
    storageBonus: 0,
    activityPoints: 130,
  },
  [StructureType.Workshop]: {
    type: StructureType.Workshop,
    category: "strategic",
    name: "Workshop",
    shortPurpose: "Uses materials for construction & +150 Storage",
    gameplayFunction: "Uses materials for construction",
    description:
      "Artisan timber-and-iron engineering forge that processes raw materials for advanced construction, expands storage (+150 cap), and unlocks Stronghold Lv. 3+.",
    unlockEffect: "Unlocks Lv. 3+ Stronghold upgrades • +150 Resource Cap • +15W/+15S per hr",
    productionLabel: "+15 Wood/hr • +15 Stone/hr • +150 Storage Cap",
    terrainRuleLabel: "Plains, Forest, or Hills (not sheer Rocky Crags)",
    prerequisiteLabel: "At least 1 Settlement Hall established in this region",
    defaultCostWif: parseUnits("18.75", WIF_DECIMALS),
    resourceCost: { wood: 35, stone: 25, food: 0 },
    baseProduction: { wood: 15, stone: 15, food: 0 },
    capacityBonus: 0,
    storageBonus: 150,
    activityPoints: 180,
  },
  [StructureType.Outpost]: {
    type: StructureType.Outpost,
    category: "strategic",
    name: "Outpost",
    shortPurpose: "Frontier foothold & +2 Territory Capacity",
    gameplayFunction: "Expands claimable territory cap (+2)",
    description:
      "Establishes a fortified frontier watchtower on any claimed tile you own — expanding your Territory Capacity by +2 tiles and scouting nearby resources.",
    unlockEffect: "+2 Territory Capacity • +5 Wood/hr & +5 Food/hr",
    productionLabel: "+2 Territory Cap • +5 Wood/hr • +5 Food/hr",
    terrainRuleLabel: "Plains, Forest, Hills, or Rocky Crags",
    prerequisiteLabel: "Any claimed tile you own (no Settlement Hall required)",
    defaultCostWif: parseUnits("12.5", WIF_DECIMALS),
    resourceCost: { wood: 20, stone: 0, food: 0 },
    baseProduction: { wood: 5, stone: 0, food: 5 },
    capacityBonus: 2,
    storageBonus: 0,
    activityPoints: 120,
  },
  [StructureType.Beacon]: {
    type: StructureType.Beacon,
    category: "strategic",
    name: "Signal Beacon",
    shortPurpose: "Regional relay & Lv. 5 Sovereign prerequisite",
    gameplayFunction: "Links settlement network to regional projects",
    description:
      "Raises a crimson signal relay linking your settlement network to shared Regional Projects and unlocking Level 5 Sovereign Capital upgrades.",
    unlockEffect: "Unlocks Lv. 5 Sovereign Capital • +10W/+10S/+10F per hr • +260 Standing",
    productionLabel: "+10 Wood/hr • +10 Stone/hr • +10 Food/hr",
    terrainRuleLabel: "Hills, Rocky Crags, or any tile with Keep Lv.2+",
    prerequisiteLabel: "At least 1 Keep/Stronghold (Lv. 2+) in your civilization",
    defaultCostWif: parseUnits("31.25", WIF_DECIMALS),
    resourceCost: { wood: 0, stone: 40, food: 20 },
    baseProduction: { wood: 10, stone: 10, food: 10 },
    capacityBonus: 0,
    storageBonus: 0,
    activityPoints: 260,
  },
};

export function getStructureProductionOnTerrain(
  structureType: Exclude<StructureType, StructureType.None>,
  terrain: TerrainType
): ResourceCost {
  const meta = STRUCTURE_META[structureType];
  if (
    meta.favoredTerrain &&
    meta.favoredProduction &&
    meta.favoredTerrain.includes(terrain)
  ) {
    return meta.favoredProduction;
  }
  return meta.baseProduction;
}

export const DEFAULT_COSTS = {
  claim: parseUnits("6.25", WIF_DECIMALS),
  settlementSlot1: parseUnits("25", WIF_DECIMALS),
  settlementSlot2: parseUnits("43.75", WIF_DECIMALS),
  settlementSlot3: parseUnits("62.5", WIF_DECIMALS),
  upgradeToLv2: parseUnits("31.25", WIF_DECIMALS),
  upgradeToLv3: parseUnits("50", WIF_DECIMALS),
  upgradeToLv4: parseUnits("75", WIF_DECIMALS),
  upgradeToLv5: parseUnits("100", WIF_DECIMALS),
  outpost: STRUCTURE_META[StructureType.Outpost].defaultCostWif,
  workshop: STRUCTURE_META[StructureType.Workshop].defaultCostWif,
  beacon: STRUCTURE_META[StructureType.Beacon].defaultCostWif,
  lumberCamp: STRUCTURE_META[StructureType.LumberCamp].defaultCostWif,
  quarry: STRUCTURE_META[StructureType.Quarry].defaultCostWif,
  farm: STRUCTURE_META[StructureType.Farm].defaultCostWif,
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
  settlementLevel: number; // 0 = none, 1..5 = Settlement Levels
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
  kind:
    | "claim"
    | "settlement"
    | "upgrade"
    | "structure"
    | "event"
    | "region_unlock"
    | "harvest";
  player: `0x${string}`;
  tileId?: number;
  newLevel?: number;
  structureType?: StructureType;
  eventId?: number;
  regionId?: number;
  resourcesAdded?: ResourceCost;
  wifAmount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp?: number;
  isSimulated?: boolean;
}

export interface PlayerStats {
  tilesClaimed: number;
  settlementsBuilt: number;
  totalSettlementUpgrades: number;
  structuresBuilt: number;
  outpostsBuilt: number;
  workshopsBuilt: number;
  beaconsBuilt: number;
  lumberCampsBuilt: number;
  quarriesBuilt: number;
  farmsBuilt: number;
  maxSettlementLevel: number;
  eventsContributedCount: number;
  totalEventWifContributed: bigint;
  wood: number;
  stone: number;
  food: number;
  woodPerHour: number;
  stonePerHour: number;
  foodPerHour: number;
  storageCap: number;
  lastResourceSync: number;
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

export function computeResourceStorageCap(params: {
  settlementsBuilt: number;
  totalSettlementUpgrades: number;
  workshopsBuilt: number;
}): number {
  return (
    300 +
    params.settlementsBuilt * 200 +
    params.totalSettlementUpgrades * 150 +
    params.workshopsBuilt * 150
  );
}

export function getNextSettlementCost(currentSettlementsCount: number): bigint {
  if (currentSettlementsCount === 0) return DEFAULT_COSTS.settlementSlot1;
  if (currentSettlementsCount === 1) return DEFAULT_COSTS.settlementSlot2;
  return DEFAULT_COSTS.settlementSlot3;
}

export function getNextSettlementResourceCost(
  currentSettlementsCount: number
): ResourceCost {
  if (currentSettlementsCount === 0) return { wood: 0, stone: 0, food: 0 };
  if (currentSettlementsCount === 1) return { wood: 40, stone: 25, food: 40 };
  return { wood: 70, stone: 50, food: 70 };
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

export const PROGRESSION_STAGES: Record<
  1 | 2 | 3 | 4 | 5,
  Omit<ProgressionStageInfo, "stage">
> = {
  1: {
    title: "Stage 1: Found First Settlement",
    shortGoal: "Claim land & raise a Settlement Hall (Lv. 1)",
    nextMilestoneHint:
      "Claim an eligible tile in The Heartlands (6.25 $WIF) to receive your starter material cache and found a Settlement Hall (25 $WIF).",
  },
  2: {
    title: "Stage 2: Resource Economy & Keep",
    shortGoal: "Build Lumber Camp / Quarry / Farm & upgrade to Lv. 2",
    nextMilestoneHint:
      "Construct production structures (Lumber Camp, Quarry, Farm) to generate Wood, Stone, and Food, then upgrade to Homestead Keep (Lv. 2).",
  },
  3: {
    title: "Stage 3: Expand Your Territory",
    shortGoal: "Build a Workshop & establish your 2nd Settlement",
    nextMilestoneHint:
      "With a Lv. 2 Keep, 2+ structures, and 3+ tiles, found a 2nd Settlement at distance ≥ 2 to tap new terrain resources.",
  },
  4: {
    title: "Stage 4: Regional Network",
    shortGoal: "Upgrade to Stronghold (Lv. 3) & Fortress (Lv. 4)",
    nextMilestoneHint:
      "Use a Workshop to unlock Stronghold Citadel (Lv. 3) & Grand Fortress (Lv. 4), raise a Signal Beacon, and back the World Event.",
  },
  5: {
    title: "Stage 5: Sovereign Capital",
    shortGoal: "Reach Level 5 Sovereign Capital & unlock The Wild Frontier",
    nextMilestoneHint:
      "Upgrade your seat to Sovereign Capital (Lv. 5) and help the community finish Build the Beacon to unlock Region 1.",
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
  if (stats.maxSettlementLevel < 4 && stats.eventsContributedCount < 1) return 4;
  return 5;
}

export function getBuilderTitle(score: number): string {
  if (score === 0) return "Uncharted Wanderer";
  if (score < 250) return "Frontier Pioneer";
  if (score < 650) return "Settlement Warden";
  if (score < 1300) return "Domain Architect";
  return "Sovereign of the Realm";
}

// ==========================================
// Missions & World Challenges (Phase 1.1)
// ==========================================

export interface MissionStatus {
  id: string;
  category: "personal" | "regional";
  title: string;
  description: string;
  rewardLabel: string;
  current: number;
  target: number;
  completed: boolean;
}

export function evaluateMissions(
  stats: PlayerStats,
  worldEvent: WorldEventState
): MissionStatus[] {
  const productionStructures =
    stats.lumberCampsBuilt + stats.quarriesBuilt + stats.farmsBuilt;

  return [
    {
      id: "first-settlement",
      category: "personal",
      title: "Establish Your First Settlement",
      description:
        "Claim an eligible Heartlands tile and found your first Settlement Hall (Lv. 1) on Robinhood Chain.",
      rewardLabel: "+3 Territory Cap • +20W/+10S/+20F per hr • Unlocks Production Buildings",
      current: Math.min(1, stats.settlementsBuilt),
      target: 1,
      completed: stats.settlementsBuilt >= 1,
    },
    {
      id: "first-farm-or-camp",
      category: "personal",
      title: "Establish Resource Production",
      description:
        "Construct your first Farm, Lumber Camp, or Quarry to begin generating in-game materials over time.",
      rewardLabel: "Title: Resource Pioneer • Unlocks Keep Upgrade Path",
      current: Math.min(1, productionStructures),
      target: 1,
      completed: productionStructures >= 1,
    },
    {
      id: "upgrade-level-2",
      category: "personal",
      title: "Upgrade a Settlement to Level 2",
      description:
        "Gather Wood, Stone, and Food and upgrade a Settlement Hall to a Homestead Keep (Lv. 2).",
      rewardLabel: "+2 Territory Cap • +150 Resource Storage • Unlocks Signal Beacon",
      current: Math.min(2, stats.maxSettlementLevel),
      target: 2,
      completed: stats.maxSettlementLevel >= 2,
    },
    {
      id: "wood-stockpile",
      category: "personal",
      title: "Stockpile 200 Timber Logs",
      description:
        "Accumulate at least 200 Wood in your settlement warehouse through Lumber Camps and harvests.",
      rewardLabel: "Ready for Advanced Workshop & Stronghold Construction",
      current: Math.min(200, Math.floor(stats.wood)),
      target: 200,
      completed: stats.wood >= 200,
    },
    {
      id: "three-structures",
      category: "personal",
      title: "Develop 3 Structures in One Region",
      description:
        "Construct 3 specialized or production buildings across your claimed tiles to diversify your economy.",
      rewardLabel: "+450 Builder Standing • Unlocks Lv. 4 Grand Fortress",
      current: Math.min(3, stats.structuresBuilt),
      target: 3,
      completed: stats.structuresBuilt >= 3,
    },
    {
      id: "second-settlement",
      category: "personal",
      title: "Establish a Second Settlement",
      description:
        "Expand your civilization by founding a 2nd Settlement at Manhattan distance ≥ 2.",
      rewardLabel: "+3 Territory Cap • +200 Storage • Multi-Settlement Network",
      current: Math.min(2, stats.settlementsBuilt),
      target: 2,
      completed: stats.settlementsBuilt >= 2,
    },
    {
      id: "regional-beacon",
      category: "regional",
      title: "Support The Great Bridge World Event",
      description:
        "Raise a Signal Beacon on high ground or contribute $WIF to 'The Great Bridge' regional project spanning the Northern Strait.",
      rewardLabel: "Unlocks Lv. 5 Sovereign Capital & Region 2: The Wild Frontier",
      current:
        stats.beaconsBuilt > 0 || stats.eventsContributedCount > 0 || worldEvent.completed
          ? 1
          : 0,
      target: 1,
      completed:
        stats.beaconsBuilt > 0 || stats.eventsContributedCount > 0 || worldEvent.completed,
    },
  ];
}

// ==========================================
// Regional Rankings & Multiplayer Builders
// ==========================================

export interface RegionalBuilderRanking {
  address: `0x${string}`;
  displayName: string;
  title: string;
  tilesClaimed: number;
  settlementsBuilt: number;
  maxSettlementLevel: number;
  structuresBuilt: number;
  totalProductionPerHour: number;
  woodPerHour: number;
  stonePerHour: number;
  foodPerHour: number;
  eventContributedWif: bigint;
  activityScore: number;
  isCurrentPlayer: boolean;
}
