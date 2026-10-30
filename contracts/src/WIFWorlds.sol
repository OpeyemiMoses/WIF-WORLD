// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WIFWorlds
 * @notice Persistent multiplayer onchain strategy civilization game on Robinhood Chain powered by $WIF.
 *         Phase 1.1: Includes in-game Resource Economy (Wood, Stone, Food), 6 Structure Types
 *         (Outpost, Workshop, Beacon, Lumber Camp, Quarry, Farm), and 5 Settlement Levels (Lv. 1 - 5).
 */
contract WIFWorlds is Ownable {
    using SafeERC20 for IERC20;

    uint8 public constant GRID_SIZE = 7;
    uint8 public constant TILES_PER_REGION = 49;
    uint8 public constant MAX_SETTLEMENTS_PER_REGION = 3;
    uint8 public constant MIN_SETTLEMENT_MANHATTAN_DISTANCE = 2;
    uint8 public constant MAX_SETTLEMENT_LEVEL = 5;

    enum TerrainType {
        Plains,   // 0
        Forest,   // 1
        Hills,    // 2
        Water,    // 3
        Rocky,    // 4
        Landmark  // 5
    }

    enum StructureType {
        None,       // 0
        Outpost,    // 1
        Workshop,   // 2
        Beacon,     // 3
        LumberCamp, // 4 - Produces Wood
        Quarry,     // 5 - Produces Stone
        Farm        // 6 - Produces Food
    }

    struct Tile {
        uint16 worldTileId;
        uint8 regionId;
        uint8 terrain;
        address owner;
        uint8 settlementLevel; // 0 = None, 1..5 = Settlement Levels
        uint8 structureType;   // 0 = None, 1..6 = StructureType
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
        uint16 lumberCampsBuilt;
        uint16 quarriesBuilt;
        uint16 farmsBuilt;
        uint16 eventsContributed;
        uint8 maxSettlementLevel;
        uint32 wood;
        uint32 stone;
        uint32 food;
        uint32 woodPerHour;
        uint32 stonePerHour;
        uint32 foodPerHour;
        uint32 lastResourceSync;
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

    // 8x tuned $WIF costs
    uint256 public claimCost = 6.25 ether;
    uint256 public settlementSlot1Cost = 25 ether;
    uint256 public settlementSlot2Cost = 43.75 ether;
    uint256 public settlementSlot3Cost = 62.5 ether;

    uint256 public upgradeToLv2Cost = 31.25 ether;
    uint256 public upgradeToLv3Cost = 50 ether;
    uint256 public upgradeToLv4Cost = 75 ether;
    uint256 public upgradeToLv5Cost = 100 ether;

    uint256 public outpostCost = 12.5 ether;
    uint256 public workshopCost = 18.75 ether;
    uint256 public beaconCost = 31.25 ether;
    uint256 public lumberCampCost = 10 ether;
    uint256 public quarryCost = 12.5 ether;
    uint256 public farmCost = 10 ether;

    mapping(uint8 => bool) public isRegionUnlocked;
    mapping(uint16 => Tile) public tiles;
    mapping(address => PlayerState) internal playerStates;

    uint256 public activeEventId = 1;
    mapping(uint256 => WorldEvent) public events;

    // Events
    event TileClaimed(uint256 indexed worldTileId, address indexed player, uint8 regionId, uint256 cost);
    event SettlementBuilt(uint256 indexed worldTileId, address indexed player, uint8 settlementNumber, uint256 cost);
    event SettlementUpgraded(uint256 indexed worldTileId, address indexed player, uint8 newLevel, uint256 cost);
    event StructureBuilt(uint256 indexed worldTileId, address indexed player, uint8 structureType, uint256 cost);
    event ResourcesHarvested(address indexed player, uint32 woodAdded, uint32 stoneAdded, uint32 foodAdded);
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
            targetAmount: 1250 ether,
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
     * @notice Harvest accrued Wood, Stone, and Food from production buildings & settlements.
     */
    function harvestResources() external {
        _syncResources(msg.sender);
    }

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

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        require(ps.tilesClaimed < getMaxClaimableTiles(msg.sender), "Territory capacity full");

        // Payment
        _chargeWif(msg.sender, claimCost);

        // Grant starter construction materials on first land claim so the player can begin building
        if (ps.tilesClaimed == 0) {
            ps.wood += 160;
            ps.stone += 120;
            ps.food += 140;
            ps.woodPerHour += 10;
            ps.stonePerHour += 5;
            ps.foodPerHour += 10;
        }

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

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint8 currentSettlements = uint8(ps.settlementsBuilt);

        // Enforce spacing & region limit
        _validateSettlementPlacement(msg.sender, uint16(worldTileId), t.regionId);

        // Enforce progression prerequisites & material costs for expansion settlements
        uint256 cost = getSettlementCostForPlayer(msg.sender);
        if (currentSettlements == 1) {
            require(
                ps.maxSettlementLevel >= 2 && ps.structuresBuilt >= 2 && ps.tilesClaimed >= 3,
                "Requires Lv.2 Stronghold, 2+ structures, 3+ tiles"
            );
            _spendResources(ps, 40, 25, 40);
        } else if (currentSettlements >= 2) {
            require(
                ps.maxSettlementLevel >= 3 && ps.structuresBuilt >= 4 && ps.eventsContributed >= 1,
                "Requires Lv.3 Citadel, 4+ structures, 1+ event contribution"
            );
            _spendResources(ps, 70, 50, 70);
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update + settlement supply cache & passive production
        t.settlementLevel = 1;
        ps.settlementsBuilt += 1;
        if (ps.maxSettlementLevel == 0) {
            ps.maxSettlementLevel = 1;
        }
        ps.wood += 40;
        ps.stone += 30;
        ps.food += 40;
        ps.woodPerHour += 20;
        ps.stonePerHour += 10;
        ps.foodPerHour += 20;
        _capResources(msg.sender);

        emit SettlementBuilt(worldTileId, msg.sender, currentSettlements + 1, cost);
    }

    /**
     * @notice Upgrade an existing Settlement Hall across 5 levels:
     *         Lv.1 -> Lv.2 (More building slots)
     *         Lv.2 -> Lv.3 (Advanced production)
     *         Lv.3 -> Lv.4 (Expansion settlement mastery)
     *         Lv.4 -> Lv.5 (Regional projects leadership)
     */
    function upgradeSettlement(uint256 worldTileId) external {
        require(worldTileId < 98, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.settlementLevel > 0, "No settlement on tile");
        require(t.settlementLevel < MAX_SETTLEMENT_LEVEL, "Max settlement tier reached");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;
        uint8 nextLevel = t.settlementLevel + 1;

        if (nextLevel == 2) {
            require(ps.tilesClaimed >= 2 && ps.structuresBuilt >= 1, "Requires 2+ tiles and 1+ structure");
            _spendResources(ps, 30, 20, 25);
            cost = upgradeToLv2Cost;
            ps.woodPerHour += 15;
            ps.stonePerHour += 10;
            ps.foodPerHour += 15;
        } else if (nextLevel == 3) {
            require(ps.workshopsBuilt >= 1, "Requires at least 1 Workshop");
            _spendResources(ps, 50, 45, 40);
            cost = upgradeToLv3Cost;
            ps.woodPerHour += 25;
            ps.stonePerHour += 20;
            ps.foodPerHour += 25;
        } else if (nextLevel == 4) {
            require(ps.structuresBuilt >= 3 && ps.tilesClaimed >= 4, "Requires 3+ structures and 4+ tiles");
            _spendResources(ps, 90, 80, 70);
            cost = upgradeToLv4Cost;
            ps.woodPerHour += 35;
            ps.stonePerHour += 30;
            ps.foodPerHour += 35;
        } else {
            require(
                ps.beaconsBuilt >= 1 || ps.eventsContributed >= 1,
                "Requires Signal Beacon or Regional Event contribution"
            );
            _spendResources(ps, 140, 120, 110);
            cost = upgradeToLv5Cost;
            ps.woodPerHour += 50;
            ps.stonePerHour += 45;
            ps.foodPerHour += 50;
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
     * @notice Build a specialized or production structure:
     *         1 = Outpost, 2 = Workshop, 3 = Beacon, 4 = LumberCamp, 5 = Quarry, 6 = Farm.
     */
    function buildStructure(uint256 worldTileId, uint8 structureType) external {
        require(worldTileId < 98, "Invalid tile ID");
        require(structureType >= 1 && structureType <= 6, "Invalid structure type");

        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.structureType == 0, "Structure already present");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;

        if (structureType == uint8(StructureType.Outpost)) {
            _spendResources(ps, 20, 0, 0);
            cost = outpostCost;
            ps.outpostsBuilt += 1;
            ps.woodPerHour += 5;
            ps.foodPerHour += 5;
        } else if (structureType == uint8(StructureType.Workshop)) {
            require(t.terrain != uint8(TerrainType.Rocky), "Rocky terrain unsuitable for Workshop");
            require(_hasSettlementInRegion(msg.sender, t.regionId), "Must have Settlement in region");
            _spendResources(ps, 35, 25, 0);
            cost = workshopCost;
            ps.workshopsBuilt += 1;
            ps.woodPerHour += 15;
            ps.stonePerHour += 15;
        } else if (structureType == uint8(StructureType.Beacon)) {
            bool validElevation = t.terrain == uint8(TerrainType.Hills) ||
                                  t.terrain == uint8(TerrainType.Rocky) ||
                                  t.settlementLevel >= 2;
            require(validElevation, "Requires Hills, Rocky, or Stronghold Lv.2+");
            require(ps.maxSettlementLevel >= 2, "Requires at least 1 Stronghold (Lv.2+)");
            _spendResources(ps, 0, 40, 20);
            cost = beaconCost;
            ps.beaconsBuilt += 1;
            ps.woodPerHour += 10;
            ps.stonePerHour += 10;
            ps.foodPerHour += 10;
        } else if (structureType == uint8(StructureType.LumberCamp)) {
            require(
                t.terrain == uint8(TerrainType.Forest) ||
                t.terrain == uint8(TerrainType.Plains) ||
                t.terrain == uint8(TerrainType.Hills),
                "Lumber Camp requires Forest, Plains, or Hills"
            );
            _spendResources(ps, 0, 0, 15);
            cost = lumberCampCost;
            ps.lumberCampsBuilt += 1;
            uint32 yield = t.terrain == uint8(TerrainType.Forest) ? 45 : 30;
            ps.woodPerHour += yield;
            ps.wood += 25; // Immediate timber felled bonus
        } else if (structureType == uint8(StructureType.Quarry)) {
            require(
                t.terrain == uint8(TerrainType.Rocky) ||
                t.terrain == uint8(TerrainType.Hills) ||
                t.terrain == uint8(TerrainType.Plains),
                "Quarry requires Rocky, Hills, or Plains"
            );
            _spendResources(ps, 20, 0, 0);
            cost = quarryCost;
            ps.quarriesBuilt += 1;
            uint32 yield = (t.terrain == uint8(TerrainType.Rocky) || t.terrain == uint8(TerrainType.Hills)) ? 40 : 25;
            ps.stonePerHour += yield;
            ps.stone += 20; // Immediate stone excavated bonus
        } else if (structureType == uint8(StructureType.Farm)) {
            require(
                t.terrain == uint8(TerrainType.Plains) ||
                t.terrain == uint8(TerrainType.Forest) ||
                t.terrain == uint8(TerrainType.Hills),
                "Farm requires Plains, Forest, or Hills"
            );
            _spendResources(ps, 15, 0, 0);
            cost = farmCost;
            ps.farmsBuilt += 1;
            uint32 yield = t.terrain == uint8(TerrainType.Plains) ? 45 : 30;
            ps.foodPerHour += yield;
            ps.food += 25; // Immediate harvest bonus
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.structureType = structureType;
        ps.structuresBuilt += 1;
        _capResources(msg.sender);

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

        _syncResources(msg.sender);

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
        PlayerState memory ps = playerStates[player];
        (uint32 w, uint32 s, uint32 f, ) = getPendingResources(player);
        ps.wood = w;
        ps.stone = s;
        ps.food = f;
        return ps;
    }

    function getResourceStorageCap(address player) public view returns (uint32) {
        PlayerState memory ps = playerStates[player];
        return uint32(
            300 +
            (uint32(ps.settlementsBuilt) * 200) +
            (uint32(ps.totalSettlementUpgrades) * 150) +
            (uint32(ps.workshopsBuilt) * 150)
        );
    }

    function getPendingResources(address player) public view returns (
        uint32 wood,
        uint32 stone,
        uint32 food,
        uint32 storageCap
    ) {
        PlayerState memory ps = playerStates[player];
        storageCap = getResourceStorageCap(player);
        wood = ps.wood;
        stone = ps.stone;
        food = ps.food;

        if (ps.lastResourceSync > 0 && block.timestamp > ps.lastResourceSync) {
            uint256 elapsed = block.timestamp - ps.lastResourceSync;
            uint32 addW = uint32((elapsed * uint256(ps.woodPerHour)) / 3600);
            uint32 addS = uint32((elapsed * uint256(ps.stonePerHour)) / 3600);
            uint32 addF = uint32((elapsed * uint256(ps.foodPerHour)) / 3600);

            wood = wood + addW > storageCap ? storageCap : wood + addW;
            stone = stone + addS > storageCap ? storageCap : stone + addS;
            food = food + addF > storageCap ? storageCap : food + addF;
        }
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
        if (stType == uint8(StructureType.LumberCamp)) return lumberCampCost;
        if (stType == uint8(StructureType.Quarry)) return quarryCost;
        if (stType == uint8(StructureType.Farm)) return farmCost;
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

    function _syncResources(address player) internal {
        PlayerState storage ps = playerStates[player];
        uint32 cap = getResourceStorageCap(player);
        if (ps.lastResourceSync > 0 && block.timestamp > ps.lastResourceSync) {
            uint256 elapsed = block.timestamp - ps.lastResourceSync;
            uint32 addW = uint32((elapsed * uint256(ps.woodPerHour)) / 3600);
            uint32 addS = uint32((elapsed * uint256(ps.stonePerHour)) / 3600);
            uint32 addF = uint32((elapsed * uint256(ps.foodPerHour)) / 3600);

            if (addW > 0 || addS > 0 || addF > 0) {
                ps.wood = ps.wood + addW > cap ? cap : ps.wood + addW;
                ps.stone = ps.stone + addS > cap ? cap : ps.stone + addS;
                ps.food = ps.food + addF > cap ? cap : ps.food + addF;
                emit ResourcesHarvested(player, addW, addS, addF);
            }
        }
        ps.lastResourceSync = uint32(block.timestamp);
    }

    function _capResources(address player) internal {
        PlayerState storage ps = playerStates[player];
        uint32 cap = getResourceStorageCap(player);
        if (ps.wood > cap) ps.wood = cap;
        if (ps.stone > cap) ps.stone = cap;
        if (ps.food > cap) ps.food = cap;
    }

    function _spendResources(
        PlayerState storage ps,
        uint32 woodReq,
        uint32 stoneReq,
        uint32 foodReq
    ) internal {
        require(ps.wood >= woodReq, "Insufficient Wood");
        require(ps.stone >= stoneReq, "Insufficient Stone");
        require(ps.food >= foodReq, "Insufficient Food");
        ps.wood -= woodReq;
        ps.stone -= stoneReq;
        ps.food -= foodReq;
    }

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
