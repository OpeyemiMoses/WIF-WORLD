export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const WIF_WORLDS_ABI = [
  {
    type: "function",
    name: "wifToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "claimCost",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isRegionUnlocked",
    stateMutability: "view",
    inputs: [{ name: "regionId", type: "uint8" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getRegionMap",
    stateMutability: "view",
    inputs: [{ name: "regionId", type: "uint8" }],
    outputs: [
      {
        name: "",
        type: "tuple[49]",
        components: [
          { name: "worldTileId", type: "uint16" },
          { name: "regionId", type: "uint8" },
          { name: "terrain", type: "uint8" },
          { name: "owner", type: "address" },
          { name: "settlementLevel", type: "uint8" },
          { name: "structureType", type: "uint8" },
          { name: "claimedAt", type: "uint32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getTile",
    stateMutability: "view",
    inputs: [{ name: "worldTileId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "worldTileId", type: "uint16" },
          { name: "regionId", type: "uint8" },
          { name: "terrain", type: "uint8" },
          { name: "owner", type: "address" },
          { name: "settlementLevel", type: "uint8" },
          { name: "structureType", type: "uint8" },
          { name: "claimedAt", type: "uint32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getPlayerState",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "tilesClaimed", type: "uint16" },
          { name: "settlementsBuilt", type: "uint16" },
          { name: "totalSettlementUpgrades", type: "uint16" },
          { name: "structuresBuilt", type: "uint16" },
          { name: "outpostsBuilt", type: "uint16" },
          { name: "workshopsBuilt", type: "uint16" },
          { name: "beaconsBuilt", type: "uint16" },
          { name: "eventsContributed", type: "uint16" },
          { name: "maxSettlementLevel", type: "uint8" },
          { name: "totalEventWifContributed", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getMaxClaimableTiles",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getSettlementCostForPlayer",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "structureCost",
    stateMutability: "view",
    inputs: [{ name: "structureType", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "activeEventId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEvent",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [
      { name: "title", type: "string" },
      { name: "targetWorldTileId", type: "uint16" },
      { name: "unlocksRegionId", type: "uint8" },
      { name: "targetAmount", type: "uint256" },
      { name: "totalContributed", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "completed", type: "bool" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "claimTile",
    stateMutability: "nonpayable",
    inputs: [{ name: "worldTileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buildSettlement",
    stateMutability: "nonpayable",
    inputs: [{ name: "worldTileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "upgradeSettlement",
    stateMutability: "nonpayable",
    inputs: [{ name: "worldTileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buildStructure",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worldTileId", type: "uint256" },
      { name: "structureType", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "contributeToEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const TILE_CLAIMED_EVENT = {
  type: "event",
  name: "TileClaimed",
  inputs: [
    { name: "worldTileId", type: "uint256", indexed: true },
    { name: "player", type: "address", indexed: true },
    { name: "regionId", type: "uint8", indexed: false },
    { name: "cost", type: "uint256", indexed: false },
  ],
} as const;

export const SETTLEMENT_BUILT_EVENT = {
  type: "event",
  name: "SettlementBuilt",
  inputs: [
    { name: "worldTileId", type: "uint256", indexed: true },
    { name: "player", type: "address", indexed: true },
    { name: "settlementNumber", type: "uint8", indexed: false },
    { name: "cost", type: "uint256", indexed: false },
  ],
} as const;

export const SETTLEMENT_UPGRADED_EVENT = {
  type: "event",
  name: "SettlementUpgraded",
  inputs: [
    { name: "worldTileId", type: "uint256", indexed: true },
    { name: "player", type: "address", indexed: true },
    { name: "newLevel", type: "uint8", indexed: false },
    { name: "cost", type: "uint256", indexed: false },
  ],
} as const;

export const STRUCTURE_BUILT_EVENT = {
  type: "event",
  name: "StructureBuilt",
  inputs: [
    { name: "worldTileId", type: "uint256", indexed: true },
    { name: "player", type: "address", indexed: true },
    { name: "structureType", type: "uint8", indexed: false },
    { name: "cost", type: "uint256", indexed: false },
  ],
} as const;

export const EVENT_CONTRIBUTION_EVENT = {
  type: "event",
  name: "EventContribution",
  inputs: [
    { name: "eventId", type: "uint256", indexed: true },
    { name: "player", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

export const REGION_UNLOCKED_EVENT = {
  type: "event",
  name: "RegionUnlocked",
  inputs: [
    { name: "regionId", type: "uint8", indexed: true },
    { name: "triggeredByEventId", type: "uint256", indexed: true },
  ],
} as const;
