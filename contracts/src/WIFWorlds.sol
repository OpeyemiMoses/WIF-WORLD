// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WIFWorlds
 * @notice Persistent multiplayer onchain strategy civilization game on Robinhood Chain powered by $WIF.
 */
contract WIFWorlds is Ownable {
    using SafeERC20 for IERC20;

    uint8 public constant GRID_SIZE = 7;
    uint8 public constant TILES_PER_REGION = 49;
    uint8 public constant MAX_SETTLEMENTS_PER_REGION = 3;
    uint8 public constant MIN_SETTLEMENT_MANHATTAN_DISTANCE = 2;

    enum TerrainType {
        Plains,   // 0
        Forest,   // 1
        Hills,    // 2
        Water,    // 3
        Rocky,    // 4
        Landmark  // 5
    }

    enum StructureType {
        None,     // 0
        Outpost,  // 1
        Workshop, // 2
        Beacon    // 3
    }

    struct Tile {
        uint16 worldTileId;
        uint8 regionId;
        uint8 terrain;
        address owner;
        uint8 settlementLevel; // 0 = None, 1 = Hall, 2 = Stronghold, 3 = Citadel
        uint8 structureType;   // 0 = None, 1 = Outpost, 2 = Workshop, 3 = Beacon
        uint32 claimedAt;
    }

    struct PlayerState {
        uint16 tilesClaimed;
        uint16 settlementsBuilt;
        uint16 totalSettlementUpgrades;
        uint16 structuresBuilt;
        uint16 outpostsBuilt;
        uint16 workshopsBuilt;
        uint16 beaconsBuilt;
        uint16 eventsContributed;
        uint8 maxSettlementLevel;
        uint256 totalEventWifContributed;
    }

    struct WorldEvent {
        string title;
        uint16 targetWorldTileId;
        uint8 unlocksRegionId; // 255 if none
        uint256 targetAmount;
        uint256 totalContributed;
        uint64 deadline;
        bool completed;
        bool active;
    }

    IERC20 public immutable wifToken;
    address public treasury;

    // 8x tuned costs
    uint256 public claimCost = 6.25 ether;
    uint256 public settlementSlot1Cost = 25 ether;
    uint256 public settlementSlot2Cost = 43.75 ether;
    uint256 public settlementSlot3Cost = 62.5 ether;
    uint256 public upgradeToLv2Cost = 31.25 ether;
    uint256 public upgradeToLv3Cost = 50 ether;
    uint256 public outpostCost = 12.5 ether;
    uint256 public workshopCost = 18.75 ether;
    uint256 public beaconCost = 31.25 ether;

    mapping(uint8 => bool) public isRegionUnlocked;
    mapping(uint16 => Tile) public tiles;
    mapping(address => PlayerState) public playerStates;

    uint256 public activeEventId = 1;
    mapping(uint256 => WorldEvent) public events;

    // Events
    event TileClaimed(uint256 indexed worldTileId, address indexed player, uint8 regionId, uint256 cost);
    event SettlementBuilt(uint256 indexed worldTileId, address indexed player, uint8 settlementNumber, uint256 cost);
    event SettlementUpgraded(uint256 indexed worldTileId, address indexed player, uint8 newLevel, uint256 cost);
    event StructureBuilt(uint256 indexed worldTileId, address indexed player, uint8 structureType, uint256 cost);
    event EventContribution(uint256 indexed eventId, address indexed player, uint256 amount);
    event EventCompleted(uint256 indexed eventId, uint256 totalContributed);
    event RegionUnlocked(uint8 indexed regionId, uint256 indexed triggeredByEventId);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event CostsUpdated(uint256 newClaimCost, uint256 newSettlement1Cost);

    constructor(address _wifToken, address _treasury) Ownable(msg.sender) {
        require(_wifToken != address(0), "Invalid token address");
        wifToken = IERC20(_wifToken);
        treasury = _treasury == address(0) ? msg.sender : _treasury;

        // Initialize Region 0 (The Heartlands)
        isRegionUnlocked[0] = true;
        _initRegion0();

        // Initialize Region 1 (The Wild Frontier - locked until Beacon milestone)
        isRegionUnlocked[1] = false;
        _initRegion1();

        // Initialize Event #1: Build the Beacon (unlocks Region 1 upon 100% completion)
        events[1] = WorldEvent({
            title: "Build the Beacon",
            targetWorldTileId: 3, // (3, 0) Northern Spire in Region 0
            unlocksRegionId: 1,    // Automatically unlocks Region 1
            targetAmount: 1250 ether, // 8x tuned
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
    }

    // ==========================================
    // Core Game Actions
    // ==========================================

    /**
     * @notice Claim a neutral tile in an unlocked region.
     */
    function claimTile(uint256 worldTileId) external {
        require(worldTileId < 98, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.terrain != uint8(TerrainType.Water), "Water cannot be claimed");
        require(t.terrain != uint8(TerrainType.Landmark), "Landmarks cannot be claimed");
        require(t.owner == address(0), "Tile already claimed");

        PlayerState storage ps = playerStates[msg.sender];
        require(ps.tilesClaimed < getMaxClaimableTiles(msg.sender), "Territory capacity full");

        // Payment
        _chargeWif(msg.sender, claimCost);

        // State update
        t.owner = msg.sender;
        t.claimedAt = uint32(block.timestamp);
        ps.tilesClaimed += 1;

        emit TileClaimed(worldTileId, msg.sender, t.regionId, claimCost);
    }

    /**
     * @notice Found a new Settlement Hall (Lv. 1) on an owned tile.
     */
    function buildSettlement(uint256 worldTileId) external {
        require(worldTileId < 98, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.settlementLevel == 0, "Settlement already built");

        PlayerState storage ps = playerStates[msg.sender];
        uint8 currentSettlements = uint8(ps.settlementsBuilt);

        // Enforce spacing & region limit
        _validateSettlementPlacement(msg.sender, uint16(worldTileId), t.regionId);

        // Enforce progression prerequisites
        uint256 cost = getSettlementCostForPlayer(msg.sender);
        if (currentSettlements == 1) {
            require(
                ps.maxSettlementLevel >= 2 && ps.structuresBuilt >= 2 && ps.tilesClaimed >= 3,
                "Requires Lv.2 Stronghold, 2+ structures, 3+ tiles"
            );
        } else if (currentSettlements >= 2) {
            require(
                ps.maxSettlementLevel >= 3 && ps.structuresBuilt >= 4 && ps.eventsContributed >= 1,
                "Requires Lv.3 Citadel, 4+ structures, 1+ event contribution"
            );
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.settlementLevel = 1;
        ps.settlementsBuilt += 1;
        if (ps.maxSettlementLevel == 0) {
            ps.maxSettlementLevel = 1;
        }

        emit SettlementBuilt(worldTileId, msg.sender, currentSettlements + 1, cost);
    }

    /**
     * @notice Upgrade an existing Settlement Hall: Lv.1 -> Stronghold Lv.2, Lv.2 -> Citadel Lv.3.
     */
    function upgradeSettlement(uint256 worldTileId) external {
        require(worldTileId < 98, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.settlementLevel > 0, "No settlement on tile");
        require(t.settlementLevel < 3, "Max settlement tier reached");

        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;
        uint8 nextLevel = t.settlementLevel + 1;

        if (nextLevel == 2) {
            require(ps.tilesClaimed >= 2 && ps.structuresBuilt >= 1, "Requires 2+ tiles and 1+ structure");
            cost = upgradeToLv2Cost;
        } else {
            require(ps.workshopsBuilt >= 1, "Requires at least 1 Workshop");
            cost = upgradeToLv3Cost;
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.settlementLevel = nextLevel;
        ps.totalSettlementUpgrades += 1;
        if (nextLevel > ps.maxSettlementLevel) {
            ps.maxSettlementLevel = nextLevel;
        }

        emit SettlementUpgraded(worldTileId, msg.sender, nextLevel, cost);
    }

    /**
     * @notice Build a specialized structure (Outpost, Workshop, Beacon).
     */
    function buildStructure(uint256 worldTileId, uint8 structureType) external {
        require(worldTileId < 98, "Invalid tile ID");
        require(structureType >= 1 && structureType <= 3, "Invalid structure type");

        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.structureType == 0, "Structure already present");

        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;

        if (structureType == uint8(StructureType.Outpost)) {
            cost = outpostCost;
            ps.outpostsBuilt += 1;
        } else if (structureType == uint8(StructureType.Workshop)) {
            require(t.terrain != uint8(TerrainType.Rocky), "Rocky terrain unsuitable for Workshop");
            require(_hasSettlementInRegion(msg.sender, t.regionId), "Must have Settlement in region");
            cost = workshopCost;
            ps.workshopsBuilt += 1;
        } else if (structureType == uint8(StructureType.Beacon)) {
            bool validElevation = t.terrain == uint8(TerrainType.Hills) ||
                                  t.terrain == uint8(TerrainType.Rocky) ||
                                  t.settlementLevel >= 2;
            require(validElevation, "Requires Hills, Rocky, or Stronghold Lv.2+");
            require(ps.maxSettlementLevel >= 2, "Requires at least 1 Stronghold (Lv.2+)");
            cost = beaconCost;
            ps.beaconsBuilt += 1;
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.structureType = structureType;
        ps.structuresBuilt += 1;

        emit StructureBuilt(worldTileId, msg.sender, structureType, cost);
    }

    /**
     * @notice Contribute $WIF toward a shared world event.
     */
    function contributeToEvent(uint256 eventId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        WorldEvent storage ev = events[eventId];
        require(ev.active, "Event inactive");
        require(!ev.completed, "Event already completed");
        if (ev.deadline > 0) {
            require(block.timestamp <= ev.deadline, "Event deadline passed");
        }

        // Payment
        _chargeWif(msg.sender, amount);

        // State update
        ev.totalContributed += amount;
        PlayerState storage ps = playerStates[msg.sender];
        ps.eventsContributed += 1;
        ps.totalEventWifContributed += amount;

        emit EventContribution(eventId, msg.sender, amount);

        // Check completion trigger
        if (ev.totalContributed >= ev.targetAmount) {
            ev.completed = true;
            emit EventCompleted(eventId, ev.totalContributed);

            // Automatically unlock target region if configured
            if (ev.unlocksRegionId != 255 && !isRegionUnlocked[ev.unlocksRegionId]) {
                isRegionUnlocked[ev.unlocksRegionId] = true;
                emit RegionUnlocked(ev.unlocksRegionId, eventId);
            }
        }
    }

    // ==========================================
    // View Functions
    // ==========================================

    function getRegionMap(uint8 regionId) external view returns (Tile[49] memory out) {
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        for (uint16 i = 0; i < 49; i++) {
            out[i] = tiles[base + i];
        }
    }

    function getTile(uint256 worldTileId) external view returns (Tile memory) {
        require(worldTileId < 98, "Invalid tile ID");
        return tiles[uint16(worldTileId)];
    }

    function getPlayerState(address player) external view returns (PlayerState memory) {
        return playerStates[player];
    }

    function getMaxClaimableTiles(address player) public view returns (uint256) {
        PlayerState memory ps = playerStates[player];
        return 3 + (uint256(ps.settlementsBuilt) * 3) +
                   (uint256(ps.totalSettlementUpgrades) * 2) +
                   (uint256(ps.outpostsBuilt) * 2);
    }

    function getSettlementCostForPlayer(address player) public view returns (uint256) {
        uint16 count = playerStates[player].settlementsBuilt;
        if (count == 0) return settlementSlot1Cost;
        if (count == 1) return settlementSlot2Cost;
        return settlementSlot3Cost;
    }

    function structureCost(uint8 stType) external view returns (uint256) {
        if (stType == uint8(StructureType.Outpost)) return outpostCost;
        if (stType == uint8(StructureType.Workshop)) return workshopCost;
        if (stType == uint8(StructureType.Beacon)) return beaconCost;
        revert("Invalid structure type");
    }

    function getEvent(uint256 eventId) external view returns (
        string memory title,
        uint16 targetWorldTileId,
        uint8 unlocksRegionId,
        uint256 targetAmount,
        uint256 totalContributed,
        uint64 deadline,
        bool completed,
        bool active
    ) {
        WorldEvent memory ev = events[eventId];
        return (
            ev.title,
            ev.targetWorldTileId,
            ev.unlocksRegionId,
            ev.targetAmount,
            ev.totalContributed,
            ev.deadline,
            ev.completed,
            ev.active
        );
    }

    // ==========================================
    // Administration
    // ==========================================

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        address old = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    function setCosts(
        uint256 _claim,
        uint256 _settlement1,
        uint256 _settlement2,
        uint256 _settlement3,
        uint256 _up2,
        uint256 _up3,
        uint256 _outpost,
        uint256 _workshop,
        uint256 _beacon
    ) external onlyOwner {
        claimCost = _claim;
        settlementSlot1Cost = _settlement1;
        settlementSlot2Cost = _settlement2;
        settlementSlot3Cost = _settlement3;
        upgradeToLv2Cost = _up2;
        upgradeToLv3Cost = _up3;
        outpostCost = _outpost;
        workshopCost = _workshop;
        beaconCost = _beacon;
        emit CostsUpdated(_claim, _settlement1);
    }

    // ==========================================
    // Internal Helpers
    // ==========================================

    function _chargeWif(address from, uint256 amount) internal {
        wifToken.safeTransferFrom(from, treasury, amount);
    }

    function _validateSettlementPlacement(address player, uint16 newTileId, uint8 regionId) internal view {
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        uint8 settlementsInRegion = 0;

        uint8 newRow = uint8((newTileId % TILES_PER_REGION) / GRID_SIZE);
        uint8 newCol = uint8((newTileId % TILES_PER_REGION) % GRID_SIZE);

        for (uint16 i = 0; i < 49; i++) {
            Tile memory t = tiles[base + i];
            if (t.owner == player && t.settlementLevel > 0) {
                settlementsInRegion += 1;
                uint8 r = uint8(i / GRID_SIZE);
                uint8 c = uint8(i % GRID_SIZE);
                uint8 dist = (newRow > r ? newRow - r : r - newRow) + (newCol > c ? newCol - c : c - newCol);
                require(dist >= MIN_SETTLEMENT_MANHATTAN_DISTANCE, "Too close to existing settlement");
            }
        }
        require(settlementsInRegion < MAX_SETTLEMENTS_PER_REGION, "Max settlements in region reached");
    }

    function _hasSettlementInRegion(address player, uint8 regionId) internal view returns (bool) {
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        for (uint16 i = 0; i < 49; i++) {
            if (tiles[base + i].owner == player && tiles[base + i].settlementLevel > 0) {
                return true;
            }
        }
        return false;
    }

    function _initRegion0() internal {
        // Deterministic 49 tiles for The Heartlands
        uint8[49] memory terrains = [
            3, 4, 2, 5, 2, 4, 3,
            4, 1, 0, 2, 1, 0, 2,
            3, 0, 1, 0, 2, 1, 0,
            0, 2, 0, 5, 0, 2, 3,
            1, 0, 2, 1, 0, 1, 4,
            2, 1, 0, 0, 1, 2, 3,
            3, 0, 1, 4, 2, 0, 3
        ];
        for (uint16 i = 0; i < 49; i++) {
            tiles[i] = Tile({
                worldTileId: i,
                regionId: 0,
                terrain: terrains[i],
                owner: address(0),
                settlementLevel: 0,
                structureType: 0,
                claimedAt: 0
            });
        }
    }

    function _initRegion1() internal {
        // Deterministic 49 tiles for The Wild Frontier
        uint8[49] memory terrains = [
            4, 2, 1, 4, 1, 2, 3,
            2, 1, 2, 0, 2, 4, 2,
            1, 0, 4, 1, 0, 1, 3,
            3, 2, 1, 5, 2, 0, 4,
            4, 1, 0, 2, 1, 2, 1,
            2, 0, 1, 4, 0, 4, 2,
            3, 4, 2, 1, 2, 0, 3
        ];
        for (uint16 i = 0; i < 49; i++) {
            uint16 id = 49 + i;
            tiles[id] = Tile({
                worldTileId: id,
                regionId: 1,
                terrain: terrains[i],
                owner: address(0),
                settlementLevel: 0,
                structureType: 0,
                claimedAt: 0
            });
        }
    }
}

