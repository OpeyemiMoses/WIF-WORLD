// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WIFWorlds.sol";

contract DeployScript is Script {
    function run() external returns (WIFWorlds game) {
        address wifToken = vm.envOr("WIF_TOKEN_ADDRESS", address(0x5173b8eA6923c2d40267890D45C46a3480954773));
        address treasury = vm.envOr("TREASURY_ADDRESS", address(0x479253b82Eb63eb36F140EcABf0237cc338084e7));

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        if (treasury == address(0)) {
            treasury = deployer;
        }

        console.log("Deploying WIFWorlds to Robinhood Chain...");
        console.log("Deployer:", deployer);
        console.log("WIF Token:", wifToken);
        console.log("Treasury Address:", treasury);

        vm.startBroadcast(deployerPrivateKey);
        game = new WIFWorlds(wifToken, treasury);
        vm.stopBroadcast();

        console.log("WIFWorlds deployed successfully at:", address(game));
    }
}

