// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WIFWorlds.sol";
import "./MockWIF.sol";

contract WIFWorldsTest is Test {
    WIFWorlds public game;
    MockWIF public wif;

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public alice = address(0x3);
    address public bob = address(0x4);

    function setUp() public {
        vm.warp(1_700_000_000);
        vm.startPrank(owner);
        wif = new MockWIF();
        game = new WIFWorlds(address(wif), treasury);

        // Fund players with WIF
        wif.mint(alice, 10_000 ether);
        wif.mint(bob, 10_000 ether);
        vm.stopPrank();

        // Approve game contract
        vm.prank(alice);
        wif.approve(address(game), type(uint256).max);

        vm.prank(bob);
        wif.approve(address(game), type(uint256).max);
    }

    function test_Initialization() public view {
        assertTrue(game.isRegionUnlocked(0));
        assertFalse(game.isRegionUnlocked(1));
        assertFalse(game.isRegionUnlocked(2));
        assertFalse(game.isRegionUnlocked(3));

        WIFWorlds.Tile[49] memory r0 = game.getRegionMap(0);
        assertEq(r0.length, 49);
        assertEq(r0[0].worldTileId, 0);
        assertEq(r0[0].regionId, 0);

        WIFWorlds.Tile[49] memory r1 = game.getRegionMap(1);
        assertEq(r1.length, 49);
        assertEq(r1[0].worldTileId, 49);
        assertEq(r1[0].regionId, 1);

        WIFWorlds.Tile[49] memory r2 = game.getRegionMap(2);
        assertEq(r2.length, 49);
        assertEq(r2[0].worldTileId, 98);
        assertEq(r2[0].regionId, 2);

        WIFWorlds.Tile[49] memory r3 = game.getRegionMap(3);
        assertEq(r3.length, 49);
        assertEq(r3[0].worldTileId, 147);
        assertEq(r3[0].regionId, 3);

        // Verify all 5 World Events are configured onchain at Genesis
        (string memory e1Title, , uint8 e1Unlock, uint256 e1Target, , , , bool e1Active) = game.getEvent(1);
        assertEq(e1Title, "The Great Bridge");
        assertEq(e1Unlock, 1);
        assertEq(e1Target, 1250 ether);
        assertTrue(e1Active);

        (string memory e3Title, , uint8 e3Unlock, uint256 e3Target, , , , bool e3Active) = game.getEvent(3);
        assertEq(e3Title, "The Frontier");
        assertEq(e3Unlock, 2);
        assertEq(e3Target, 1000 ether);
        assertTrue(e3Active);

        (string memory e5Title, , uint8 e5Unlock, uint256 e5Target, , , , bool e5Active) = game.getEvent(5);
        assertEq(e5Title, "The Northern Passage");
        assertEq(e5Unlock, 3);
        assertEq(e5Target, 1500 ether);
        assertTrue(e5Active);
    }

    function test_ClaimTile_Success() public {
        // Tile 9 is Forest in Region 0
        uint16 tileId = 9;
        uint256 startTreasuryBal = wif.balanceOf(treasury);

        vm.prank(alice);
        game.claimTile(tileId);

        WIFWorlds.Tile memory t = game.getTile(tileId);
        assertEq(t.owner, alice);
        assertEq(wif.balanceOf(treasury) - startTreasuryBal, 6.25 ether);

        WIFWorlds.PlayerState memory ps = game.getPlayerState(alice);
        assertEq(ps.tilesClaimed, 1);
        assertEq(ps.wood, 160);
        assertEq(ps.stone, 120);
        assertEq(ps.food, 140);
    }

    function test_ClaimTile_RevertWhenWaterOrLandmark() public {
        // Tile 0 is Water
        vm.prank(alice);
        vm.expectRevert("Water cannot be claimed");
        game.claimTile(0);

        // Tile 3 is Northern Beacon Landmark
        vm.prank(alice);
        vm.expectRevert("Landmarks cannot be claimed");
        game.claimTile(3);
    }

    function test_TerritoryCapacityEnforcement() public {
        // Initial capacity is 3 tiles
        assertEq(game.getMaxClaimableTiles(alice), 3);

        vm.startPrank(alice);
        game.claimTile(9);  // Forest
        game.claimTile(10); // Plains
        game.claimTile(11); // Hills

        // 4th claim should fail
        vm.expectRevert("Territory capacity full");
        game.claimTile(12);
        vm.stopPrank();
    }

    function test_SettlementAndOutpostExpandsCapacity() public {
        vm.startPrank(alice);
        game.claimTile(9);  // Forest
        game.claimTile(10); // Plains
        game.claimTile(11); // Hills

        // Build 1st settlement on tile 9 (+3 capacity)
        game.buildSettlement(9);
        assertEq(game.getMaxClaimableTiles(alice), 6);

        // Build outpost on tile 10 (+2 capacity)
        game.buildStructure(10, 1); // 1 = Outpost
        assertEq(game.getMaxClaimableTiles(alice), 8);

        // Now can claim tile 12 and 13
        game.claimTile(12);
        game.claimTile(13);
        assertEq(game.getPlayerState(alice).tilesClaimed, 5);
        vm.stopPrank();
    }

    function test_SettlementSpacingRule() public {
        vm.startPrank(alice);
        game.claimTile(9);  // row 1, col 2
        game.claimTile(10); // row 1, col 3 (adjacent! distance = 1)
        game.claimTile(16); // row 2, col 2 (adjacent! distance = 1)

        // Founding 1st settlement on tile 9 expands capacity from 3 to 6
        game.buildSettlement(9);

        // Now claim tile 25 (row 3, col 4: distance from 9 is |3-1| + |4-2| = 2 + 2 = 4 >= 2)
        game.claimTile(25);

        // Upgrade tile 9 to Lv 2 Stronghold + build 2 structures to meet 2nd settlement prereqs
        game.buildStructure(10, 1); // Outpost
        game.buildStructure(16, 2); // Workshop
        game.upgradeSettlement(9);  // Lv 2 Stronghold

        // Try adjacent settlement on tile 10 -> should fail spacing
        vm.expectRevert("Too close to existing settlement");
        game.buildSettlement(10);

        // Founding on tile 25 (far enough) succeeds!
        game.buildSettlement(25);
        assertEq(game.getPlayerState(alice).settlementsBuilt, 2);
        vm.stopPrank();
    }

    function test_SettlementUpgradesProgression() public {
        vm.startPrank(alice);
        game.claimTile(9);
        game.claimTile(16);

        game.buildSettlement(9);
        game.buildStructure(16, 1); // Outpost

        // Upgrade Lv 1 -> Lv 2 Stronghold
        game.upgradeSettlement(9);
        WIFWorlds.Tile memory t = game.getTile(9);
        assertEq(t.settlementLevel, 2);

        // Upgrade Lv 2 -> Lv 3 requires at least 1 Workshop
        vm.expectRevert("Requires at least 1 Workshop");
        game.upgradeSettlement(9);

        // Claim tile 17 for workshop
        game.claimTile(17);
        game.buildStructure(17, 2); // Workshop

        // Now Lv 3 Citadel upgrade succeeds
        game.upgradeSettlement(9);
        t = game.getTile(9);
        assertEq(t.settlementLevel, 3);
        assertEq(game.getPlayerState(alice).maxSettlementLevel, 3);
        vm.stopPrank();
    }

    function test_ResourceProductionAndFiveSettlementLevels() public {
        vm.startPrank(alice);
        // Claim Forest (8), Plains (9), Hills (10)
        game.claimTile(8);  // Forest
        game.claimTile(9);  // Plains
        game.claimTile(10); // Hills

        // Build 1st Settlement on tile 9
        game.buildSettlement(9);

        // Build Lumber Camp (4) on Forest tile 8 (+45 Wood/hr)
        game.buildStructure(8, 4);
        // Build Quarry (5) on Hills tile 10 (+40 Stone/hr)
        game.buildStructure(10, 5);

        // Claim Plains tile 15 & build Farm (6) (+45 Food/hr)
        game.claimTile(15);
        game.buildStructure(15, 6);

        // Claim Plains tile 17 & build Workshop (2)
        game.claimTile(17);
        game.buildStructure(17, 2);

        // Advance time by 5 hours so production buildings fill storage
        vm.warp(block.timestamp + 5 hours);
        game.harvestResources();

        WIFWorlds.PlayerState memory ps = game.getPlayerState(alice);
        assertEq(ps.lumberCampsBuilt, 1);
        assertEq(ps.quarriesBuilt, 1);
        assertEq(ps.farmsBuilt, 1);
        assertTrue(ps.wood >= 300);
        assertTrue(ps.stone >= 250);
        assertTrue(ps.food >= 300);

        // Upgrade Settlement 9: Lv 1 -> Lv 2 -> Lv 3 -> Lv 4
        game.upgradeSettlement(9); // Lv 2
        game.upgradeSettlement(9); // Lv 3
        game.upgradeSettlement(9); // Lv 4
        assertEq(game.getTile(9).settlementLevel, 4);

        // Contribute to Regional Event to unlock Lv 5 Sovereign Capital
        game.contributeToEvent(1, 50 ether);
        vm.warp(block.timestamp + 3 hours);
        game.upgradeSettlement(9); // Lv 5!
        assertEq(game.getTile(9).settlementLevel, 5);
        assertEq(game.getPlayerState(alice).maxSettlementLevel, 5);
        vm.stopPrank();
    }

    function test_BeaconStructureElevationRule() public {
        vm.startPrank(alice);
        game.claimTile(9);  // Plains
        game.claimTile(10); // Hills
        game.claimTile(1);  // Rocky

        game.buildSettlement(9);
        game.buildStructure(10, 1); // Outpost
        game.upgradeSettlement(9);  // Lv 2 Stronghold

        // Capacity is now 3 + 3 + 2 + 2 = 10. Claim tile 8 (Forest, no stronghold)
        game.claimTile(8); // Forest, settlementLevel = 0

        // Try beacon on Forest tile 8 (not Hills or Rocky, and no Stronghold on tile 8)
        vm.expectRevert("Requires Hills, Rocky, or Stronghold Lv.2+");
        game.buildStructure(8, 3); // 3 = Beacon

        // Beacon on tile 1 (Rocky) succeeds!
        game.buildStructure(1, 3);
        assertEq(game.getTile(1).structureType, 3);
        vm.stopPrank();
    }

    function test_WorldEventCompletionUnlocksRegion1() public {
        assertFalse(game.isRegionUnlocked(1));
        assertEq(game.activeEventId(), 1);

        // Verify pioneer tile 31 is preserved at genesis and contributed 6.25 WIF to Event 1
        WIFWorlds.Tile memory pioneerTile = game.getTile(31);
        assertEq(pioneerTile.owner, 0x78b7b043921EE70806c66905E31fc2D9E75455a6);

        // Claiming a tile also automatically increments the active event progress!
        vm.prank(alice);
        game.claimTile(9); // +6.25 WIF -> Event 1 now has 12.50 WIF

        (,,,, uint256 contribAfterClaim, , bool completed, ) = game.getEvent(1);
        assertEq(contribAfterClaim, 12.5 ether);
        assertFalse(completed);

        // Alice contributes 1000 WIF
        vm.prank(alice);
        game.contributeToEvent(1, 1000 ether);

        (,,,,, , completed, ) = game.getEvent(1);
        assertFalse(completed);
        assertFalse(game.isRegionUnlocked(1));

        // Bob contributes remaining 237.5 WIF to hit 1250 target
        vm.prank(bob);
        game.contributeToEvent(1, 237.5 ether);

        (,,,,, , completed, ) = game.getEvent(1);
        assertTrue(completed);
        assertTrue(game.isRegionUnlocked(1));

        // Verify activeEventId automatically advances to Event 2 ("The Great Harvest")!
        assertEq(game.activeEventId(), 2);

        // Now players can claim tiles in Region 1 (worldTileId 49..97) and progress goes to Event 2!
        // Tile 49 is Rocky in Region 1
        vm.prank(alice);
        game.claimTile(49);
        assertEq(game.getTile(49).owner, alice);
        assertEq(game.getTile(49).regionId, 1);

        (,,,, uint256 event2Contrib, , , ) = game.getEvent(2);
        assertEq(event2Contrib, 6.25 ether);
    }

    function test_AdminAuthorizationAndEventManagement() public {
        assertEq(game.admin(), treasury);

        // Ordinary player (alice) cannot configure events or unlock regions
        vm.startPrank(alice);
        vm.expectRevert("Unauthorized: admin only");
        game.configureEvent(2, "The Great Harvest", 24, 255, 800 ether, 0, true, true);

        vm.expectRevert("Unauthorized: admin only");
        game.setRegionUnlocked(1, true);
        vm.stopPrank();

        // Treasury admin wallet CAN configure events
        vm.prank(treasury);
        game.configureEvent(2, "The Great Harvest", 24, 255, 800 ether, 0, true, true);

        assertEq(game.activeEventId(), 2);
        (string memory title, , , uint256 targetAmount, , , , bool active) = game.getEvent(2);
        assertEq(title, "The Great Harvest");
        assertEq(targetAmount, 800 ether);
        assertTrue(active);
    }
}
