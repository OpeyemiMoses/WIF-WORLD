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

        WIFWorlds.Tile[49] memory r0 = game.getRegionMap(0);
        assertEq(r0.length, 49);
        assertEq(r0[0].worldTileId, 0);
        assertEq(r0[0].regionId, 0);

        WIFWorlds.Tile[49] memory r1 = game.getRegionMap(1);
        assertEq(r1.length, 49);
        assertEq(r1[0].worldTileId, 49);
        assertEq(r1[0].regionId, 1);
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

        // Build workshop on tile 9 (or tile with settlement/structure slot)
        // Let's claim tile 17 for workshop
        game.claimTile(17);
        game.buildStructure(17, 2); // Workshop

        // Now Lv 3 Citadel upgrade succeeds
        game.upgradeSettlement(9);
        t = game.getTile(9);
        assertEq(t.settlementLevel, 3);
        assertEq(game.getPlayerState(alice).maxSettlementLevel, 3);
        vm.stopPrank();
    }

    function test_BeaconStructureElevationRule() public {
        vm.startPrank(alice);
        game.claimTile(9);  // Forest
        game.claimTile(11); // Hills
        game.claimTile(1);  // Rocky

        game.buildSettlement(9);
        game.buildStructure(11, 1); // Outpost
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

        // Alice contributes 1000 WIF
        vm.prank(alice);
        game.contributeToEvent(1, 1000 ether);

        (,,,,, , bool completed, ) = game.getEvent(1);
        assertFalse(completed);
        assertFalse(game.isRegionUnlocked(1));

        // Bob contributes remaining 250 WIF to hit 1250 target
        vm.prank(bob);
        game.contributeToEvent(1, 250 ether);

        (,,,,, , completed, ) = game.getEvent(1);
        assertTrue(completed);
        assertTrue(game.isRegionUnlocked(1));

        // Now players can claim tiles in Region 1 (worldTileId 49..97)!
        // Tile 49 is Rocky in Region 1
        vm.prank(alice);
        game.claimTile(49);
        assertEq(game.getTile(49).owner, alice);
        assertEq(game.getTile(49).regionId, 1);
    }
}

